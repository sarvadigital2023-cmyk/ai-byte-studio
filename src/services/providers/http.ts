import { CancelledError, ProviderError } from './errors'

/** Fetch through the same-origin serverless proxies with error extraction. */
export async function apiFetch<T = unknown>(
  input: string,
  init: RequestInit = {},
  parse: 'json' | 'blob' = 'json',
): Promise<T> {
  let res: Response
  try {
    res = await fetch(input, init)
  } catch (err) {
    if (init.signal?.aborted) throw new CancelledError()
    const name = err instanceof Error ? err.name : 'Error'
    const message = err instanceof Error ? err.message : String(err)
    // Include the request URL and error name: a bare browser message like
    // "Load failed" or a URL-parser error is meaningless without them.
    throw new ProviderError(`${name}: ${message} (fetching ${input})`)
  }
  if (!res.ok) {
    let detail = ''
    try {
      const text = await res.text()
      try {
        const json = JSON.parse(text) as Record<string, unknown>
        detail = extractMessage(json) ?? text
      } catch {
        detail = text
      }
    } catch {
      /* body unreadable */
    }
    throw new ProviderError(
      (detail.slice(0, 300) || `Request failed (${res.status})`) + ` [${input}]`,
      res.status,
    )
  }
  return (parse === 'json' ? res.json() : res.blob()) as Promise<T>
}

function extractMessage(json: Record<string, unknown>): string | undefined {
  for (const key of ['error', 'message', 'detail']) {
    const v = json[key]
    if (typeof v === 'string' && v) return v
    if (v && typeof v === 'object') {
      const nested = extractMessage(v as Record<string, unknown>)
      if (nested) return nested
    }
  }
  return undefined
}

/** Polls `check` until it returns a value; respects cancellation and timeout. */
export async function poll<T>(
  check: () => Promise<T | null>,
  opts: { intervalMs?: number; timeoutMs?: number; signal?: AbortSignal } = {},
): Promise<T> {
  const { intervalMs = 4000, timeoutMs = 15 * 60 * 1000, signal } = opts
  const deadline = Date.now() + timeoutMs
  for (;;) {
    if (signal?.aborted) throw new CancelledError()
    const result = await check()
    if (result !== null) return result
    if (Date.now() > deadline) throw new ProviderError('Generation timed out')
    await sleep(intervalMs, signal)
  }
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(new CancelledError())
    const t = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort)
      resolve()
    }, ms)
    const onAbort = () => {
      clearTimeout(t)
      reject(new CancelledError())
    }
    signal?.addEventListener('abort', onAbort, { once: true })
  })
}

export async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  const res = await fetch(dataUrl)
  return res.blob()
}

/** Fetches provider-hosted media through the allowlisted /api/media proxy. */
export function mediaProxyUrl(url: string): string {
  return `/api/media?url=${encodeURIComponent(url)}`
}
