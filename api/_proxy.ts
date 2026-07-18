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

function requestUrl(req: VercelRequest): URL {
  return new URL(req.url ?? '/', 'http://localhost')
}

/**
 * Extracts the sub-path after `/api/<routePrefix>/` directly from `req.url`.
 *
 * NOT read from `req.query.path`: that relies on Vercel populating dynamic
 * catch-all segments into `req.query` the way Next.js does, which is not
 * guaranteed for plain (non-Next.js) Vercel Functions — in production this
 * came back empty for every request, so every call silently 403'd or fell
 * through to the wrong branch. Parsing `req.url` ourselves has no such
 * dependency and behaves identically locally and in production.
 */
export function pathFromCatchAll(req: VercelRequest, routePrefix: string): string {
  const { pathname } = requestUrl(req)
  const marker = `/api/${routePrefix}/`
  const idx = pathname.indexOf(marker)
  if (idx === -1) return ''
  return decodeURIComponent(pathname.slice(idx + marker.length)).replace(/\/+$/, '')
}

/** The real query string (if any), taken straight from the request URL. */
export function queryString(req: VercelRequest): string {
  return requestUrl(req).search
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
