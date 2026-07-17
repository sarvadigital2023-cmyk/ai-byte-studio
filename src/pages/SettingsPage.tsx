import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import type { ConnectionTestState, ProviderId, VideoProviderId } from '@/types'
import { PROVIDERS } from '@/services/providers'
import { supabase, isCloudEnabled, signInWithMagicLink, signOut } from '@/services/supabase'
import { useSettingsStore } from '@/store/settings'
import { toast } from '@/store/toasts'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { GlassCard } from '@/components/ui/GlassCard'
import { NeonButton } from '@/components/ui/NeonButton'

const PROVIDER_META: Record<ProviderId, { icon: string; envVar: string; role: string }> = {
  heygen: { icon: '🎭', envVar: 'VITE_HEYGEN_API_KEY', role: 'Avatar & video generation' },
  runway: { icon: '🎞', envVar: 'VITE_RUNWAY_API_KEY', role: 'Avatar & video generation' },
  elevenlabs: { icon: '🎙', envVar: 'VITE_ELEVENLABS_API_KEY', role: 'Voice cloning & speech' },
}

/** API keys status, provider connection tests, global video provider, account. */
export function SettingsPage() {
  const { videoProvider, setVideoProvider, hydrateFromProfile } = useSettingsStore()
  const [tests, setTests] = useState<Record<ProviderId, ConnectionTestState>>({
    heygen: 'idle',
    runway: 'idle',
    elevenlabs: 'idle',
  })
  const [testMessages, setTestMessages] = useState<Partial<Record<ProviderId, string>>>({})
  const [email, setEmail] = useState('')
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [authBusy, setAuthBusy] = useState(false)

  useEffect(() => {
    if (!supabase) return
    void supabase.auth.getUser().then(({ data }) => setUserEmail(data.user?.email ?? null))
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setUserEmail(session?.user?.email ?? null)
      if (session?.user) void hydrateFromProfile()
    })
    return () => sub.subscription.unsubscribe()
  }, [hydrateFromProfile])

  const runTest = async (id: ProviderId) => {
    setTests((t) => ({ ...t, [id]: 'testing' }))
    const res = await PROVIDERS[id].testConnection()
    setTests((t) => ({ ...t, [id]: res.ok ? 'ok' : 'fail' }))
    setTestMessages((m) => ({ ...m, [id]: res.message }))
  }

  const sendMagicLink = async () => {
    if (!email.trim()) return
    setAuthBusy(true)
    const { error } = await signInWithMagicLink(email.trim())
    setAuthBusy(false)
    if (error) toast(error, 'error')
    else toast('Magic link sent — check your inbox', 'success')
  }

  return (
    <div className="space-y-6 pb-6">
      <h1 className="text-lg font-extrabold">Settings</h1>

      {/* Global video provider */}
      <section>
        <h2 className="mb-1 text-sm font-bold text-white/80">Video Provider</h2>
        <p className="mb-3 text-xs text-muted">
          Applies to Solo Avatar, Cinema Studio and Cartoon Studio — every video pipeline
          routes through this provider.
        </p>
        <SegmentedControl<VideoProviderId>
          layoutId="video-provider"
          accent="blue"
          value={videoProvider}
          onChange={setVideoProvider}
          options={[
            { value: 'heygen', label: 'HeyGen' },
            { value: 'runway', label: 'Runway' },
          ]}
        />
      </section>

      {/* Provider status cards */}
      <section className="space-y-3">
        <h2 className="text-sm font-bold text-white/80">API keys</h2>
        <p className="text-xs text-muted">
          Keys live only in Vercel environment variables — never in the app or repo. To
          configure: Vercel → Project Settings → Environment Variables → add the key →
          redeploy.
        </p>
        {(Object.keys(PROVIDERS) as ProviderId[]).map((id, i) => {
          const p = PROVIDERS[id]
          const meta = PROVIDER_META[id]
          const configured = p.isConfigured()
          const test = tests[id]
          return (
            <motion.div
              key={id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.07, type: 'spring', stiffness: 280, damping: 26 }}
            >
              <GlassCard glow={configured} accent={configured ? 'green' : 'pink'}>
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{meta.icon}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-extrabold">{p.name}</p>
                    <p className="text-xs text-muted">{meta.role}</p>
                    <p className="mt-1 font-mono text-[10px] text-white/40">{meta.envVar}</p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-bold ${
                      configured
                        ? 'border-neon-green/50 text-neon-green'
                        : 'border-neon-pink/50 text-neon-pink'
                    }`}
                  >
                    {configured ? 'detected ✓' : 'not set ✕'}
                  </span>
                </div>
                <div className="mt-3 flex items-center gap-3">
                  <button
                    type="button"
                    disabled={test === 'testing'}
                    onClick={() => void runTest(id)}
                    className="min-h-[40px] rounded-full border border-white/15 bg-white/5 px-4 text-xs font-bold disabled:opacity-50"
                  >
                    {test === 'testing' ? 'Testing…' : 'Test connection'}
                  </button>
                  {test === 'ok' && (
                    <span className="text-xs font-bold text-neon-green">✓ {testMessages[id]}</span>
                  )}
                  {test === 'fail' && (
                    <span className="text-xs font-bold text-neon-pink">✕ {testMessages[id]}</span>
                  )}
                </div>
              </GlassCard>
            </motion.div>
          )
        })}
      </section>

      {/* Account */}
      <section className="space-y-3">
        <h2 className="text-sm font-bold text-white/80">Account</h2>
        {!isCloudEnabled ? (
          <GlassCard>
            <p className="text-sm font-bold">Local mode</p>
            <p className="mt-1 text-xs text-muted">
              Supabase is not configured (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY).
              Everything is stored on this device. Add the env vars to unlock cloud sync
              and history across devices.
            </p>
          </GlassCard>
        ) : userEmail ? (
          <GlassCard glow accent="green">
            <p className="text-sm font-bold">{userEmail}</p>
            <p className="mt-1 text-xs text-muted">Cloud sync is on — history follows you.</p>
            <div className="mt-3">
              <NeonButton
                variant="ghost"
                onClick={() => {
                  void signOut()
                  toast('Signed out', 'info')
                }}
              >
                Sign out
              </NeonButton>
            </div>
          </GlassCard>
        ) : (
          <GlassCard>
            <p className="text-sm font-bold">Sign in for cloud sync</p>
            <p className="mt-1 text-xs text-muted">
              The app works without an account — sign in to sync projects and history.
            </p>
            <div className="mt-3 flex gap-2">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@email.com"
                className="min-h-[44px] min-w-0 flex-1 rounded-full border border-white/10 bg-white/5 px-4 text-sm outline-none placeholder:text-white/25 focus:border-neon-blue/50"
              />
              <NeonButton accent="blue" disabled={authBusy} onClick={() => void sendMagicLink()}>
                {authBusy ? 'Sending…' : 'Send link'}
              </NeonButton>
            </div>
          </GlassCard>
        )}
      </section>

      <p className="pt-2 text-center text-[11px] text-white/30">
        AI Byte Studio · PWA · v1.0.0
      </p>
    </div>
  )
}
