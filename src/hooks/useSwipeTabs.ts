import { useRef, type TouchEvent } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { TAB_ORDER } from '@/types'

const SWIPE_THRESHOLD_PX = 64
const VERTICAL_TOLERANCE_PX = 48

/**
 * TikTok-style horizontal tab switching: swiping left/right on the content
 * navigates to the adjacent studio tab.
 */
export function useSwipeTabs() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const startX = useRef(0)
  const startY = useRef(0)
  const tracking = useRef(false)

  const currentIndex = TAB_ORDER.findIndex((t) => pathname.startsWith(`/${t}`))

  const onTouchStart = (e: TouchEvent) => {
    // Ignore swipes starting on horizontally scrollable UI (carousels, chips)
    if ((e.target as HTMLElement).closest('[data-swipe-ignore]')) {
      tracking.current = false
      return
    }
    tracking.current = true
    startX.current = e.touches[0].clientX
    startY.current = e.touches[0].clientY
  }

  const onTouchEnd = (e: TouchEvent) => {
    if (!tracking.current || currentIndex === -1) return
    tracking.current = false
    const dx = e.changedTouches[0].clientX - startX.current
    const dy = e.changedTouches[0].clientY - startY.current
    if (Math.abs(dx) < SWIPE_THRESHOLD_PX || Math.abs(dy) > VERTICAL_TOLERANCE_PX) return
    const next = currentIndex + (dx < 0 ? 1 : -1)
    if (next >= 0 && next < TAB_ORDER.length) navigate(`/${TAB_ORDER[next]}`)
  }

  return { onTouchStart, onTouchEnd }
}
