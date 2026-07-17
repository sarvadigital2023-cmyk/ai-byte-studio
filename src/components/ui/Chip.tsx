import { motion } from 'framer-motion'
import { ACCENT, type Accent } from '@/utils/accent'

interface ChipProps {
  label: string
  active?: boolean
  accent?: Accent
  onClick?: () => void
}

export function Chip({ label, active = false, accent = 'blue', onClick }: ChipProps) {
  const a = ACCENT[accent]
  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className={`min-h-[40px] shrink-0 rounded-full border px-4 text-sm font-semibold transition-colors ${
        active
          ? `${a.bg} ${a.text} ${a.border} ${a.shadow}`
          : 'border-white/10 bg-white/5 text-white/70'
      }`}
    >
      {label}
    </motion.button>
  )
}
