/** Shared mock utilities — realistic delays + cancellation support. */

export class CancelledError extends Error {
  constructor() {
    super('Cancelled')
    this.name = 'CancelledError'
  }
}

/** Waits 2–4 s (or `minMs..maxMs`), rejecting immediately if aborted. */
export function mockDelay(
  signal?: AbortSignal,
  minMs = 2000,
  maxMs = 4000,
): Promise<void> {
  const ms = minMs + Math.random() * (maxMs - minMs)
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(new CancelledError())
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort)
      resolve()
    }, ms)
    const onAbort = () => {
      clearTimeout(timer)
      reject(new CancelledError())
    }
    signal?.addEventListener('abort', onAbort, { once: true })
  })
}

/** Small chance of failure so the "Retry step" flow is exercised in mock mode. */
export function maybeFail(message: string, probability = 0.1): void {
  if (Math.random() < probability) throw new Error(message)
}

export function mockMediaUrl(kind: 'avatar' | 'video', seed: string): string {
  return `mock://${kind}/${seed}`
}

export function isMockUrl(url: string | undefined): boolean {
  return !!url && url.startsWith('mock://')
}
