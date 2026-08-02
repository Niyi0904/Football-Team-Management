// app/api/ai/summary/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { checkApiKey, getLeagueSummary } from '@/lib/ai-access';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    checkApiKey(request.headers.get('Authorization'));

    const leagueId = request.nextUrl.searchParams.get('leagueId');
    if (!leagueId) {
      return NextResponse.json({ error: 'leagueId query parameter is required.' }, { status: 400 });
    }

    const data = await getLeagueSummary(leagueId);
    return NextResponse.json(data, { status: 200 });
  } catch (err: any) {
    const message = err?.message ?? 'Internal server error.';
    if (message.includes('not found')) {
      return NextResponse.json({ error: message }, { status: 404 });
    }
    if (message.includes('API key') || message.includes('Authorization')) {
      return NextResponse.json({ error: message }, { status: 401 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}