import { prisma } from './prisma';
import { NextResponse } from 'next/server';

/**
 * Check idempotency key. If a prior response exists, return it.
 * Otherwise, call handler and store result.
 */
export async function withIdempotency(
  idempotencyKey: string | null,
  endpoint: string,
  handler: () => Promise<NextResponse>
): Promise<NextResponse> {
  if (!idempotencyKey) {
    return handler();
  }

  // Check for existing record
  const existing = await prisma.idempotencyRecord.findUnique({
    where: { key: idempotencyKey },
  });

  if (existing) {
    // Return cached response
    return NextResponse.json(existing.responseBody, { status: existing.statusCode });
  }

  // Execute handler
  const response = await handler();
  const cloned = response.clone();
  const body = await cloned.json();

  // Store result (ignore race condition on duplicate key — first writer wins)
  try {
    await prisma.idempotencyRecord.create({
      data: {
        key: idempotencyKey,
        endpoint,
        statusCode: response.status,
        responseBody: body,
      },
    });
  } catch {
    // Duplicate key — another request already stored it, that's fine
  }

  return response;
}
