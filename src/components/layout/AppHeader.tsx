import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useSettingsStore } from '@/store/settings'
import { onSyncChange } from '@/services/history'
import { isCloudEnabled } from '@/services/supabase'
import { useT } from '@/i18n'

/** Top header: brand, active video provider badge, sync indicator, settings. */
export function AppHeader() {
  const videoProvider = useSettingsStore((s) => s.videoProvider)
  const t = useT()
  const [syncing, setSyncing] = useState(false)

  useEffect(() => onSyncChange(setSyncing), [])

  return (
    <header
      className="fixed inset-x-0 top-0 z-40 mx-auto max-w-[480px]"
      style={{ paddingTop: 'env(safe-area-inset-top)' }}
    >
      <div className="flex items-center justify-between bg-gradient-to-b from-ink via-ink/80 to-transparent px-4 py-3">
        <Link to="/solo" className="text-lg font-extrabold tracking-tight">
          <span className="neon-text">AI Byte</span>{' '}
          <span className="text-white/90">Studio</span>
        </Link>
        <div className="flex items-center gap-2">
          {isCloudEnabled() && (
            <span
              title={syncing ? t.header.syncing : t.header.synced}
              className={`h-2 w-2 rounded-full transition-colors ${
                syncing ? 'animate-pulse bg-neon-yellow' : 'bg-neon-green/70'
              }`}
            />
          )}
          <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-white/70">
            {videoProvider === 'heygen' ? 'HeyGen' : 'Runway'}
          </span>
          <Link
            to="/history"
            aria-label={t.header.history}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-base"
          >
            🕘
          </Link>
          <Link
            to="/settings"
            aria-label={t.header.settings}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-base"
          >
            ⚙️
          </Link>
        </div>
      </div>
    </header>
  )
}
