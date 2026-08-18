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
    const includeIgnored = searchParams.get('includeIgnored') === 'true';
    const search = searchParams.get('search') || undefined;
    const language = searchParams.get('language') || undefined;

    const pageStr = searchParams.get('page');
    const limitStr = searchParams.get('limit');

    const projectExists = await prisma.project.count({
      where: { id: caseId },
    });

    if (!projectExists) {
      return NextResponse.json(
        { success: false, error: 'Case dossier not found.', code: 'CASE_NOT_FOUND' },
        { status: 404 }
      );
    }

    const where: any = {
      projectId: caseId,
      ...(includeIgnored ? {} : { isIgnored: false }),
    };

    if (search) {
      where.path = { contains: search };
    }
    if (language) {
      where.language = language;
    }

    const totalCount = await prisma.projectFile.count({ where });

    let files;
    let pagination = null;

    if (pageStr || limitStr) {
      const page = Math.max(1, parseInt(pageStr || '1', 10));
      const limit = Math.min(200, Math.max(1, parseInt(limitStr || '50', 10)));
      const skip = (page - 1) * limit;

      files = await prisma.projectFile.findMany({
        where,
        select: {
          id: true,
          path: true,
          extension: true,
          language: true,
          sizeBytes: true,
          lineCount: true,
          isBinary: true,
          isIgnored: true,
          ignoreReason: true,
          isEntry: true,
          hash: true,
          createdAt: true,
        },
        orderBy: { path: 'asc' },
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
      files = await prisma.projectFile.findMany({
        where,
        select: {
          id: true,
          path: true,
          extension: true,
          language: true,
          sizeBytes: true,
          lineCount: true,
          isBinary: true,
          isIgnored: true,
          ignoreReason: true,
          isEntry: true,
          hash: true,
          createdAt: true,
        },
        orderBy: { path: 'asc' },
      });
    }

    return NextResponse.json({
      success: true,
      caseId,
      totalCount,
      pagination,
      files,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to retrieve files.', code: 'SERVER_ERROR' },
      { status: 500 }
    );
  }
}
