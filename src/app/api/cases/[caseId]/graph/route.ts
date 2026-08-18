import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { calculateBlastRadius } from '@/lib/intelligence/graph-builder';
import { DirectedProjectGraph, GraphEdge, GraphNode } from '@/lib/types/intelligence';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ caseId: string }> }
) {
  try {
    const { caseId } = await context.params;
    const searchParams = req.nextUrl.searchParams;
    const blastRadiusTarget = searchParams.get('blastRadiusTarget') || undefined;

    // 1. Fetch Files, Symbols, Dependencies, CallEdges
    const [files, symbols, dependencies, callEdges, project] = await Promise.all([
      prisma.projectFile.findMany({
        where: { projectId: caseId, isIgnored: false },
        select: { id: true, path: true, isEntry: true },
      }),
      prisma.codeSymbol.findMany({
        where: { projectId: caseId },
        select: { id: true, fileId: true, name: true, kind: true },
      }),
      prisma.dependency.findMany({
        where: { projectId: caseId, targetFileId: { not: null } },
        select: {
          id: true,
          sourceFileId: true,
          targetFileId: true,
          importName: true,
          importType: true,
          confidence: true,
          evidenceLine: true,
        },
      }),
      prisma.callEdge.findMany({
        where: { projectId: caseId },
        select: {
          id: true,
          callerId: true,
          calleeId: true,
          calleeName: true,
          relationship: true,
          confidence: true,
          line: true,
          evidence: true,
        },
      }),
      prisma.project.findUnique({
        where: { id: caseId },
        select: { brainJson: true },
      }),
    ]);

    const fileMap = new Map(files.map((f) => [f.id, f.path]));

    // Construct Nodes
    const nodes: GraphNode[] = [
      ...files.map((f) => ({
        id: f.id,
        type: 'FILE' as const,
        name: f.path.split('/').pop() || f.path,
        path: f.path,
        isEntry: f.isEntry,
      })),
      ...symbols.map((s) => ({
        id: s.id,
        type: 'SYMBOL' as const,
        name: s.name,
        path: fileMap.get(s.fileId) || '',
        kind: s.kind,
      })),
    ];

    // Construct Edges
    const edges: GraphEdge[] = [
      ...dependencies.map((d) => ({
        id: `dep_${d.id}`,
        source: d.sourceFileId,
        target: d.targetFileId!,
        relationship: 'IMPORTS' as const,
        confidence: d.confidence as any,
        line: d.evidenceLine || undefined,
        evidence: `Import statement for "${d.importName || '*'}"`,
      })),
      ...callEdges.map((c) => ({
        id: `call_${c.id}`,
        source: c.callerId,
        target: c.calleeId || `unresolved_${c.calleeName}`,
        relationship: c.relationship as any,
        confidence: c.confidence as any,
        line: c.line,
        evidence: c.evidence || undefined,
      })),
    ];

    const brain = project?.brainJson ? JSON.parse(project.brainJson) : null;
    const cycles = brain?.statistics?.circularDependencyCount ? [/* cycles recorded */] : [];

    const graph: DirectedProjectGraph = { nodes, edges, cycles };

    if (blastRadiusTarget) {
      const blastRadius = calculateBlastRadius(blastRadiusTarget, graph);
      return NextResponse.json({
        success: true,
        caseId,
        blastRadius,
      });
    }

    return NextResponse.json({
      success: true,
      caseId,
      graph,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to retrieve graph.', code: 'SERVER_ERROR' },
      { status: 500 }
    );
  }
}
