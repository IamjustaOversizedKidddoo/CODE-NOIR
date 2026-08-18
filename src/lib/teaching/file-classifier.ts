import { ClassifiedFileInfo, UniversalFileRecord, UniversalFileRole } from './types';
import { RankedEntity } from './importance-ranker';

export function classifyFileRoles(
  file: { id: string; path: string; isBinary: boolean; isIgnored: boolean; lineCount: number },
  rankInfo: RankedEntity | undefined,
  incomingRefs: number,
  outgoingRefs: number,
  isEntryPoint: boolean
): { primaryRole: UniversalFileRole; roles: UniversalFileRole[]; isOrphaned: boolean } {
  const pathLower = file.path.toLowerCase();
  const filename = pathLower.split(/[\/\\]/).pop() || '';
  const ext = filename.split('.').pop() || '';

  const roles: UniversalFileRole[] = [];

  // 1. Entry point check
  if (isEntryPoint) {
    roles.push('ENTRY_POINT');
  }

  // 2. Security relevance
  if (
    pathLower.includes('auth') ||
    pathLower.includes('security') ||
    pathLower.includes('crypto') ||
    pathLower.includes('token') ||
    pathLower.includes('password') ||
    pathLower.includes('permission') ||
    pathLower.includes('session')
  ) {
    roles.push('SECURITY');
  }

  // 3. API / Routing relevance
  if (
    pathLower.includes('api/') ||
    pathLower.includes('route.') ||
    pathLower.includes('controller') ||
    pathLower.includes('router') ||
    pathLower.includes('endpoint')
  ) {
    roles.push('API');
  }

  // 4. Data / Persistence relevance
  if (
    pathLower.includes('db') ||
    pathLower.includes('database') ||
    pathLower.includes('schema') ||
    pathLower.includes('model') ||
    pathLower.includes('repository') ||
    pathLower.includes('prisma') ||
    pathLower.includes('sql')
  ) {
    roles.push('DATA');
  }

  // 5. Test files
  if (
    pathLower.includes('.test.') ||
    pathLower.includes('.spec.') ||
    pathLower.includes('tests/') ||
    pathLower.includes('__tests__')
  ) {
    roles.push('TEST');
  }

  // 6. Documentation
  if (
    filename === 'readme.md' ||
    filename === 'license' ||
    pathLower.includes('docs/') ||
    ext === 'md'
  ) {
    roles.push('DOCUMENTATION');
  }

  // 7. Configuration & Manifests
  if (
    [
      'package.json',
      'tsconfig.json',
      '.env',
      'dockerfile',
      'go.mod',
      'requirements.txt',
      'cargo.toml',
      '.gitignore',
    ].includes(filename) ||
    pathLower.includes('.config.') ||
    ['json', 'yml', 'yaml', 'toml', 'xml', 'lock'].includes(ext)
  ) {
    roles.push('CONFIGURATION');
  }

  // 8. Build systems
  if (
    filename.includes('webpack') ||
    filename.includes('vite') ||
    filename.includes('rollup') ||
    filename.includes('makefile')
  ) {
    roles.push('BUILD');
  }

  // 9. Assets
  if (['png', 'jpg', 'jpeg', 'svg', 'ico', 'css', 'scss', 'woff', 'ttf'].includes(ext)) {
    roles.push('ASSET');
  }

  // 10. Generated / Minified
  if (
    pathLower.includes('dist/') ||
    pathLower.includes('.next/') ||
    pathLower.includes('node_modules/') ||
    pathLower.includes('.gen.') ||
    file.isIgnored
  ) {
    roles.push('GENERATED');
  }

  // 11. Experimental / Legacy
  if (pathLower.includes('experimental') || pathLower.includes('legacy') || pathLower.includes('draft')) {
    roles.push('EXPERIMENTAL');
  }

  // 12. Orphaned / Unconfirmed
  const isDocOrConfigOrTest =
    roles.includes('DOCUMENTATION') || roles.includes('CONFIGURATION') || roles.includes('TEST') || roles.includes('ASSET');

  const isOrphaned = !isEntryPoint && incomingRefs === 0 && outgoingRefs === 0 && !isDocOrConfigOrTest;
  if (isOrphaned) {
    roles.push('ORPHANED');
  }

  // 13. Core vs Supporting
  const score = rankInfo ? (rankInfo as any).score || (rankInfo as any).importanceScore || 0.1 : 0.1;
  const isCore = isEntryPoint || score >= 0.4 || incomingRefs >= 2;

  if (isCore && !roles.includes('TEST') && !roles.includes('CONFIGURATION') && !roles.includes('DOCUMENTATION')) {
    roles.push('CORE');
  } else if (!isOrphaned && !roles.includes('CORE') && !isDocOrConfigOrTest) {
    roles.push('SUPPORTING');
  }

  if (roles.length === 0) {
    roles.push('UNKNOWN');
  }

  const priorityOrder: UniversalFileRole[] = [
    'ENTRY_POINT',
    'CORE',
    'SECURITY',
    'API',
    'DATA',
    'SUPPORTING',
    'CONFIGURATION',
    'TEST',
    'DOCUMENTATION',
    'BUILD',
    'ASSET',
    'GENERATED',
    'EXPERIMENTAL',
    'ORPHANED',
    'UNKNOWN',
    'UTILITY',
  ];

  const primaryRole = priorityOrder.find((pr) => roles.includes(pr)) || roles[0] || 'UNKNOWN';

  return { primaryRole, roles, isOrphaned };
}

