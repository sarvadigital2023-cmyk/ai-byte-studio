import type { VercelRequest, VercelResponse } from '@vercel/node'
import { envKey, forward, guardRequest, pathFromQuery, withErrorHandling } from './_proxy.js'

/**
 * ElevenLabs proxy, reached at /api/elevenlabs?path=<endpoint>.
 * A plain, non-dynamic function — see the comment on pathFromQuery in
 * _proxy.ts for why this isn't a /api/elevenlabs/[...path] catch-all route.
 */

const ALLOW = [
  /^v1\/user$/,
  /^v1\/voices\/add$/, // instant voice cloning
  /^v1\/text-to-speech\/[\w-]+$/,
]

export default withErrorHandling(async (req: VercelRequest, res: VercelResponse): Promise<void> => {
  const key = envKey('ELEVENLABS_API_KEY', 'VITE_ELEVENLABS_API_KEY')
  const path = pathFromQuery(req)

  // Diagnostic ping: confirms the proxy route itself is deployed (public).
  if (path === 'health') {
    res.status(200).json({ ok: true, provider: 'elevenlabs', keyConfigured: !!key })
    return
  }
  // Everything below hits the paid API — require a guarded, authorized caller.
  if (!(await guardRequest(req, res))) return
  if (!key) {
    res.status(503).json({ error: 'ElevenLabs key is not configured on the server' })
    return
  }
  await forward(req, res, {
    baseUrl: 'https://api.elevenlabs.io',
    path,
    allow: ALLOW,
    headers: { 'xi-api-key': key },
  })
})
