import { NextRequest, NextResponse } from 'next/server';
import { chaosStore, CHAOS_CONFIGS, ChaosScenario } from '@/lib/chaos-store';

// GET /api/chaos — return current scenario and all available options
export async function GET() {
  const current = chaosStore.getConfig();
  return NextResponse.json({
    active: current,
    scenarios: Object.values(CHAOS_CONFIGS).map(c => ({
      id: c.scenario,
      description: c.description,
      severity: getSeverity(c.scenario),
    })),
  });
}

// POST /api/chaos — set new chaos scenario
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { scenario } = body as { scenario: ChaosScenario };

    if (!scenario || !CHAOS_CONFIGS[scenario]) {
      return NextResponse.json(
        { success: false, error: `Unknown scenario. Valid: ${Object.keys(CHAOS_CONFIGS).join(', ')}` },
        { status: 400 }
      );
    }

    chaosStore.setScenario(scenario);
    const cfg = chaosStore.getConfig();

    return NextResponse.json({
      success: true,
      message: `Chaos scenario set to "${scenario}"`,
      active: cfg,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

function getSeverity(scenario: ChaosScenario): 'low' | 'medium' | 'high' | 'critical' {
  switch (scenario) {
    case 'healthy': return 'low';
    case 'auth_breach': return 'medium';
    case 'payment_failure': return 'high';
    case 'traffic_spike': return 'high';
    case 'db_timeout': return 'critical';
    case 'cascade_failure': return 'critical';
    default: return 'low';
  }
}
