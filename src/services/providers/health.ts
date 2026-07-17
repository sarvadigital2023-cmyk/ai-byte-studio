export interface KeyStatus {
  heygen: boolean
  runway: boolean
  elevenlabs: boolean
}

let cache: KeyStatus | null = null

/**
 * Which provider keys are configured — booleans reported by the serverless
 * /api/health endpoint (key values never reach the browser).
 */
export async function getKeyStatus(force = false): Promise<KeyStatus> {
  if (cache && !force) return cache
  try {
    const res = await fetch('/api/health', { cache: 'no-store' })
    if (!res.ok) throw new Error(String(res.status))
    cache = (await res.json()) as KeyStatus
  } catch {
    // API routes unavailable (e.g. plain `vite dev` without `vercel dev`)
    cache = { heygen: false, runway: false, elevenlabs: false }
  }
  return cache
}
