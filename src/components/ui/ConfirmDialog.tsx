import { AnimatePresence, motion } from 'framer-motion'
import { NeonButton } from './NeonButton'
import { useT } from '@/i18n'

interface ConfirmDialogProps {
  open: boolean
  title: string
  message: string
  confirmLabel?: string
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const t = useT()
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[70] flex items-end justify-center bg-black/70 backdrop-blur-sm p-4 pb-10"
          onClick={onCancel}
        >
          <motion.div
            initial={{ y: 60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 60, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 340, damping: 30 }}
            className="glass glass-glow-pink w-full max-w-sm p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold">{title}</h3>
            <p className="mt-1.5 text-sm text-muted">{message}</p>
            <div className="mt-5 flex gap-3">
              <NeonButton variant="ghost" fullWidth onClick={onCancel}>
                {t.common.cancel}
              </NeonButton>
              <NeonButton accent="pink" fullWidth onClick={onConfirm}>
                {confirmLabel ?? t.common.delete}
              </NeonButton>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
