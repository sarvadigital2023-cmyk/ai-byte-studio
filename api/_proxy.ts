import type { VercelRequest, VercelResponse } from '@vercel/node'

/**
 * Shared helpers for the provider proxies. API keys never leave the server:
 * the browser calls /api/<provider>?path=..., the proxy injects the key and
 * forwards the request. Two layers keep the proxies from being abused as a
 * free relay for the owner's paid API credits:
 *   1. `guardRequest` — same-origin check, in-memory rate limit, and a
 *      required, verified Supabase auth token (fails closed if Supabase
 *      itself isn't configured — no anonymous caller is ever let through).
 *   2. per-endpoint allowlists in each handler.
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
 * Reads the target sub-path from the `?path=` query parameter, by hand —
 * deliberately not via the URL constructor (see git history: dynamic
 * catch-all routes + `new URL(req.url)` failed in production in ways that
 * were never reproducible locally; plain string ops on `req.url` are immune).
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

export function envKey(...names: string[]): string | undefined {
  for (const n of names) {
    const v = process.env[n]
    if (v && v.trim()) return v.trim()
  }
  return undefined
}

// ---------- abuse protection ----------

function header(req: VercelRequest, name: string): string | undefined {
  const v = req.headers[name]
  return Array.isArray(v) ? v[0] : v
}

function clientIp(req: VercelRequest): string {
  const fwd = header(req, 'x-forwarded-for')
  return (fwd?.split(',')[0].trim() || header(req, 'x-real-ip') || 'unknown').slice(0, 64)
}

/** Host of an absolute URL, parsed without the URL constructor. */
function hostOf(value: string): string {
  const noScheme = value.replace(/^[a-z][a-z0-9+.-]*:\/\//i, '')
  return noScheme.split('/')[0].toLowerCase()
}

/**
 * Rejects browser requests coming from a different site. A same-origin fetch
 * either omits the Origin header or sends this deployment's own host, so a
 * present-but-foreign Origin is a cross-site call we don't serve. (Does not
 * stop non-browser clients like curl — auth + rate limiting cover those.)
 */
function sameOriginOk(req: VercelRequest): boolean {
  const origin = header(req, 'origin')
  if (!origin) return true
  const host = header(req, 'x-forwarded-host') ?? header(req, 'host') ?? ''
  return hostOf(origin) === host.toLowerCase()
}

// Per-instance sliding-window rate limit. Best-effort: state is per warm
// serverless instance and resets on cold start, but it caps bulk abuse cheaply
// with no external dependency.
const RATE_MAX = 40
const RATE_WINDOW_MS = 60_000
const hits = new Map<string, number[]>()

function rateLimited(ip: string): boolean {
  const now = Date.now()
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < RATE_WINDOW_MS)
  recent.push(now)
  hits.set(ip, recent)
  // Bound the map so a burst of unique IPs can't grow it without limit.
  if (hits.size > 5000) hits.clear()
  return recent.length > RATE_MAX
}

/**
 * Verifies the caller's Supabase auth token. Uses only the public anon key +
 * the user's own JWT — no service-role key. Fails closed: if Supabase isn't
 * configured on the server, nobody can be verified, so the request is
 * rejected rather than let through — these endpoints spend the owner's paid
 * credits and must never be reachable by an anonymous caller. Deploying this
 * app publicly therefore requires Supabase to be configured (see README).
 */
async function verifyAuth(
  req: VercelRequest,
): Promise<{ ok: true } | { ok: false; status: number; message: string }> {
  const supaUrl = envKey('SUPABASE_URL', 'VITE_SUPABASE_URL')
  const supaAnon = envKey('SUPABASE_ANON_KEY', 'VITE_SUPABASE_ANON_KEY')
  if (!supaUrl || !supaAnon) {
    return {
      ok: false,
      status: 503,
      message: 'Generation is not available: server auth is not configured',
    }
  }

  const auth = header(req, 'authorization')
  if (!auth || !/^Bearer\s+/i.test(auth)) {
    return { ok: false, status: 401, message: 'Sign in required to use generation' }
  }
  const token = auth.replace(/^Bearer\s+/i, '')
  try {
    const r = await fetch(`${supaUrl.replace(/\/+$/, '')}/auth/v1/user`, {
      headers: { apikey: supaAnon, authorization: `Bearer ${token}` },
    })
    if (r.ok) return { ok: true }
    return { ok: false, status: 401, message: 'Your session is invalid or expired' }
  } catch {
    return { ok: false, status: 503, message: 'Could not verify your session' }
  }
}

/**
 * Runs all abuse checks. Returns true if the request may proceed; otherwise it
 * has already sent a 4xx/5xx JSON response and the caller must return.
 */
export async function guardRequest(req: VercelRequest, res: VercelResponse): Promise<boolean> {
  if (!sameOriginOk(req)) {
    res.status(403).json({ error: 'Cross-origin requests are not allowed' })
    return false
  }
  if (rateLimited(clientIp(req))) {
    res.status(429).json({ error: 'Too many requests — slow down and try again shortly' })
    return false
  }
  const auth = await verifyAuth(req)
  if (!auth.ok) {
    res.status(auth.status).json({ error: auth.message })
    return false
  }
  return true
}

// ---------- upstream forwarding ----------

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
  const body = method === 'GET' || method === 'HEAD' ? undefined : await readRawBody(req)

  const headers: Record<string, string> = { ...opts.headers }
  const contentType = header(req, 'content-type')
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

/**
 * Wraps a handler so any unexpected throw becomes a clean JSON error instead
 * of Vercel's crash page. The client only receives a generic message so
 * internal details aren't leaked (Vercel still records the failed invocation).
 */
export function withErrorHandling(
  handler: (req: VercelRequest, res: VercelResponse) => Promise<void> | void,
) {
  return async (req: VercelRequest, res: VercelResponse): Promise<void> => {
    try {
      await handler(req, res)
    } catch {
      if (res.headersSent) return
      res.status(500).json({ error: 'Internal server error' })
    }
  }
}
