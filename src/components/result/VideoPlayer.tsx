import { useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { isMockUrl } from '@/services/providers'
import type { StudioType } from '@/types'

interface VideoPlayerProps {
  src: string
  type: StudioType
}

/**
 * Full-screen 9:16 vertical player with custom controls. Mock results
 * (mock:// URLs) render an animated neon placeholder that simulates
 * playback, so the whole flow is demoable before real APIs are wired.
 */
export function VideoPlayer({ src, type }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [playing, setPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const [muted, setMuted] = useState(false)

  if (isMockUrl(src)) {
    return <MockPlayback type={type} />
  }

  const toggle = () => {
    const v = videoRef.current
    if (!v) return
    if (v.paused) {
      void v.play()
      setPlaying(true)
    } else {
      v.pause()
      setPlaying(false)
    }
  }

  return (
    <div className="relative aspect-[9/16] w-full overflow-hidden rounded-2xl border border-white/10 bg-black">
      <video
        ref={videoRef}
        src={src}
        playsInline
        muted={muted}
        className="h-full w-full object-cover"
        onTimeUpdate={(e) => {
          const v = e.currentTarget
          setProgress(v.duration ? v.currentTime / v.duration : 0)
        }}
        onEnded={() => setPlaying(false)}
        onClick={toggle}
      />
      {!playing && (
        <button
          type="button"
          onClick={toggle}
          aria-label="Play"
          className="absolute inset-0 flex items-center justify-center"
        >
          <span className="flex h-16 w-16 items-center justify-center rounded-full border border-neon-blue/60 bg-ink/60 text-2xl text-neon-blue shadow-glow-blue backdrop-blur">
            ▶
          </span>
        </button>
      )}
      <div className="absolute inset-x-0 bottom-0 flex items-center gap-3 bg-gradient-to-t from-black/80 to-transparent p-3">
        <div className="h-1 flex-1 overflow-hidden rounded-full bg-white/20">
          <div
            className="h-full rounded-full bg-neon-blue"
            style={{ width: `${progress * 100}%` }}
          />
        </div>
        <button
          type="button"
          onClick={() => setMuted((m) => !m)}
          aria-label={muted ? 'Unmute' : 'Mute'}
          className="text-sm"
        >
          {muted ? '🔇' : '🔊'}
        </button>
      </div>
    </div>
  )
}

const MOCK_SCENES: Record<StudioType, { emoji: string; from: string; to: string }> = {
  solo: { emoji: '👤', from: 'rgba(0,212,255,0.35)', to: 'rgba(255,45,149,0.25)' },
  cinema: { emoji: '🎬', from: 'rgba(255,45,149,0.35)', to: 'rgba(0,212,255,0.25)' },
  cartoon: { emoji: '🎨', from: 'rgba(57,255,136,0.35)', to: 'rgba(0,212,255,0.25)' },
}

function MockPlayback({ type }: { type: StudioType }) {
  const [playing, setPlaying] = useState(false)
  const scene = MOCK_SCENES[type]
  return (
    <button
      type="button"
      onClick={() => setPlaying((p) => !p)}
      aria-label={playing ? 'Pause preview' : 'Play preview'}
      className="relative block aspect-[9/16] w-full overflow-hidden rounded-2xl border border-white/10"
      style={{
        background: `linear-gradient(160deg, ${scene.from}, #050508 45%, ${scene.to})`,
      }}
    >
      <motion.span
        animate={
          playing
            ? { scale: [1, 1.08, 1], rotate: [0, 2, -2, 0] }
            : { scale: 1, rotate: 0 }
        }
        transition={playing ? { repeat: Infinity, duration: 2.4 } : undefined}
        className="absolute inset-0 flex items-center justify-center text-7xl"
      >
        {scene.emoji}
      </motion.span>
      <span className="absolute left-3 top-3 rounded-full border border-neon-yellow/50 bg-ink/70 px-2.5 py-1 text-[10px] font-bold text-neon-yellow backdrop-blur">
        DEMO PREVIEW
      </span>
      {!playing && (
        <span className="absolute inset-0 flex items-center justify-center">
          <span className="flex h-16 w-16 items-center justify-center rounded-full border border-white/30 bg-ink/60 text-2xl backdrop-blur">
            ▶
          </span>
        </span>
      )}
      {playing && (
        <span className="absolute inset-x-0 bottom-0 p-3">
          <span className="block h-1 w-full overflow-hidden rounded-full bg-white/20">
            <motion.span
              className="block h-full rounded-full bg-neon-blue"
              initial={{ width: '0%' }}
              animate={{ width: '100%' }}
              transition={{ duration: 12, ease: 'linear', repeat: Infinity }}
            />
          </span>
        </span>
      )}
    </button>
  )
}
