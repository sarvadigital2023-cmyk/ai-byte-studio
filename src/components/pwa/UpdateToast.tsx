import { AnimatePresence, motion } from 'framer-motion'
import { useRegisterSW } from 'virtual:pwa-register/react'

/** Non-intrusive "Update available → Refresh" toast on new deployments. */
export function UpdateToast() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({ immediate: true })

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
            <p className="flex-1 text-sm font-bold text-neon-green">Update available</p>
            <button
              type="button"
              onClick={() => void updateServiceWorker(true)}
              className="rounded-full border border-neon-green/50 bg-neon-green/10 px-4 py-1.5 text-sm font-bold text-neon-green"
            >
              Refresh
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
