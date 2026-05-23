import { NextRequest, NextResponse } from 'next/server';
import { logStore } from '@/lib/log-store';
import { APILog } from '@/types';

// GET: Retrieve all logs, anomalies, and current calculated health stats
export async function GET() {
  try {
    const data = logStore.getData();
    return NextResponse.json({ success: true, ...data });
  } catch (error: any) {
    console.error('API Logs GET Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to retrieve logs', details: error.message },
      { status: 500 }
    );
  }
}

// POST: Ingest new API logs
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    
    // Clear action
    if (body.clear === true) {
      logStore.clearAll();
      return NextResponse.json({ success: true, message: 'Log store successfully cleared.' });
    }

    const incomingLogs = body.logs;

    if (!incomingLogs) {
      return NextResponse.json(
        { success: false, error: 'Invalid request body. Missing "logs" field.' },
        { status: 400 }
      );
    }

    const logsArray: APILog[] = Array.isArray(incomingLogs) ? incomingLogs : [incomingLogs];

    // Validate log entries
    const validatedLogs: APILog[] = logsArray.map(log => {
      return {
        id: log.id || `log_${Math.random().toString(36).substring(2, 11)}_${Date.now()}`,
        timestamp: log.timestamp || new Date().toISOString(),
        method: log.method || 'GET',
        path: log.path || '/api',
        status: typeof log.status === 'number' ? log.status : 200,
        latency: typeof log.latency === 'number' ? log.latency : 50,
        clientIp: log.clientIp || '127.0.0.1',
        userAgent: log.userAgent || 'unknown',
        requestHeaders: log.requestHeaders || undefined,
        requestPayload: log.requestPayload || undefined,
        responsePayload: log.responsePayload || undefined,
        errorMessage: log.errorMessage || undefined,
      };
    });

    const updatedLogs = logStore.addLogs(validatedLogs);

    return NextResponse.json({
      success: true,
      message: `Successfully ingested ${validatedLogs.length} log(s).`,
      count: updatedLogs.length,
    });
  } catch (error: any) {
    console.error('API Logs POST Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to ingest logs', details: error.message },
      { status: 500 }
    );
  }
}
