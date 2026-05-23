import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withLock, LockConflictError } from '@/lib/redis';
import { withIdempotency } from '@/lib/idempotency';
import { CreateReservationSchema } from '@/lib/schemas';

const WINDOW_MINUTES = parseInt(process.env.RESERVATION_WINDOW_MINUTES ?? '10', 10);

export async function POST(req: NextRequest) {
  const idempotencyKey = req.headers.get('Idempotency-Key');

  return withIdempotency(idempotencyKey, 'POST /api/reservations', async () => {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const parsed = CreateReservationSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 422 }
      );
    }

    const { productId, warehouseId, quantity } = parsed.data;

    try {
      // Lock key is scoped to the specific product+warehouse combination
      const lockKey = `stock:${productId}:${warehouseId}`;

      const reservation = await withLock(lockKey, async () => {
        // Re-read stock inside the lock to get a consistent view
        const stockLevel = await prisma.stockLevel.findUnique({
          where: { productId_warehouseId: { productId, warehouseId } },
        });

        if (!stockLevel) {
          throw new NotFoundError('Stock level not found for this product/warehouse combination');
        }

        const available = stockLevel.totalUnits - stockLevel.reservedUnits;
        if (available < quantity) {
          throw new InsufficientStockError(
            `Only ${available} unit(s) available, requested ${quantity}`
          );
        }

        const expiresAt = new Date(Date.now() + WINDOW_MINUTES * 60 * 1000);

        // Atomically increment reservedUnits and create reservation
        const [, newReservation] = await prisma.$transaction([
          prisma.stockLevel.update({
            where: { id: stockLevel.id },
            data: { reservedUnits: { increment: quantity } },
          }),
          prisma.reservation.create({
            data: {
              stockLevelId: stockLevel.id,
              quantity,
              status: 'PENDING',
              expiresAt,
            },
            include: {
              stockLevel: {
                include: { product: true, warehouse: true },
              },
            },
          }),
        ]);

        return newReservation;
      });

      return NextResponse.json(
        {
          reservation: formatReservation(reservation),
          message: `Reserved ${quantity} unit(s) for ${WINDOW_MINUTES} minutes`,
        },
        { status: 201 }
      );
    } catch (err) {
      if (err instanceof NotFoundError) {
        return NextResponse.json({ error: err.message }, { status: 404 });
      }
      if (err instanceof InsufficientStockError) {
        return NextResponse.json({ error: err.message }, { status: 409 });
      }
      if (err instanceof LockConflictError) {
        return NextResponse.json(
          { error: 'Too many concurrent requests. Please try again.' },
          { status: 409 }
        );
      }
      console.error('[POST /api/reservations]', err);
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
  });
}

// GET /api/reservations/:id — fetch a single reservation
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  const reservation = await prisma.reservation.findUnique({
    where: { id },
    include: { stockLevel: { include: { product: true, warehouse: true } } },
  });
  if (!reservation) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ reservation: formatReservation(reservation) });
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

class NotFoundError extends Error {}
class InsufficientStockError extends Error {}
