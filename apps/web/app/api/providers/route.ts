import { NextResponse, type NextRequest } from 'next/server';
import { parseSearch, searchProviders } from '@/lib/supabase';

// GET /api/providers?zip=77021&age=Toddler&subsidy=1&opensBy=06:30
export async function GET(req: NextRequest) {
  const q = parseSearch(Object.fromEntries(req.nextUrl.searchParams));
  if (!q.zip) return NextResponse.json({ error: 'zip (5 digits) is required' }, { status: 400 });
  try {
    const results = await searchProviders(q);
    if (results === null) return NextResponse.json({ error: 'database not configured' }, { status: 503 });
    return NextResponse.json({ results }, { headers: { 'Cache-Control': 'public, s-maxage=3600' } });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
