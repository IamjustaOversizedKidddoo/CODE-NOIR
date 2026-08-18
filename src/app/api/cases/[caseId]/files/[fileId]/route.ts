import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { readProjectFileById } from '@/lib/ingestion/source-storage';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ caseId: string; fileId: string }> }
) {
  try {
    const { caseId, fileId } = await context.params;
    const searchParams = req.nextUrl.searchParams;
    const startLineStr = searchParams.get('startLine');
    const endLineStr = searchParams.get('endLine');

    // 1. Securely read file content from local vault
    const fileData = await readProjectFileById(caseId, fileId);

    // 2. Fetch associated symbols from DB
    const symbols = await prisma.codeSymbol.findMany({
      where: {
        projectId: caseId,
        fileId: fileId,
      },
      orderBy: { startLine: 'asc' },
    });

    let content = fileData.content || '';
    let totalLines = fileData.lineCount;

    // Optional range slicing with boundary clamping
    if (content && (startLineStr || endLineStr)) {
      const rawLines = content.split(/\r?\n/);
      totalLines = rawLines.length;

      let startLine = parseInt(startLineStr || '1', 10);
      let endLine = parseInt(endLineStr || String(totalLines), 10);

      if (isNaN(startLine) || startLine < 1) startLine = 1;
      if (isNaN(endLine) || endLine > totalLines) endLine = totalLines;
      if (endLine < startLine) endLine = startLine;

      const sliced = rawLines.slice(startLine - 1, endLine);
      content = sliced.join('\n');
    }

    return NextResponse.json({
      success: true,
      file: {
        id: fileData.fileId,
        projectId: fileData.projectId,
        path: fileData.path,
        extension: fileData.extension,
        sizeBytes: fileData.sizeBytes,
        lineCount: totalLines,
        isBinary: fileData.isBinary,
        hash: fileData.hash,
        content,
        symbols,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to retrieve evidence file.', code: 'FILE_READ_ERROR' },
      { status: 404 }
    );
  }
}
