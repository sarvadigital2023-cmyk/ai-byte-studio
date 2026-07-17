import { AnimatePresence, motion } from 'framer-motion'
import { useToastStore, type ToastTone } from '@/store/toasts'

const TONE_STYLES: Record<ToastTone, string> = {
  info: 'glass-glow-blue text-neon-blue',
  success: 'glass-glow-green text-neon-green',
  warning: 'glass-glow-yellow text-neon-yellow',
  error: 'glass-glow-pink text-neon-pink',
}

const TONE_ICON: Record<ToastTone, string> = {
  info: 'ℹ️',
  success: '✓',
  warning: '⚠️',
  error: '✕',
}

/** Toast stack rendered above the tab bar. */
export function ToastHost() {
  const { toasts, dismiss } = useToastStore()
  return (
    <div
      className="pointer-events-none fixed inset-x-0 z-[60] flex flex-col items-center gap-2 px-4"
      style={{ bottom: 'calc(env(safe-area-inset-bottom) + 88px)' }}
    >
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            layout
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 380, damping: 30 }}
            className={`glass pointer-events-auto w-full max-w-sm px-4 py-3 ${TONE_STYLES[t.tone]}`}
            onClick={() => dismiss(t.id)}
            role="status"
          >
            <div className="flex items-start gap-2.5">
              <span className="mt-0.5 text-sm font-black">{TONE_ICON[t.tone]}</span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold">{t.message}</p>
                {t.hint && <p className="mt-0.5 text-xs text-white/60">{t.hint}</p>}
              </div>
              {t.action && (
                <button
                  type="button"
                  className="shrink-0 rounded-full border border-current px-3 py-1 text-xs font-bold"
                  onClick={(e) => {
                    e.stopPropagation()
                    t.action?.onClick()
                    dismiss(t.id)
                  }}
                >
                  {t.action.label}
                </button>
              )}
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}
