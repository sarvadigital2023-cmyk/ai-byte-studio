import { AnimatePresence, motion } from 'framer-motion'
import { useRegisterSW } from 'virtual:pwa-register/react'
import { useT } from '@/i18n'

const UPDATE_CHECK_INTERVAL_MS = 60_000

/**
 * Non-intrusive "Update available → Refresh" toast on new deployments.
 *
 * An installed iOS PWA is rarely "reloaded" from the network the way a
 * regular browser tab is — resuming it from the app switcher doesn't
 * trigger the browser's normal service-worker update check, so a fix can
 * ship and the phone keeps running an old cached bundle indefinitely.
 * registerType 'autoUpdate' (vite.config.ts) removes the need for the user
 * to tap anything once an update IS detected; polling registration.update()
 * here makes sure that detection actually happens promptly instead of
 * waiting for whatever infrequent check the platform does on its own.
 */
export function UpdateToast() {
  const t = useT()
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    immediate: true,
    onRegisteredSW(_url, registration) {
      if (!registration) return
      const check = () => void registration.update()
      const interval = setInterval(check, UPDATE_CHECK_INTERVAL_MS)
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') check()
      })
      window.addEventListener('beforeunload', () => clearInterval(interval))
    },
  })

  return (
    <AnimatePresence>
      {needRefresh && (
        <motion.div
          initial={{ y: -60, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -60, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 28 }}
          className="fixed inset-x-0 z-[65] mx-auto max-w-[480px] px-3"
          style={{ top: 'calc(env(safe-area-inset-top) + 8px)' }}
        >
          <div className="glass glass-glow-green flex items-center gap-3 px-4 py-3">
            <p className="flex-1 text-sm font-bold text-neon-green">{t.pwa.updateAvailable}</p>
            <button
              type="button"
              onClick={() => void updateServiceWorker(true)}
              className="rounded-full border border-neon-green/50 bg-neon-green/10 px-4 py-1.5 text-sm font-bold text-neon-green"
            >
              {t.pwa.refresh}
            </button>
            <button
              type="button"
              aria-label="Later"
              onClick={() => setNeedRefresh(false)}
              className="px-1 text-white/40"
            >
              ✕
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
