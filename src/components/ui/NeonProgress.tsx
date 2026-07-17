import { motion } from 'framer-motion'
import { ACCENT, type Accent } from '@/utils/accent'

interface NeonProgressProps {
  /** 0..1 */
  progress: number
  accent?: Accent
  /** Show the traveling glow while active. */
  active?: boolean
}

/** Animated neon progress line with a traveling glow highlight. */
export function NeonProgress({ progress, accent = 'blue', active = true }: NeonProgressProps) {
  const a = ACCENT[accent]
  return (
    <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-white/10">
      <motion.div
        className={`relative h-full rounded-full ${a.solid}`}
        style={{ boxShadow: `0 0 12px ${a.hex}` }}
        initial={false}
        animate={{ width: `${Math.max(2, progress * 100)}%` }}
        transition={{ type: 'spring', stiffness: 120, damping: 24 }}
      >
        {active && (
          <span
            className="absolute top-0 h-full w-1/5 animate-travel rounded-full"
            style={{
              background: `linear-gradient(90deg, transparent, rgba(255,255,255,0.9), transparent)`,
            }}
          />
        )}
      </motion.div>
    </div>
  )
}
