/**
 * Usage tracking via Vercel Blob (replaces KV — KV deprecated by Vercel).
 * Keys:
 *   {userId}/usage/{YYYY-MM}.json  →  { tokensUsed, requestCount }
 *   {userId}/limits.json           →  { monthlyTokenLimit }
 *
 * Acceptable for ≤50 users. If scale grows, swap to Upstash Redis adapter.
 */

import { storageGet, storagePut } from './storage'

const DEFAULT_MONTHLY_TOKEN_LIMIT = 50_000

function currentMonth(): string {
  return new Date().toISOString().slice(0, 7) // YYYY-MM
}

interface UsageRecord {
  tokensUsed: number
  requestCount: number
}

interface LimitRecord {
  monthlyTokenLimit: number
}

async function readUsage(userId: string, month: string): Promise<UsageRecord> {
  const raw = await storageGet(userId, `usage/${month}.json`)
  if (!raw) return { tokensUsed: 0, requestCount: 0 }
  try { return JSON.parse(raw) as UsageRecord } catch { return { tokensUsed: 0, requestCount: 0 } }
}

async function readLimit(userId: string): Promise<number> {
  const raw = await storageGet(userId, 'limits.json')
  if (!raw) return DEFAULT_MONTHLY_TOKEN_LIMIT
  try { return (JSON.parse(raw) as LimitRecord).monthlyTokenLimit } catch { return DEFAULT_MONTHLY_TOKEN_LIMIT }
}

// ─── Public API ────────────────────────────────────────────────────────────────

/** Call before an Anthropic request. Throws if monthly limit exceeded. */
export async function checkUsage(userId: string, estimatedTokens = 0): Promise<void> {
  const month = currentMonth()
  const [usage, limit] = await Promise.all([readUsage(userId, month), readLimit(userId)])
  if (usage.tokensUsed + estimatedTokens > limit) {
    throw new Error(`Limite mensuelle atteinte (${usage.tokensUsed}/${limit} tokens utilisés).`)
  }
}

/** Call after a successful Anthropic response to record actual token usage. */
export async function recordUsage(userId: string, inputTokens: number, outputTokens: number): Promise<void> {
  const month = currentMonth()
  const usage = await readUsage(userId, month)
  const updated: UsageRecord = {
    tokensUsed: usage.tokensUsed + inputTokens + outputTokens,
    requestCount: usage.requestCount + 1,
  }
  await storagePut(userId, `usage/${month}.json`, JSON.stringify(updated))
}

/** Returns usage summary for a given month (defaults to current). */
export async function getUsageSummary(userId: string, month = currentMonth()): Promise<{
  month: string
  tokensUsed: number
  requestCount: number
  limit: number
}> {
  const [usage, limit] = await Promise.all([readUsage(userId, month), readLimit(userId)])
  return { month, ...usage, limit }
}

/** Admin only — set a custom monthly token limit for a user. */
export async function setUserLimit(userId: string, monthlyTokenLimit: number): Promise<void> {
  await storagePut(userId, 'limits.json', JSON.stringify({ monthlyTokenLimit }))
}