export function classifyRepositoryFiles(
  files: { id: string; path: string; isBinary: boolean; isIgnored: boolean; lineCount: number }[],
  rankedFiles: RankedEntity[],
  dependencies: { sourceFileId: string; targetFileId: string | null }[],
  entryPoints: { path: string; reason: string }[]
): {
  mainSuspects: ClassifiedFileInfo[];
  supportingCast: ClassifiedFileInfo[];
  archives: ClassifiedFileInfo[];
  coldCases: ClassifiedFileInfo[];
  universalRecords: UniversalFileRecord[];
} {
  const mainSuspects: ClassifiedFileInfo[] = [];
  const supportingCast: ClassifiedFileInfo[] = [];
  const archives: ClassifiedFileInfo[] = [];
  const coldCases: ClassifiedFileInfo[] = [];
  const universalRecords: UniversalFileRecord[] = [];

  const entryPaths = new Set(entryPoints.map((e) => e.path.toLowerCase()));

  // Pre-index incoming and outgoing reference counts in O(N) linear time
  const incomingMap = new Map<string, number>();
  const outgoingMap = new Map<string, number>();

  for (let i = 0; i < dependencies.length; i++) {
    const d = dependencies[i];
    if (d.targetFileId) {
      incomingMap.set(d.targetFileId, (incomingMap.get(d.targetFileId) || 0) + 1);
    }
    if (d.sourceFileId && d.targetFileId) {
      outgoingMap.set(d.sourceFileId, (outgoingMap.get(d.sourceFileId) || 0) + 1);
    }
  }

  // Pre-index rankedFiles by path/id in O(N) linear time
  const rankMap = new Map<string, RankedEntity>();
  for (let i = 0; i < rankedFiles.length; i++) {
    const r = rankedFiles[i];
    if (r.id) rankMap.set(r.id, r);
    if (r.path) rankMap.set(r.path, r);
  }

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const filename = file.path.split(/[\/\\]/).pop() || '';
    const fileLower = file.path.toLowerCase();

    const rankInfo = rankMap.get(file.id) || rankMap.get(file.path);
    const score = rankInfo ? (rankInfo as any).score || (rankInfo as any).importanceScore || 0.1 : 0.1;

    const incomingRefs = incomingMap.get(file.id) || 0;
    const outgoingRefs = outgoingMap.get(file.id) || 0;
    const isEntryPoint = entryPaths.has(fileLower) || Boolean((rankInfo as any)?.isEntryPoint);

    const { primaryRole, roles, isOrphaned } = classifyFileRoles(
      file,
      rankInfo,
      incomingRefs,
      outgoingRefs,
      isEntryPoint
    );

    const extParts = filename.split('.');
    const ext = extParts.length > 1 ? extParts.pop()?.toLowerCase() || 'unknown' : 'unknown';

    const importanceLevel = isEntryPoint || score >= 0.8 ? 'CRITICAL' : score >= 0.5 ? 'HIGH' : score >= 0.2 ? 'MEDIUM' : 'LOW';
    const learningPathStatus = isEntryPoint || score >= 0.6 ? 'PRIMARY_LEARNING_PATH' : roles.includes('TEST') || roles.includes('DOCUMENTATION') ? 'REFERENCE_ONLY' : 'SECONDARY_LEARNING_PATH';
    const classificationRationale = isEntryPoint
      ? `Primary application entry point (${file.path}).`
      : isOrphaned
      ? `UNCONFIRMED / ORPHANED: No established static incoming references detected in codebase AST multigraph.`
      : `Classified as ${primaryRole} with ${incomingRefs} incoming reference(s) and ${outgoingRefs} outgoing dependency(ies).`;

    const universalRecord: UniversalFileRecord = {
      fileId: file.id,
      path: file.path,
      language: ext === 'ts' || ext === 'tsx' ? 'TypeScript' : ext === 'js' || ext === 'jsx' ? 'JavaScript' : ext === 'py' ? 'Python' : ext === 'go' ? 'Go' : ext === 'rs' ? 'Rust' : ext,
      sizeBytes: file.lineCount * 35,
      lineCount: file.lineCount,
      primaryRole,
      roles,
      importanceScore: score,
      entryProximity: isEntryPoint ? 1.0 : Math.max(0, 1.0 - outgoingRefs * 0.1),
      centrality: incomingRefs * 0.2 + outgoingRefs * 0.1,
      knownReferences: incomingRefs,
      knownDependencies: outgoingRefs,
      callersCount: incomingRefs,
      calleesCount: outgoingRefs,
      securityRelevance: roles.includes('SECURITY') ? 1.0 : 0.0,
      testRelevance: roles.includes('TEST') ? 1.0 : 0.0,
      docRelevance: roles.includes('DOCUMENTATION') ? 1.0 : 0.0,
      isGenerated: roles.includes('GENERATED'),
      confidence: isOrphaned ? 'POSSIBLE' : 'CONFIRMED',
      importanceLevel,
      learningPathStatus,
      classificationRationale,
      unconfirmedStatus: isOrphaned,
    };
    universalRecords.push(universalRecord);

    if (roles.includes('CONFIGURATION') || roles.includes('DOCUMENTATION') || roles.includes('TEST') || roles.includes('ASSET') || roles.includes('BUILD') || roles.includes('GENERATED')) {
      archives.push({
        fileId: file.id,
        path: file.path,
        group: 'ARCHIVES',
        primaryRole,
        roles,
        importanceScore: score,
        reason: roles.includes('TEST')
          ? 'Automated unit or integration test suite.'
          : roles.includes('DOCUMENTATION')
          ? 'Project documentation and onboarding guide.'
          : 'Configuration or build manifest file.',
        knownReferences: incomingRefs,
        knownDependencies: outgoingRefs,
        confidence: 'CONFIRMED',
      });
    } else if (isOrphaned) {
      coldCases.push({
        fileId: file.id,
        path: file.path,
        group: 'COLD_CASES',
        primaryRole,
        roles,
        importanceScore: score,
        reason: 'UNCONFIRMED / ORPHANED: Insufficient evidence of static connection to primary execution paths.',
        knownReferences: 0,
        knownDependencies: 0,
        confidence: 'POSSIBLE',
      });
    } else if (roles.includes('CORE') || isEntryPoint) {
      mainSuspects.push({
        fileId: file.id,
        path: file.path,
        group: 'MAIN_SUSPECTS',
        primaryRole,
        roles,
        importanceScore: score,
        reason: isEntryPoint
          ? `Primary application entry point (${file.path}).`
          : `High centrality core module with ${incomingRefs} incoming reference(s).`,
        knownReferences: incomingRefs,
        knownDependencies: outgoingRefs,
        confidence: 'CONFIRMED',
      });
    } else {
      supportingCast.push({
        fileId: file.id,
        path: file.path,
        group: 'SUPPORTING_CAST',
        primaryRole,
        roles,
        importanceScore: score,
        reason: `Supporting module connected via ${outgoingRefs} outgoing import(s) and ${incomingRefs} incoming reference(s).`,
        knownReferences: incomingRefs,
        knownDependencies: outgoingRefs,
        confidence: 'CONFIRMED',
      });
    }
  }

  mainSuspects.sort((a, b) => b.importanceScore - a.importanceScore);
  supportingCast.sort((a, b) => b.importanceScore - a.importanceScore);
  archives.sort((a, b) => b.importanceScore - a.importanceScore);
  coldCases.sort((a, b) => b.importanceScore - a.importanceScore);

  return { mainSuspects, supportingCast, archives, coldCases, universalRecords };
}
