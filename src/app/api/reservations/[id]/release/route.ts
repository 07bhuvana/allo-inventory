import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params;

  const reservation = await prisma.reservation.findUnique({
    where: { id },
    include: { stockLevel: { include: { product: true, warehouse: true } } },
  });

  if (!reservation) {
    return NextResponse.json({ error: 'Reservation not found' }, { status: 404 });
  }

  if (reservation.status === 'RELEASED') {
    return NextResponse.json({
      reservation: formatReservation(reservation),
      message: 'Reservation already released',
    });
  }

  if (reservation.status === 'CONFIRMED') {
    return NextResponse.json(
      { error: 'Cannot release a confirmed reservation' },
      { status: 409 }
    );
  }

  const now = new Date();
  const [updated] = await prisma.$transaction([
    prisma.reservation.update({
      where: { id },
      data: { status: 'RELEASED', releasedAt: now },
      include: { stockLevel: { include: { product: true, warehouse: true } } },
    }),
    prisma.stockLevel.update({
      where: { id: reservation.stockLevelId },
      data: { reservedUnits: { decrement: reservation.quantity } },
    }),
  ]);

  return NextResponse.json({
    reservation: formatReservation(updated),
    message: 'Reservation released. Units returned to stock.',
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
