import "server-only";

// Best-effort limits kept in server memory. They stop a single account or a runaway client from
// burning the AI budget; on serverless each instance has its own counters, so the hard ceiling is
// the spend limit you set on the OpenRouter key.
const perUser = new Map<string, number[]>();
let day = new Date().toISOString().slice(0, 10), dayCount = 0;
const cache = new Map<string, { at: number; value: unknown }>();

const HOUR = 3_600_000;
export const USER_LIMIT = 12;
export const DAILY_CAP = Number(process.env.ENRICH_DAILY_CAP) || 1500;

export function allow(userId: string, now = Date.now()): "ok" | "user_limit" | "daily_cap" {
  const today = new Date(now).toISOString().slice(0, 10);
  if (today !== day) { day = today; dayCount = 0; }
  if (dayCount >= DAILY_CAP) return "daily_cap";
  const recent = (perUser.get(userId) ?? []).filter((t) => now - t < HOUR);
  if (recent.length >= USER_LIMIT) { perUser.set(userId, recent); return "user_limit"; }
  recent.push(now);
  perUser.set(userId, recent);
  if (perUser.size > 5000) for (const k of perUser.keys()) { perUser.delete(k); if (perUser.size < 4000) break; }
  dayCount++;
  return "ok";
}

export function cacheGet<T>(key: string, now = Date.now()): T | null {
  const hit = cache.get(key);
  if (!hit || now - hit.at > 15 * 60_000) { cache.delete(key); return null; }
  return hit.value as T;
}
export function cacheSet(key: string, value: unknown, now = Date.now()) {
  cache.set(key, { at: now, value });
  if (cache.size > 300) cache.delete(cache.keys().next().value as string);
}
