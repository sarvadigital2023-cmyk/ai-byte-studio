import { motion } from 'framer-motion'
import type { ReactNode } from 'react'
import { NeonButton } from './NeonButton'
import type { Accent } from '@/utils/accent'

interface EmptyStateProps {
  icon: ReactNode
  title: string
  hint: string
  ctaLabel?: string
  onCta?: () => void
  accent?: Accent
}

export function EmptyState({ icon, title, hint, ctaLabel, onCta, accent = 'blue' }: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 260, damping: 26 }}
      className="flex flex-col items-center gap-3 py-14 text-center"
    >
      <div className="text-5xl">{icon}</div>
      <h3 className="text-lg font-bold">{title}</h3>
      <p className="max-w-[260px] text-sm text-muted">{hint}</p>
      {ctaLabel && onCta && (
        <div className="mt-3">
          <NeonButton accent={accent} onClick={onCta}>
            {ctaLabel}
          </NeonButton>
        </div>
      )}
    </motion.div>
  )
}
