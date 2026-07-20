import type { VercelRequest, VercelResponse } from '@vercel/node'
import { envKey, withErrorHandling } from './_proxy.js'

/**
 * Public runtime configuration for the browser.
 *
 * Returns ONLY the Supabase URL and anon (publishable) key. Both are public by
 * design — the anon key is safe in a browser because every table is protected
 * by row-level security — and are exactly the two values that used to be
 * inlined into the client bundle at build time. Serving them here at runtime
 * (from process.env, which Vercel always populates for the running function,
 * regardless of when the bundle was built) means the client no longer breaks
 * when the VITE_ vars weren't present at build time. It also tolerates either
 * naming convention (with or without the VITE_ prefix).
 *
 * SECURITY: this endpoint must never expose a secret. It returns a fixed shape
 * with exactly two public fields, read from two named env vars. It never reads
 * or echoes any *_API_KEY (HeyGen / Runway / ElevenLabs), any Supabase
 * service-role key, or arbitrary environment values. Do not add secret values
 * here, and do not spread process.env into the response.
 */
export default withErrorHandling(async (_req: VercelRequest, res: VercelResponse): Promise<void> => {
  const supabaseUrl = envKey('SUPABASE_URL', 'VITE_SUPABASE_URL') ?? null
  const supabaseAnonKey = envKey('SUPABASE_ANON_KEY', 'VITE_SUPABASE_ANON_KEY') ?? null

  // Config changes rarely and is fetched once per app load — a short cache is
  // safe and keeps startup fast.
  res.setHeader('cache-control', 'public, max-age=60')
  res.status(200).json({ supabaseUrl, supabaseAnonKey })
})
