/**
 * Upstash Redis REST client.
 * We use raw fetch instead of the Upstash SDK to keep the bundle lean.
 */

const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL!;
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN!;

async function redisCommand<T = unknown>(...args: (string | number)[]): Promise<T> {
  if (!REDIS_URL || !REDIS_TOKEN) {
    throw new Error('Redis env vars are not configured');
  }
  const res = await fetch(`${REDIS_URL}/${args.map(encodeURIComponent).join('/')}`, {
    headers: { Authorization: `Bearer ${REDIS_TOKEN}` },
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`Redis error: ${res.status} ${await res.text()}`);
  const json = await res.json();
  return json.result as T;
}

export const redis = {
  /** SET key value EX seconds NX */
  async set(key: string, value: string, exSeconds?: number, nx?: boolean): Promise<string | null> {
    const args: (string | number)[] = ['SET', key, value];
    if (exSeconds) args.push('EX', exSeconds);
    if (nx) args.push('NX');
    return redisCommand<string | null>(...args);
  },

  async get(key: string): Promise<string | null> {
    return redisCommand<string | null>('GET', key);
  },

  async del(key: string): Promise<number> {
    return redisCommand<number>('DEL', key);
  },

  async expire(key: string, seconds: number): Promise<number> {
    return redisCommand<number>('EXPIRE', key, seconds);
  },
};

/**
 * Acquire a distributed lock using SET NX EX.
 * Returns true if lock was acquired, false otherwise.
 */
export async function acquireLock(key: string, ttlSeconds = 10): Promise<boolean> {
  const result = await redis.set(`lock:${key}`, '1', ttlSeconds, true);
  return result === 'OK';
}

export async function releaseLock(key: string): Promise<void> {
  await redis.del(`lock:${key}`);
}

/**
 * Execute fn while holding a distributed lock.
 * Throws if lock cannot be acquired.
 */
export async function withLock<T>(
  lockKey: string,
  fn: () => Promise<T>,
  ttlSeconds = 10
): Promise<T> {
  const acquired = await acquireLock(lockKey, ttlSeconds);
  if (!acquired) {
    throw new LockConflictError(`Could not acquire lock: ${lockKey}`);
  }
  try {
    return await fn();
  } finally {
    await releaseLock(lockKey);
  }
}

export class LockConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'LockConflictError';
  }
}
