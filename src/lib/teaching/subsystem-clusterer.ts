import { HierarchicalClusterNode, UniversalFileRecord, UniversalFileRole } from './types';

export function buildHierarchicalClusters(
  files: UniversalFileRecord[],
  dependencies: { sourceFileId: string; targetFileId: string | null }[]
): HierarchicalClusterNode[] {
  if (files.length === 0) return [];

  // Group files by primary role & directory prefix
  const roleGroups = new Map<UniversalFileRole, UniversalFileRecord[]>();

  for (const file of files) {
    const role = file.primaryRole;
    if (!roleGroups.has(role)) {
      roleGroups.set(role, []);
    }
    roleGroups.get(role)!.push(file);
  }

  const clusters: HierarchicalClusterNode[] = [];

  // Define human-readable labels for subsystem roles
  const roleLabels: Record<UniversalFileRole, string> = {
    ENTRY_POINT: 'Gateway Entry Points',
    CORE: 'Core Architecture Subsystem',
    SECURITY: 'Authentication & Security',
    API: 'API & Route Controllers',
    DATA: 'Database & Persistence Layer',
    SUPPORTING: 'Supporting Services & Modules',
    CONFIGURATION: 'Configuration & Manifests',
    TEST: 'Automated Test Suites',
    DOCUMENTATION: 'Documentation & Guides',
    UTILITY: 'Utility & Helper Functions',
    BUILD: 'Build & Toolchain Systems',
    ASSET: 'Static Assets & Styles',
    GENERATED: 'Generated Code & Artifacts',
    EXPERIMENTAL: 'Experimental Modules',
    ORPHANED: 'Unconfirmed / Cold Cases',
    UNKNOWN: 'Unclassified Items',
  };

  let clusterIndex = 1;

  for (const [role, roleFiles] of roleGroups.entries()) {
    if (roleFiles.length === 0) continue;

    // Sub-cluster large groups by directory prefix if group > 10 files
    const childSubsystems: HierarchicalClusterNode[] = [];

    if (roleFiles.length > 10) {
      const dirMap = new Map<string, UniversalFileRecord[]>();
      for (const f of roleFiles) {
        const parts = f.path.split(/[\/\\]/);
        const dir = parts.length > 1 ? parts.slice(0, Math.min(2, parts.length - 1)).join('/') : 'root';
        if (!dirMap.has(dir)) dirMap.set(dir, []);
        dirMap.get(dir)!.push(f);
      }

      let subIdx = 1;
      for (const [dirName, dirFiles] of dirMap.entries()) {
        const avgScore = dirFiles.reduce((acc, curr) => acc + curr.importanceScore, 0) / dirFiles.length;
        childSubsystems.push({
          id: `sub_${clusterIndex}_${subIdx++}`,
          name: dirName === 'root' ? 'Root Files' : `${dirName.toUpperCase()}`,
          parentSubsystemId: `cluster_${clusterIndex}`,
          primaryRole: role,
          fileIds: dirFiles.map((f) => f.fileId),
          filePaths: dirFiles.map((f) => f.path),
          childSubsystems: [],
          importanceScore: Number(avgScore.toFixed(2)),
          totalFilesCount: dirFiles.length,
          summary: `${dirFiles.length} file(s) in component block ${dirName}.`,
        });
      }
    }

    const totalClusterScore = roleFiles.reduce((acc, curr) => acc + curr.importanceScore, 0);
    const avgClusterScore = totalClusterScore / roleFiles.length;

    clusters.push({
      id: `cluster_${clusterIndex++}`,
      name: roleLabels[role] || `${role} Subsystem`,
      primaryRole: role,
      fileIds: roleFiles.map((f) => f.fileId),
      filePaths: roleFiles.map((f) => f.path),
      childSubsystems,
      importanceScore: Number(avgClusterScore.toFixed(2)),
      totalFilesCount: roleFiles.length,
      summary: `Contains ${roleFiles.length} file(s) responsible for ${roleLabels[role] || role}.`,
    });
  }

  // Sort clusters by importance score descending
  clusters.sort((a, b) => b.importanceScore - a.importanceScore);

  return clusters;
}
