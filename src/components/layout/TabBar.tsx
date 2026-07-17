import { motion } from 'framer-motion'
import { useLocation, useNavigate } from 'react-router-dom'
import { TAB_ACCENT, TAB_ORDER, type StudioType } from '@/types'
import { ACCENT } from '@/utils/accent'

const TAB_META: Record<StudioType, { label: string; icon: string }> = {
  solo: { label: 'Solo Avatar', icon: '👤' },
  cinema: { label: 'Cinema Studio', icon: '🎬' },
  cartoon: { label: 'Cartoon Studio', icon: '🎨' },
}

/** Fixed bottom tab bar with a neon indicator that slides between tabs. */
export function TabBar() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const active = TAB_ORDER.find((t) => pathname.startsWith(`/${t}`))

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 mx-auto max-w-[480px]"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="glass mx-3 mb-2 flex rounded-3xl border-white/10 px-1 py-1">
        {TAB_ORDER.map((tab) => {
          const a = ACCENT[TAB_ACCENT[tab]]
          const isActive = tab === active
          return (
            <button
              key={tab}
              type="button"
              onClick={() => navigate(`/${tab}`)}
              className="relative min-h-[56px] flex-1 rounded-2xl"
              aria-current={isActive ? 'page' : undefined}
            >
              {isActive && (
                <motion.span
                  layoutId="tab-indicator"
                  transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                  className={`absolute inset-0 rounded-2xl border ${a.border} ${a.bg} ${a.shadow}`}
                />
              )}
              <span
                className={`relative z-10 flex flex-col items-center gap-0.5 text-[11px] font-bold ${
                  isActive ? a.text : 'text-white/50'
                }`}
              >
                <span className="text-lg leading-none">{TAB_META[tab].icon}</span>
                {TAB_META[tab].label}
              </span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
