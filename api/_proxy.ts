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

function rawQueryPairs(req: VercelRequest): string[] {
  const raw = req.url ?? ''
  const qIdx = raw.indexOf('?')
  return qIdx === -1 ? [] : raw.slice(qIdx + 1).split('&').filter(Boolean)
}

/**
 * Reads the target sub-path from the `?path=` query parameter.
 *
 * History: this proxy used to live at a dynamic catch-all route
 * (`api/heygen/[...path].ts`) and read the sub-path out of the URL's
 * pathname. Every version of that — `req.query.path` (never populated by
 * Vercel's plain Node Functions), then `new URL(req.url, ...)`, then manual
 * pathname splitting — hit some failure specific to those three dynamic
 * routes in production ("The string did not match the expected pattern.")
 * that was never reproducible locally and never happened on the sibling
 * non-dynamic functions (`/api/health`, `/api/media`), which have always
 * worked reliably. Rather than keep chasing that gap, the dynamic route is
 * gone: `/api/heygen` etc. are now plain functions, identical in kind to
 * the ones that were never affected, and the sub-path travels as an
 * ordinary `?path=` query value instead of a URL path segment.
 */
export function pathFromQuery(req: VercelRequest): string {
  for (const pair of rawQueryPairs(req)) {
    const eq = pair.indexOf('=')
    const key = eq === -1 ? pair : pair.slice(0, eq)
    if (key === 'path') return safeDecode(eq === -1 ? '' : pair.slice(eq + 1))
  }
  return ''
}

/** The real query string to forward upstream — everything except our own `path` param. */
export function queryString(req: VercelRequest): string {
  const rest = rawQueryPairs(req).filter((pair) => {
    const eq = pair.indexOf('=')
    return (eq === -1 ? pair : pair.slice(0, eq)) !== 'path'
  })
  return rest.length ? `?${rest.join('&')}` : ''
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
