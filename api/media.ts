import type { VercelRequest, VercelResponse } from '@vercel/node'
import { withErrorHandling } from './_proxy.js'

/**
 * Fetches provider-hosted media (generated portraits, rendered videos) that
 * the browser cannot download directly because of CORS. Hostnames are
 * strictly allowlisted to provider CDNs — this is not a general-purpose
 * fetcher.
 */

const ALLOWED_HOST_SUFFIXES = [
  '.heygen.ai',
  '.heygen.com',
  '.cloudfront.net', // Runway task outputs
]

/** Extracts `?url=` from req.url by hand — see the comment on
 * pathFromCatchAll in _proxy.ts for why the URL() constructor is avoided. */
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
  if (
    url.protocol !== 'https:' ||
    !ALLOWED_HOST_SUFFIXES.some((s) => url.hostname.endsWith(s))
  ) {
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
