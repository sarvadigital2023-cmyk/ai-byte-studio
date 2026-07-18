import type { VercelRequest, VercelResponse } from '@vercel/node'
import { envKey, forward, pathFromCatchAll } from '../_proxy.js'

const ALLOW = [
  /^v1\/organization$/,
  /^v1\/text_to_image$/,
  /^v1\/image_to_video$/,
  /^v1\/tasks\/[\w-]+$/,
]

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  const key = envKey('RUNWAY_API_KEY', 'VITE_RUNWAY_API_KEY')
  const path = pathFromCatchAll(req, 'runway')

  // Diagnostic ping: confirms the proxy route itself is deployed.
  if (path === 'health') {
    res.status(200).json({ ok: true, provider: 'runway', keyConfigured: !!key })
    return
  }
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
}
