import type { VercelRequest, VercelResponse } from '@vercel/node'
import { envKey, forward, pathFromCatchAll } from '../_proxy'

const ALLOW = [
  /^v1\/user$/,
  /^v1\/voices\/add$/, // instant voice cloning
  /^v1\/text-to-speech\/[\w-]+$/,
]

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  const key = envKey('ELEVENLABS_API_KEY', 'VITE_ELEVENLABS_API_KEY')
  if (!key) {
    res.status(503).json({ error: 'ElevenLabs key is not configured on the server' })
    return
  }
  await forward(req, res, {
    baseUrl: 'https://api.elevenlabs.io',
    path: pathFromCatchAll(req),
    allow: ALLOW,
    headers: { 'xi-api-key': key },
  })
}

export const config = { api: { bodyParser: false } }
