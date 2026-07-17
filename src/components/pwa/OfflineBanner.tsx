import { AnimatePresence, motion } from 'framer-motion'
import { useOnline } from '@/hooks/useOnline'

/** Branded offline notice — the app shell still works, generation doesn't. */
export function OfflineBanner() {
  const online = useOnline()
  return (
    <AnimatePresence>
      {!online && (
        <motion.div
          initial={{ y: -40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -40, opacity: 0 }}
          className="fixed inset-x-0 z-[64] mx-auto max-w-[480px] px-3"
          style={{ top: 'calc(env(safe-area-inset-top) + 8px)' }}
        >
          <div className="glass glass-glow-yellow px-4 py-2.5 text-center text-sm font-bold text-neon-yellow">
            No connection — generation is paused
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
