import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

/**
 * Supabase is optional: without env vars the app runs in local-only mode.
 * Every caller must handle `supabase === null`.
 */
export const supabase: SupabaseClient | null =
  url && anonKey ? createClient(url, anonKey) : null

export const isCloudEnabled = supabase !== null

export async function getCurrentUserId(): Promise<string | null> {
  if (!supabase) return null
  const { data } = await supabase.auth.getUser()
  return data.user?.id ?? null
}

/** The current session's access token, forwarded to the /api proxies so the
 * server can verify the caller. Null when Supabase is off or nobody is signed in. */
export async function getAccessToken(): Promise<string | null> {
  if (!supabase) return null
  const { data } = await supabase.auth.getSession()
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
  if (!supabase) return { error: 'Supabase is not configured' }
  const { error } = await supabase.auth.signInWithOtp({
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
  if (!supabase) return { error: 'Supabase is not configured' }
  const { error } = await supabase.auth.verifyOtp({ email, token, type: 'email' })
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
  if (!supabase) return { error: 'Supabase is not configured' }
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: window.location.origin },
  })
  return error ? { error: error.message } : {}
}

export async function signOut(): Promise<void> {
  await supabase?.auth.signOut()
}
