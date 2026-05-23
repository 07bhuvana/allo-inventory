import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withIdempotency } from '@/lib/idempotency';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const idempotencyKey = req.headers.get('Idempotency-Key');
  const { id } = params;

  return withIdempotency(idempotencyKey, `POST /api/reservations/${id}/confirm`, async () => {
    const reservation = await prisma.reservation.findUnique({
      where: { id },
      include: { stockLevel: { include: { product: true, warehouse: true } } },
    });

    if (!reservation) {
      return NextResponse.json({ error: 'Reservation not found' }, { status: 404 });
    }

    if (reservation.status === 'CONFIRMED') {
      return NextResponse.json({
        reservation: formatReservation(reservation),
        message: 'Reservation already confirmed',
      });
    }

    if (reservation.status === 'RELEASED') {
      return NextResponse.json({ error: 'Reservation has already been released' }, { status: 410 });
    }

    // Check expiry
    if (reservation.expiresAt < new Date()) {
      // Release the units back
      await prisma.$transaction([
        prisma.reservation.update({
          where: { id },
          data: { status: 'RELEASED', releasedAt: new Date() },
        }),
        prisma.stockLevel.update({
          where: { id: reservation.stockLevelId },
          data: { reservedUnits: { decrement: reservation.quantity } },
        }),
      ]);
      return NextResponse.json({ error: 'Reservation has expired' }, { status: 410 });
    }

    // Confirm: decrement totalUnits (permanent) and reservedUnits
    const now = new Date();
    const [updated] = await prisma.$transaction([
      prisma.reservation.update({
        where: { id },
        data: { status: 'CONFIRMED', confirmedAt: now },
        include: { stockLevel: { include: { product: true, warehouse: true } } },
      }),
      prisma.stockLevel.update({
        where: { id: reservation.stockLevelId },
        data: {
          totalUnits: { decrement: reservation.quantity },
          reservedUnits: { decrement: reservation.quantity },
        },
      }),
    ]);

    return NextResponse.json({
      reservation: formatReservation(updated),
      message: 'Payment confirmed. Order placed successfully!',
    });
  });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function formatReservation(r: any) {
  return {
    id: r.id,
    status: r.status,
    quantity: r.quantity,
    expiresAt: r.expiresAt,
    confirmedAt: r.confirmedAt,
    releasedAt: r.releasedAt,
    createdAt: r.createdAt,
    product: {
      id: r.stockLevel.product.id,
      name: r.stockLevel.product.name,
      sku: r.stockLevel.product.sku,
      price: r.stockLevel.product.price,
      imageUrl: r.stockLevel.product.imageUrl,
    },
    warehouse: {
      id: r.stockLevel.warehouse.id,
      name: r.stockLevel.warehouse.name,
      location: r.stockLevel.warehouse.location,
    },
  };
}
