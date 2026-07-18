import type { VercelRequest, VercelResponse } from '@vercel/node'

/**
 * Shared helper for the provider proxies. Keys never leave the server:
 * the browser calls /api/<provider>/..., the proxy injects the API key and
 * forwards the request. Endpoint allowlists keep the proxies from being
 * used as open relays.
 */

export function readRawBody(req: VercelRequest): Promise<Buffer> {
  // Vercel's Node helpers consume the stream for known content types
  // (JSON, text, urlencoded, octet-stream) and expose the result on
  // req.body — reuse it, otherwise the raw stream would be empty.
  const parsed = (req as { body?: unknown }).body
  if (parsed !== undefined && parsed !== null) {
    if (Buffer.isBuffer(parsed)) return Promise.resolve(parsed)
    if (typeof parsed === 'string') return Promise.resolve(Buffer.from(parsed))
    return Promise.resolve(Buffer.from(JSON.stringify(parsed)))
  }
  // Unparsed content types (multipart uploads, images, audio) still stream.
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    req.on('data', (c: Buffer) => chunks.push(c))
    req.on('end', () => resolve(Buffer.concat(chunks)))
    req.on('error', reject)
  })
}

function safeDecode(s: string): string {
  try {
    return decodeURIComponent(s)
  } catch {
    return s
  }
}

/**
 * Extracts the sub-path after `/api/<routePrefix>/` directly from `req.url`,
 * using plain string operations — deliberately NOT the `URL` constructor.
 *
 * History: first read `req.query.path` (Next.js-style catch-all params),
 * which Vercel's plain Node Functions never populated — always empty in
 * production. Switched to `new URL(req.url, 'http://localhost')`, which
 * then threw "The string did not match the expected pattern." in
 * production for real provider calls (not reproducible locally), most
 * likely a WHATWG URL parser edge case specific to the runtime. Splitting
 * `req.url` by hand sidesteps both: it has no dependency on how Vercel
 * populates params and no dependency on any URL-parsing engine at all.
 */
export function pathFromCatchAll(req: VercelRequest, routePrefix: string): string {
  const raw = req.url ?? '/'
  const pathname = raw.split('?', 1)[0] ?? raw
  const marker = `/api/${routePrefix}/`
  const idx = pathname.indexOf(marker)
  if (idx === -1) return ''
  return safeDecode(pathname.slice(idx + marker.length).replace(/\/+$/, ''))
}

/** The real query string (if any), taken straight from `req.url` — no URL(). */
export function queryString(req: VercelRequest): string {
  const raw = req.url ?? ''
  const qIdx = raw.indexOf('?')
  return qIdx === -1 ? '' : raw.slice(qIdx)
}

export interface ForwardOptions {
  baseUrl: string
  path: string
  allow: RegExp[]
  headers: Record<string, string>
}

export async function forward(
  req: VercelRequest,
  res: VercelResponse,
  opts: ForwardOptions,
): Promise<void> {
  if (!opts.allow.some((r) => r.test(opts.path))) {
    res.status(403).json({ error: `Endpoint not allowed: ${opts.path}` })
    return
  }

  const method = req.method ?? 'GET'
  const body =
    method === 'GET' || method === 'HEAD' ? undefined : await readRawBody(req)

  const headers: Record<string, string> = { ...opts.headers }
  const contentType = req.headers['content-type']
  if (contentType) headers['content-type'] = contentType

  const upstream = await fetch(`${opts.baseUrl}/${opts.path}${queryString(req)}`, {
    method,
    headers,
    body: body && body.length > 0 ? new Uint8Array(body) : undefined,
  })

  res.status(upstream.status)
  const upstreamType = upstream.headers.get('content-type')
  if (upstreamType) res.setHeader('content-type', upstreamType)
  res.send(Buffer.from(await upstream.arrayBuffer()))
}

export function envKey(...names: string[]): string | undefined {
  for (const n of names) {
    const v = process.env[n]
    if (v && v.trim()) return v.trim()
  }
  return undefined
}

/**
 * Wraps a handler so ANY unexpected throw (bad input, upstream network
 * failure, a bug) becomes a clean, readable JSON error instead of Vercel's
 * generic crash page or an unhandled rejection — so the client always has
 * something diagnosable to show instead of an opaque platform error.
 */
export function withErrorHandling(
  handler: (req: VercelRequest, res: VercelResponse) => Promise<void> | void,
) {
  return async (req: VercelRequest, res: VercelResponse): Promise<void> => {
    try {
      await handler(req, res)
    } catch (err) {
      if (res.headersSent) return
      const message = err instanceof Error ? err.message : String(err)
      const name = err instanceof Error ? err.name : undefined
      res.status(500).json({ error: message, errorType: name })
    }
  }
}
