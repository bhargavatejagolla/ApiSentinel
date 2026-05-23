import { NextRequest, NextResponse } from 'next/server';
import { triggerAndPostLogs } from '@/lib/log-generator';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const scenario = body.scenario || 'standard';
    const count = typeof body.count === 'number' ? body.count : 10;

    // Resolve current request origin dynamically to make loopback request fully serverless-compatible
    const originUrl = req.nextUrl.origin;

    const generatedLogs = await triggerAndPostLogs(scenario, count, originUrl);

    return NextResponse.json({
      success: true,
      message: `Successfully triggered scenario "${scenario}" and generated ${generatedLogs.length} logs.`,
      scenario,
      count: generatedLogs.length,
      logs: generatedLogs
    });
  } catch (error: any) {
    console.error('API Generate Logs Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to generate and ingest logs', details: error.message },
      { status: 500 }
    );
  }
}
