import { useRef, useState } from 'react'

interface VideoPlayerProps {
  src: string
}

/** Full-screen 9:16 vertical player with custom controls. */
export function VideoPlayer({ src }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [playing, setPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const [muted, setMuted] = useState(false)

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

  const seek = (e: React.MouseEvent<HTMLDivElement>) => {
    const v = videoRef.current
    if (!v || !v.duration) return
    const rect = e.currentTarget.getBoundingClientRect()
    v.currentTime = ((e.clientX - rect.left) / rect.width) * v.duration
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
        <div
          className="h-2 flex-1 cursor-pointer overflow-hidden rounded-full bg-white/20"
          onClick={seek}
          role="slider"
          aria-label="Seek"
          aria-valuenow={Math.round(progress * 100)}
        >
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
