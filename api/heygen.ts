import type { VercelRequest, VercelResponse } from '@vercel/node'
import { envKey, forward, pathFromQuery, withErrorHandling } from './_proxy.js'

/**
 * HeyGen proxy. Media uploads go to upload.heygen.com, everything else to
 * api.heygen.com — both behind /api/heygen?path=<endpoint>.
 *
 * A plain, non-dynamic function (not a /api/heygen/[...path] catch-all
 * route) — see the comment on pathFromQuery in _proxy.ts for why.
 */

const ALLOW = [
  /^v1\/talking_photo$/, // create a talking photo from an image (upload host)
  /^v1\/asset$/, // upload an audio/image asset (upload host)
  /^v2\/video\/generate$/,
  /^v1\/video_status\.get$/,
  /^v2\/user\/remaining_quota$/,
  /^v2\/photo_avatar\/photo\/generate$/,
  /^v2\/photo_avatar\/generation\/[\w-]+$/,
]

const UPLOAD_PATHS = [/^v1\/talking_photo$/, /^v1\/asset$/]

export default withErrorHandling(async (req: VercelRequest, res: VercelResponse): Promise<void> => {
  const key = envKey('HEYGEN_API_KEY', 'VITE_HEYGEN_API_KEY')
  const path = pathFromQuery(req)

  // Diagnostic ping: confirms the proxy route itself is deployed.
  if (path === 'health') {
    res.status(200).json({ ok: true, provider: 'heygen', keyConfigured: !!key })
    return
  }
  if (!key) {
    res.status(503).json({ error: 'HeyGen key is not configured on the server' })
    return
  }
  const isUpload = UPLOAD_PATHS.some((r) => r.test(path))
  await forward(req, res, {
    baseUrl: isUpload ? 'https://upload.heygen.com' : 'https://api.heygen.com',
    path,
    allow: ALLOW,
    headers: { 'x-api-key': key },
  })
})
