import { createClient, type SupabaseClient } from '@supabase/supabase-js'

/**
 * Supabase client, created at runtime from config served by `/api/config`
 * rather than from build-time `import.meta.env`. This removes the whole class
 * of "the bundle was built without the VITE_ vars" failures: the server reads
 * the values from process.env when the app boots, so it no longer matters
 * whether they were present when the client bundle was compiled.
 *
 * `initSupabase()` runs once at startup (see main.tsx) BEFORE anything renders,
 * so every later `getSupabase()` / `isCloudEnabled()` call sees the resolved
 * client. Supabase stays optional: if no config comes back, the client is null
 * and the app runs in local-only mode, exactly as before.
 */
let client: SupabaseClient | null = null
let initialized = false

interface PublicConfig {
  supabaseUrl?: string | null
  supabaseAnonKey?: string | null
}

export async function initSupabase(): Promise<void> {
  if (initialized) return
  initialized = true
  try {
    // Guard against a hung request bricking startup: fall back to local mode.
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), 5000)
    const res = await fetch('/api/config', { signal: ctrl.signal })
    clearTimeout(timer)
    if (!res.ok) return
    const cfg = (await res.json()) as PublicConfig
    if (cfg.supabaseUrl && cfg.supabaseAnonKey) {
      client = createClient(cfg.supabaseUrl, cfg.supabaseAnonKey)
    }
  } catch {
    // Network error, timeout or bad JSON → run without cloud features.
  }
}

/** The initialized client, or null when Supabase isn't configured. */
export function getSupabase(): SupabaseClient | null {
  return client
}

/** True once a Supabase client exists (config was present and valid). */
export function isCloudEnabled(): boolean {
  return client !== null
}

export async function getCurrentUserId(): Promise<string | null> {
  if (!client) return null
  const { data } = await client.auth.getUser()
  return data.user?.id ?? null
}

/** The current session's access token, forwarded to the /api proxies so the
 * server can verify the caller. Null when Supabase is off or nobody is signed in. */
export async function getAccessToken(): Promise<string | null> {
  if (!client) return null
  const { data } = await client.auth.getSession()
  return data.session?.access_token ?? null
}

/**
 * Step 1 of email sign-in: ask Supabase to email a 6-digit code. Supabase
 * generates and sends it through its own SMTP — no magic link, no redirect,
 * no third-party email service. `shouldCreateUser: true` means a first-time
 * email is registered on the spot, so the same flow covers sign-up and
 * sign-in. Deliberately no `emailRedirectTo`: we verify the typed code, not a
 * link, so nothing depends on Site URL / Redirect URL configuration.
 */
export async function sendEmailOtp(email: string): Promise<{ error?: string }> {
  if (!client) return { error: 'Supabase is not configured' }
  const { error } = await client.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: true },
  })
  return error ? { error: error.message } : {}
}

/**
 * Step 2 of email sign-in: exchange the 6-digit code the user typed for a
 * real Supabase session. Once this succeeds, onAuthStateChange fires and the
 * session token is attached to every /api proxy call automatically.
 */
export async function verifyEmailOtp(email: string, token: string): Promise<{ error?: string }> {
  if (!client) return { error: 'Supabase is not configured' }
  const { error } = await client.auth.verifyOtp({ email, token, type: 'email' })
  return error ? { error: error.message } : {}
}

/**
 * Google sign-in — kept ready but not wired to an active button yet: it needs
 * a stable, owned domain for the OAuth redirect, which we don't have on the
 * *.vercel.app preview domain. When the domain is bought, enable the Google
 * provider in Supabase and point the Account screen's Google button at this
 * function; no other part of the auth flow has to change.
 */
export async function signInWithGoogle(): Promise<{ error?: string }> {
  if (!client) return { error: 'Supabase is not configured' }
  const { error } = await client.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: window.location.origin },
  })
  return error ? { error: error.message } : {}
}

export async function signOut(): Promise<void> {
  await client?.auth.signOut()
}
