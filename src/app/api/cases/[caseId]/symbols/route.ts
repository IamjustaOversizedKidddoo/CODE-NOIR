import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ caseId: string }> }
) {
  try {
    const { caseId } = await context.params;
    const searchParams = req.nextUrl.searchParams;
    const fileId = searchParams.get('fileId') || undefined;
    const kind = searchParams.get('kind') || undefined;
    const search = searchParams.get('search') || undefined;
    const pageStr = searchParams.get('page');
    const limitStr = searchParams.get('limit');

    const where: any = {
      projectId: caseId,
      ...(fileId ? { fileId } : {}),
      ...(kind ? { kind } : {}),
    };

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { qualifiedName: { contains: search } },
      ];
    }

    const totalCount = await prisma.codeSymbol.count({ where });

    let symbols;
    let pagination = null;

    if (pageStr || limitStr) {
      const page = Math.max(1, parseInt(pageStr || '1', 10));
      const limit = Math.min(500, Math.max(1, parseInt(limitStr || '100', 10)));
      const skip = (page - 1) * limit;

      symbols = await prisma.codeSymbol.findMany({
        where,
        include: {
          file: {
            select: {
              path: true,
            },
          },
        },
        orderBy: [{ fileId: 'asc' }, { startLine: 'asc' }],
        skip,
        take: limit,
      });

      pagination = {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit),
      };
    } else {
      symbols = await prisma.codeSymbol.findMany({
        where,
        include: {
          file: {
            select: {
              path: true,
            },
          },
        },
        orderBy: [{ fileId: 'asc' }, { startLine: 'asc' }],
        take: 500,
      });
    }

    return NextResponse.json({
      success: true,
      caseId,
      totalCount,
      pagination,
      symbols: symbols.map((s) => ({
        id: s.id,
        fileId: s.fileId,
        filePath: s.file.path,
        name: s.name,
        qualifiedName: s.qualifiedName,
        kind: s.kind,
        startLine: s.startLine,
        endLine: s.endLine,
        startCol: s.startCol,
        endCol: s.endCol,
        signature: s.signature,
        complexity: s.complexity,
        isExported: s.isExported,
        confidence: s.confidence,
        language: s.language,
      })),
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to retrieve symbols.', code: 'SERVER_ERROR' },
      { status: 500 }
    );
  }
}
