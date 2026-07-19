import type { VercelRequest, VercelResponse } from '@vercel/node'
import { envKey, forward, guardRequest, pathFromQuery, withErrorHandling } from './_proxy.js'

/**
 * Runway proxy, reached at /api/runway?path=<endpoint>.
 * A plain, non-dynamic function — see the comment on pathFromQuery in
 * _proxy.ts for why this isn't a /api/runway/[...path] catch-all route.
 */

const ALLOW = [
  /^v1\/organization$/,
  /^v1\/text_to_image$/,
  /^v1\/image_to_video$/,
  /^v1\/tasks\/[\w-]+$/,
]

export default withErrorHandling(async (req: VercelRequest, res: VercelResponse): Promise<void> => {
  const key = envKey('RUNWAY_API_KEY', 'VITE_RUNWAY_API_KEY')
  const path = pathFromQuery(req)

  // Diagnostic ping: confirms the proxy route itself is deployed (public).
  if (path === 'health') {
    res.status(200).json({ ok: true, provider: 'runway', keyConfigured: !!key })
    return
  }
  // Everything below hits the paid API — require a guarded, authorized caller.
  if (!(await guardRequest(req, res))) return
  if (!key) {
    res.status(503).json({ error: 'Runway key is not configured on the server' })
    return
  }
  await forward(req, res, {
    baseUrl: 'https://api.dev.runwayml.com',
    path,
    allow: ALLOW,
    headers: {
      authorization: `Bearer ${key}`,
      'x-runway-version': '2024-11-06',
    },
  })
})
