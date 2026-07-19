import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import type { User } from '@supabase/supabase-js'
import type { ConnectionTestState, ProviderId, VideoProviderId } from '@/types'
import { PROVIDERS, getKeyStatus, type KeyStatus } from '@/services/providers'
import {
  supabase,
  isCloudEnabled,
  signInWithMagicLink,
  signInWithGoogle,
  signOut,
} from '@/services/supabase'
import { useSettingsStore } from '@/store/settings'
import { toast } from '@/store/toasts'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { GlassCard } from '@/components/ui/GlassCard'
import { NeonButton } from '@/components/ui/NeonButton'
import { useT, LOCALES, type Locale } from '@/i18n'

const PROVIDER_ICON: Record<ProviderId, { icon: string; envVar: string }> = {
  heygen: { icon: '🎭', envVar: 'VITE_HEYGEN_API_KEY' },
  runway: { icon: '🎞', envVar: 'VITE_RUNWAY_API_KEY' },
  elevenlabs: { icon: '🎙', envVar: 'VITE_ELEVENLABS_API_KEY' },
}

interface AccountInfo {
  email: string
  name: string | null
  avatarUrl: string | null
}

/** Google OAuth populates full_name/avatar_url (or name/picture); magic-link
 * email sign-in has neither, so the UI falls back to the email address. */
function toAccountInfo(user: User | null): AccountInfo | null {
  if (!user) return null
  const meta = user.user_metadata ?? {}
  return {
    email: user.email ?? '',
    name: (meta.full_name as string | undefined) ?? (meta.name as string | undefined) ?? null,
    avatarUrl:
      (meta.avatar_url as string | undefined) ?? (meta.picture as string | undefined) ?? null,
  }
}

