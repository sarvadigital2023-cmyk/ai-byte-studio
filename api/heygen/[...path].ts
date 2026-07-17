import type { VercelRequest, VercelResponse } from '@vercel/node'
import { envKey, forward, pathFromCatchAll } from '../_proxy'

/**
 * HeyGen proxy. Media uploads go to upload.heygen.com, everything else to
 * api.heygen.com — both behind the same /api/heygen/* route.
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

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  const key = envKey('HEYGEN_API_KEY', 'VITE_HEYGEN_API_KEY')
  if (!key) {
    res.status(503).json({ error: 'HeyGen key is not configured on the server' })
    return
  }
  const path = pathFromCatchAll(req)
  const isUpload = UPLOAD_PATHS.some((r) => r.test(path))
  await forward(req, res, {
    baseUrl: isUpload ? 'https://upload.heygen.com' : 'https://api.heygen.com',
    path,
    allow: ALLOW,
    headers: { 'x-api-key': key },
  })
}

export const config = { api: { bodyParser: false } }
