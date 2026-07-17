import type { VercelRequest, VercelResponse } from '@vercel/node'

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

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  const raw = req.query.url
  const target = Array.isArray(raw) ? raw[0] : raw
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
}
