import type { VercelRequest, VercelResponse } from '@vercel/node'
import { envKey, withErrorHandling } from './_proxy.js'

/**
 * Reports which provider keys are configured on the server — booleans only,
 * never the values. The Settings screen uses this for the
 * "detected ✓ / not set ✕" status cards.
 */
export default withErrorHandling((_req: VercelRequest, res: VercelResponse): void => {
  res.setHeader('cache-control', 'no-store')
  res.status(200).json({
    heygen: !!envKey('HEYGEN_API_KEY', 'VITE_HEYGEN_API_KEY'),
    runway: !!envKey('RUNWAY_API_KEY', 'VITE_RUNWAY_API_KEY'),
    elevenlabs: !!envKey('ELEVENLABS_API_KEY', 'VITE_ELEVENLABS_API_KEY'),
  })
})
