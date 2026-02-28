import Redis from 'ioredis';
import { config } from '../config/env';

export const redis = new Redis(config.REDIS_URL);

redis.on('error', (err) => console.error('Redis error:', err));

export async function getCached<T>(key: string): Promise<T | null> {
    const val = await redis.get(key);
    return val ? (JSON.parse(val) as T) : null;
}

export async function setCache(key: string, value: unknown, ttl = config.CACHE_TTL_SECONDS) {
    await redis.set(key, JSON.stringify(value), 'EX', ttl);
}

export function buildCacheKey(prefix: string, id: string): string {
    return `cache:${prefix}:${id.toLowerCase().trim().replace(/\s+/g, ' ')}`;
}
