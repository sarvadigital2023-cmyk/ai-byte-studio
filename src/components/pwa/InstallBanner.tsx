import { AnimatePresence, motion } from 'framer-motion'
import { useInstallPrompt } from '@/hooks/useInstallPrompt'

/** Branded Android install banner replacing the system default prompt. */
export function InstallBanner() {
  const { canInstall, install, dismiss } = useInstallPrompt()
  return (
    <AnimatePresence>
      {canInstall && (
        <motion.div
          initial={{ y: -80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -80, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 28 }}
          className="fixed inset-x-0 z-50 mx-auto max-w-[480px] px-3"
          style={{ top: 'calc(env(safe-area-inset-top) + 64px)' }}
        >
          <div className="glass glass-glow-blue flex items-center gap-3 p-3">
            <img src="/icons/icon-192.png" alt="" className="h-11 w-11 rounded-xl" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold">Install AI Byte Studio</p>
              <p className="text-xs text-muted">Full-screen app, right on your home screen</p>
            </div>
            <button
              type="button"
              onClick={install}
              className="shrink-0 rounded-full border border-neon-blue/50 bg-neon-blue/10 px-4 py-2 text-sm font-bold text-neon-blue shadow-glow-blue"
            >
              Install
            </button>
            <button
              type="button"
              onClick={dismiss}
              aria-label="Dismiss"
              className="shrink-0 px-1 text-white/40"
            >
              ✕
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
