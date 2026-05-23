import { NextRequest, NextResponse } from 'next/server';
import { releaseExpiredReservations } from '@/lib/expiry';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  const secret = searchParams.get('secret');

  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const released = await releaseExpiredReservations();

  return NextResponse.json({
    released,
    timestamp: new Date().toISOString(),
  });
}