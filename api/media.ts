import type { VercelRequest, VercelResponse } from '@vercel/node'
import { guardRequest, withErrorHandling } from './_proxy.js'

/**
 * Fetches HeyGen-hosted media (generated portraits) that the browser cannot
 * download directly because of CORS, so it can be re-uploaded to HeyGen.
 *
 * The host allowlist is intentionally limited to HeyGen's own domains. It used
 * to include `.cloudfront.net`, which matched ANY CloudFront distribution and
 * effectively made this an open fetch relay; nothing in the app fetches Runway
 * output through this proxy (Runway URLs are used directly), so that entry is
 * gone.
 */

const ALLOWED_HOST_SUFFIXES = ['.heygen.ai', '.heygen.com']

/** Extracts `?url=` from req.url by hand (see pathFromQuery in _proxy.ts). */
function getUrlParam(req: VercelRequest): string | null {
  const raw = req.url ?? ''
  const qIdx = raw.indexOf('?')
  if (qIdx === -1) return null
  for (const pair of raw.slice(qIdx + 1).split('&')) {
    const [k, v] = pair.split('=')
    if (k === 'url' && v !== undefined) {
      try {
        return decodeURIComponent(v)
      } catch {
        return v
      }
    }
  }
  return null
}

export default withErrorHandling(async (req: VercelRequest, res: VercelResponse): Promise<void> => {
  if (!(await guardRequest(req, res))) return

  const target = getUrlParam(req)
  if (!target) {
    res.status(400).json({ error: 'Missing url parameter' })
    return
  }
  let url: URL
  try {
    url = new URL(target)
  } catch {
    res.status(400).json({ error: 'Invalid url' })
    return
  }
  if (url.protocol !== 'https:' || !ALLOWED_HOST_SUFFIXES.some((s) => url.hostname.endsWith(s))) {
    res.status(403).json({ error: 'Host not allowed' })
    return
  }

  const upstream = await fetch(url)
  res.status(upstream.status)
  const type = upstream.headers.get('content-type')
  if (type) res.setHeader('content-type', type)
  res.setHeader('cache-control', 'private, max-age=300')
  res.send(Buffer.from(await upstream.arrayBuffer()))
})
