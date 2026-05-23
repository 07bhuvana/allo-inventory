import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
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

  return NextResponse.json({
    reservation: {
      id: reservation.id,
      status: reservation.status,
      quantity: reservation.quantity,
      expiresAt: reservation.expiresAt,
      confirmedAt: reservation.confirmedAt,
      releasedAt: reservation.releasedAt,
      createdAt: reservation.createdAt,
      product: {
        id: reservation.stockLevel.product.id,
        name: reservation.stockLevel.product.name,
        sku: reservation.stockLevel.product.sku,
        price: reservation.stockLevel.product.price,
        imageUrl: reservation.stockLevel.product.imageUrl,
      },
      warehouse: {
        id: reservation.stockLevel.warehouse.id,
        name: reservation.stockLevel.warehouse.name,
        location: reservation.stockLevel.warehouse.location,
      },
    },
  });
}
