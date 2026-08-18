import { NextResponse } from 'next/server';
import { runTruthLabBenchmark } from '@/lib/truth-lab/master-runner';

export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    const scorecard = await runTruthLabBenchmark();

    return NextResponse.json({
      success: true,
      scorecard,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Truth Lab execution failed.', code: 'TRUTH_LAB_ERROR' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const scorecard = await runTruthLabBenchmark();

    return NextResponse.json({
      success: true,
      scorecard,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to retrieve Truth Lab scorecard.', code: 'SCORECARD_ERROR' },
      { status: 500 }
    );
  }
}
