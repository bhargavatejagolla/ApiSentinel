import { NextRequest, NextResponse } from 'next/server';
import { runAIAnomalyAnalysis } from '@/lib/analyze-logs';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const logsToAnalyze = typeof body.count === 'number' ? body.count : 50;

    const anomalies = await runAIAnomalyAnalysis(logsToAnalyze);

    return NextResponse.json({
      success: true,
      message: `AI Log Analysis completed successfully on the last ${logsToAnalyze} logs.`,
      anomaliesCount: anomalies.length,
      anomalies
    });
  } catch (error: any) {
    console.error('API Log Analysis Error:', error);
    
    // Check if the error is due to missing Groq API Key
    if (error.message && error.message.includes('GROQ_API_KEY')) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Groq API Key configuration missing', 
          details: 'Please set the GROQ_API_KEY environment variable in your .env.local file to activate the AI debugging agent.' 
        },
        { status: 412 } // Precondition Failed
      );
    }

    return NextResponse.json(
      { success: false, error: 'AI Log Analysis failed to execute', details: error.message },
      { status: 500 }
    );
  }
}
