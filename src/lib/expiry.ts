import { prisma } from './prisma';

/**
 * Release all expired PENDING reservations and return the number released.
 * This is called:
 *   1. From the cron endpoint (production)
 *   2. Lazily before returning stock levels in GET /api/products
 */
export async function releaseExpiredReservations(): Promise<number> {
  const now = new Date();

  // Find all expired pending reservations
  const expired = await prisma.reservation.findMany({
    where: { status: 'PENDING', expiresAt: { lt: now } },
    select: { id: true, stockLevelId: true, quantity: true },
  });

  if (expired.length === 0) return 0;

  // Group by stockLevelId to batch the decrements
  const grouped: Record<string, number> = {};
  for (const r of expired) {
    grouped[r.stockLevelId] = (grouped[r.stockLevelId] ?? 0) + r.quantity;
  }

  await prisma.$transaction([
    // Mark them released
    prisma.reservation.updateMany({
      where: { id: { in: expired.map((r) => r.id) } },
      data: { status: 'RELEASED', releasedAt: now },
    }),
    // Decrement reservedUnits on each stock level
    ...Object.entries(grouped).map(([stockLevelId, qty]) =>
      prisma.stockLevel.update({
        where: { id: stockLevelId },
        data: { reservedUnits: { decrement: qty } },
      })
    ),
  ]);

  return expired.length;
}
