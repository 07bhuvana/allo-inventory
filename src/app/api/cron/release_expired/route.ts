import { NextRequest, NextResponse } from 'next/server';
import { releaseExpiredReservations } from '@/lib/expiry';

// Called by Vercel Cron (see vercel.json) every minute
export async function GET(req: NextRequest) {
  // Basic auth check for cron endpoint security
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const released = await releaseExpiredReservations();
  return NextResponse.json({ released, timestamp: new Date().toISOString() });
}
