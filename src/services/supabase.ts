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

export async function signInWithMagicLink(email: string): Promise<{ error?: string }> {
  if (!supabase) return { error: 'Supabase is not configured' }
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: window.location.origin },
  })
  return error ? { error: error.message } : {}
}

/** Redirects to Google; only returns (with an error) if the redirect itself
 * couldn't start — e.g. the Google provider isn't enabled in the Supabase
 * project yet. On success the browser navigates away before this resolves. */
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
