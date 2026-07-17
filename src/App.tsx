import { useEffect, useRef } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { TAB_ORDER } from '@/types'
import { useSettingsStore } from '@/store/settings'
import { useSwipeTabs } from '@/hooks/useSwipeTabs'
import { NeonBackground } from '@/components/layout/NeonBackground'
import { AppHeader } from '@/components/layout/AppHeader'
import { TabBar } from '@/components/layout/TabBar'
import { ToastHost } from '@/components/ui/ToastHost'
import { GenerationOverlay } from '@/components/generation/GenerationOverlay'
import { InstallBanner } from '@/components/pwa/InstallBanner'
import { UpdateToast } from '@/components/pwa/UpdateToast'
import { OfflineBanner } from '@/components/pwa/OfflineBanner'
import { SoloPage } from '@/pages/SoloPage'
import { CinemaPage } from '@/pages/CinemaPage'
import { CartoonPage } from '@/pages/CartoonPage'
import { ResultPage } from '@/pages/ResultPage'
import { SettingsPage } from '@/pages/SettingsPage'
import { HistoryPage } from '@/pages/HistoryPage'

const pageVariants = {
  enter: (dir: number) => ({ x: dir > 0 ? '55%' : dir < 0 ? '-55%' : 0, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({ x: dir > 0 ? '-55%' : dir < 0 ? '55%' : 0, opacity: 0 }),
}

export default function App() {
  const location = useLocation()
  const swipe = useSwipeTabs()
  const setLastTab = useSettingsStore((s) => s.setLastTab)
  const hydrateFromProfile = useSettingsStore((s) => s.hydrateFromProfile)

  const segment = location.pathname.split('/')[1] || 'solo'
  const tabIndex = TAB_ORDER.findIndex((t) => t === segment)
  const prevIndexRef = useRef(tabIndex)
  // Direction-aware slide: only between studio tabs; other pages fade.
  const direction =
    tabIndex >= 0 && prevIndexRef.current >= 0 ? Math.sign(tabIndex - prevIndexRef.current) : 0

  useEffect(() => {
    prevIndexRef.current = tabIndex
    if (tabIndex >= 0) setLastTab(TAB_ORDER[tabIndex])
  }, [tabIndex, setLastTab])

  useEffect(() => {
    void hydrateFromProfile()
  }, [hydrateFromProfile])

  return (
    <div className="relative min-h-full">
      <NeonBackground />
      {/* Desktop: centered "phone" container with a neon halo */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-y-0 left-1/2 hidden w-full max-w-[480px] -translate-x-1/2 border-x border-white/10 lg:block"
        style={{ boxShadow: '0 0 120px -30px rgba(0,212,255,0.35), 0 0 120px -30px rgba(255,45,149,0.25)' }}
      />

      <AppHeader />

      <main
        className="relative z-10 mx-auto max-w-[480px] overflow-x-hidden px-4"
        style={{
          paddingTop: 'calc(env(safe-area-inset-top) + 72px)',
          paddingBottom: 'calc(env(safe-area-inset-bottom) + 104px)',
          minHeight: '100vh',
        }}
        onTouchStart={swipe.onTouchStart}
        onTouchEnd={swipe.onTouchEnd}
      >
        <AnimatePresence mode="popLayout" custom={direction} initial={false}>
          <motion.div
            key={segment}
            custom={direction}
            variants={pageVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ type: 'spring', stiffness: 320, damping: 32 }}
          >
            <Routes location={location}>
              <Route path="/" element={<Navigate to="/solo" replace />} />
              <Route path="/solo" element={<SoloPage />} />
              <Route path="/cinema" element={<CinemaPage />} />
              <Route path="/cartoon" element={<CartoonPage />} />
              <Route path="/result/:id" element={<ResultPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/history" element={<HistoryPage />} />
              <Route path="*" element={<Navigate to="/solo" replace />} />
            </Routes>
          </motion.div>
        </AnimatePresence>
      </main>

      <TabBar />
      <GenerationOverlay />
      <ToastHost />
      <InstallBanner />
      <UpdateToast />
      <OfflineBanner />
    </div>
  )
}
