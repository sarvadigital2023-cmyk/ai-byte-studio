import { motion } from 'framer-motion'
import type { ReactNode } from 'react'
import { ACCENT, type Accent } from '@/utils/accent'

interface NeonButtonProps {
  children: ReactNode
  onClick?: () => void
  accent?: Accent
  variant?: 'primary' | 'ghost'
  disabled?: boolean
  /** Explains *why* the button is disabled — shown as a caption under it. */
  disabledReason?: string
  className?: string
  fullWidth?: boolean
  type?: 'button' | 'submit'
}

export function NeonButton({
  children,
  onClick,
  accent = 'blue',
  variant = 'primary',
  disabled = false,
  disabledReason,
  className = '',
  fullWidth = false,
  type = 'button',
}: NeonButtonProps) {
  const a = ACCENT[accent]
  const base =
    'relative min-h-[48px] px-6 rounded-full font-bold text-[15px] transition-colors select-none'
  const look =
    variant === 'primary'
      ? disabled
        ? 'bg-white/5 text-white/30 border border-white/10'
        : `${a.bg} ${a.text} border ${a.border} ${a.shadow}`
      : disabled
        ? 'text-white/30'
        : `text-white/80 border border-white/10 bg-white/5`

  return (
    <div className={fullWidth ? 'w-full' : 'inline-block'}>
      <motion.button
        type={type}
        whileTap={disabled ? undefined : { scale: 0.97 }}
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        onClick={disabled ? undefined : onClick}
        aria-disabled={disabled}
        className={`${base} ${look} ${fullWidth ? 'w-full' : ''} ${className}`}
      >
        {children}
      </motion.button>
      {disabled && disabledReason && (
        <p className="mt-1.5 text-center text-xs text-neon-yellow/80">{disabledReason}</p>
      )}
    </div>
  )
}