/** API keys status, provider connection tests, global video provider, language, account. */
export function SettingsPage() {
  const { videoProvider, setVideoProvider, locale, setLocale, hydrateFromProfile } =
    useSettingsStore()
  const t = useT()
  const [tests, setTests] = useState<Record<ProviderId, ConnectionTestState>>({
    heygen: 'idle',
    runway: 'idle',
    elevenlabs: 'idle',
  })
  const [testMessages, setTestMessages] = useState<Partial<Record<ProviderId, string>>>({})
  const [keys, setKeys] = useState<KeyStatus | null>(null)
  const [email, setEmail] = useState('')
  const [account, setAccount] = useState<AccountInfo | null>(null)
  const [authBusy, setAuthBusy] = useState(false)
  const [googleBusy, setGoogleBusy] = useState(false)

  useEffect(() => {
    void getKeyStatus(true).then(setKeys)
  }, [])

  useEffect(() => {
    if (!supabase) return
    void supabase.auth.getUser().then(({ data }) => setAccount(toAccountInfo(data.user)))
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setAccount(toAccountInfo(session?.user ?? null))
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
    else toast(t.settings.linkSent, 'success')
  }

  const continueWithGoogle = async () => {
    setGoogleBusy(true)
    const { error } = await signInWithGoogle()
    setGoogleBusy(false)
    if (error) toast(error, 'error')
  }

  return (
    <div className="space-y-6 pb-6">
      {/* Title row with the language switcher in the top-right corner */}
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-extrabold">{t.settings.title}</h1>
        <div
          role="group"
          aria-label={t.settings.language}
          className="glass flex rounded-full p-1"
        >
          {LOCALES.map((l) => {
            const active = locale === l.id
            return (
              <button
                key={l.id}
                type="button"
                onClick={() => setLocale(l.id as Locale)}
                aria-pressed={active}
                className={`min-h-[36px] rounded-full px-3.5 text-xs font-bold transition-colors ${
                  active
                    ? 'border border-neon-blue/50 bg-neon-blue/10 text-neon-blue shadow-glow-blue'
                    : 'text-white/60'
                }`}
              >
                {l.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Global video provider */}
      <section>
        <h2 className="mb-1 text-sm font-bold text-white/80">{t.settings.videoProvider}</h2>
        <p className="mb-3 text-xs text-muted">{t.settings.videoProviderHint}</p>
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
        <h2 className="text-sm font-bold text-white/80">{t.settings.apiKeys}</h2>
        <p className="text-xs text-muted">{t.settings.apiKeysHint}</p>
        {(Object.keys(PROVIDERS) as ProviderId[]).map((id, i) => {
          const p = PROVIDERS[id]
          const meta = PROVIDER_ICON[id]
          const role = id === 'elevenlabs' ? t.settings.roleVoice : t.settings.roleVideo
          const configured = keys?.[id] ?? false
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
                    <p className="text-xs text-muted">{role}</p>
                    <p className="mt-1 font-mono text-[10px] text-white/40">{meta.envVar}</p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-bold ${
                      keys === null
                        ? 'border-white/20 text-white/50'
                        : configured
                          ? 'border-neon-green/50 text-neon-green'
                          : 'border-neon-pink/50 text-neon-pink'
                    }`}
                  >
                    {keys === null
                      ? t.settings.checking
                      : configured
                        ? t.settings.detected
                        : t.settings.notSet}
                  </span>
                </div>
                <div className="mt-3 flex items-center gap-3">
                  <button
                    type="button"
                    disabled={test === 'testing'}
                    onClick={() => void runTest(id)}
                    className="min-h-[40px] rounded-full border border-white/15 bg-white/5 px-4 text-xs font-bold disabled:opacity-50"
                  >
                    {test === 'testing' ? t.settings.testing : t.settings.testConnection}
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
        <h2 className="text-sm font-bold text-white/80">{t.settings.account}</h2>
        {!isCloudEnabled ? (
          <GlassCard>
            <p className="text-sm font-bold">{t.settings.localMode}</p>
            <p className="mt-1 text-xs text-muted">{t.settings.localModeHint}</p>
          </GlassCard>
        ) : account ? (
          <GlassCard glow accent="green">
            <div className="flex items-center gap-3">
              {account.avatarUrl ? (
                <img
                  src={account.avatarUrl}
                  alt=""
                  className="h-11 w-11 shrink-0 rounded-full object-cover"
                />
              ) : (
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/10 text-base font-bold">
                  {(account.name || account.email || '?').charAt(0).toUpperCase()}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold">{account.name || account.email}</p>
                {account.name && (
                  <p className="truncate text-xs text-muted">{account.email}</p>
                )}
              </div>
            </div>
            <p className="mt-2 text-xs text-muted">{t.settings.cloudOn}</p>
            <div className="mt-3">
              <NeonButton
                variant="ghost"
                onClick={() => {
                  void signOut()
                  toast(t.settings.signedOut, 'info')
                }}
              >
                {t.settings.signOut}
              </NeonButton>
            </div>
          </GlassCard>
        ) : (
          <GlassCard>
            <p className="text-sm font-bold">{t.settings.signInTitle}</p>
            <p className="mt-1 text-xs text-muted">{t.settings.signInHint}</p>
            <NeonButton
              accent="blue"
              fullWidth
              disabled={googleBusy}
              onClick={() => void continueWithGoogle()}
            >
              {googleBusy ? t.settings.sending : t.settings.continueWithGoogle}
            </NeonButton>
            <div className="my-3 flex items-center gap-2 text-[11px] font-bold uppercase tracking-wide text-white/30">
              <span className="h-px flex-1 bg-white/10" />
              {t.settings.orEmail}
              <span className="h-px flex-1 bg-white/10" />
            </div>
            <div className="flex gap-2">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t.settings.emailPlaceholder}
                className="min-h-[44px] min-w-0 flex-1 rounded-full border border-white/10 bg-white/5 px-4 text-sm outline-none placeholder:text-white/25 focus:border-neon-blue/50"
              />
              <NeonButton accent="blue" disabled={authBusy} onClick={() => void sendMagicLink()}>
                {authBusy ? t.settings.sending : t.settings.sendLink}
              </NeonButton>
            </div>
          </GlassCard>
        )}
      </section>

      <p className="pt-2 text-center text-[11px] text-white/30">{t.settings.footer}</p>
    </div>
  )
}
