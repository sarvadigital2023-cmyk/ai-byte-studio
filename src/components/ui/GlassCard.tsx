import { motion } from 'framer-motion'
import type { ReactNode } from 'react'
import { ACCENT, type Accent } from '@/utils/accent'

interface GlassCardProps {
  children: ReactNode
  accent?: Accent
  /** Adds the accent-colored glow border. */
  glow?: boolean
  className?: string
  onClick?: () => void
  layout?: boolean
}

export function GlassCard({
  children,
  accent = 'blue',
  glow = false,
  className = '',
  onClick,
  layout = false,
}: GlassCardProps) {
  return (
    <motion.div
      layout={layout}
      onClick={onClick}
      whileTap={onClick ? { scale: 0.98 } : undefined}
      className={`glass p-4 ${glow ? ACCENT[accent].glass : ''} ${className}`}
    >
      {children}
    </motion.div>
  )
}
