import { motion } from 'framer-motion'
import { ACCENT, type Accent } from '@/utils/accent'

interface SegmentedControlProps<T extends string> {
  options: { value: T; label: string }[]
  value: T
  onChange: (value: T) => void
  accent?: Accent
  /** Unique id for the sliding indicator's layout animation. */
  layoutId: string
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  accent = 'blue',
  layoutId,
}: SegmentedControlProps<T>) {
  const a = ACCENT[accent]
  return (
    <div className="glass flex rounded-full p-1">
      {options.map((opt) => {
        const active = opt.value === value
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={`relative min-h-[44px] flex-1 rounded-full text-sm font-bold transition-colors ${
              active ? a.text : 'text-white/60'
            }`}
          >
            {active && (
              <motion.span
                layoutId={layoutId}
                transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                className={`absolute inset-0 rounded-full border ${a.border} ${a.bg} ${a.shadow}`}
              />
            )}
            <span className="relative z-10">{opt.label}</span>
          </button>
        )
      })}
    </div>
  )
}
