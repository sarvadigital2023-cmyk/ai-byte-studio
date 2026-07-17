import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useVoiceRecorder } from '@/hooks/useVoiceRecorder'
import { voiceProvider, PROVIDERS } from '@/services/providers'
import { toast, toastMissingKey } from '@/store/toasts'
import { formatDuration } from '@/utils/format'
import type { VoiceSample, VoiceStatus } from '@/types'
import type { Accent } from '@/utils/accent'

interface VoiceRecorderProps {
  voiceStatus: VoiceStatus
  accent?: Accent
  onVoiceChange: (status: VoiceStatus, sample?: VoiceSample) => void
}

/**
 * Shared voice recording + cloning block: record with live waveform,
 * listen back, re-record, clone via ElevenLabs.
 */
export function VoiceRecorder({ voiceStatus, onVoiceChange }: VoiceRecorderProps) {
  const rec = useVoiceRecorder()
  const [cloning, setCloning] = useState(false)

  const finishRecording = () => {
    rec.stop()
  }

  const handleClone = async () => {
    if (!rec.audioUrl) return
    if (!PROVIDERS.elevenlabs.isConfigured()) toastMissingKey('ElevenLabs')
    setCloning(true)
    try {
      await voiceProvider.cloneVoice(rec.audioUrl)
      onVoiceChange('cloned', {
        url: rec.audioUrl,
        durationSec: rec.durationSec,
        recordedAt: new Date().toISOString(),
      })
      toast('Voice cloned', 'success')
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Voice cloning failed', 'error')
    } finally {
      setCloning(false)
    }
  }

  // Permission denied — explain how to fix it
  if (rec.status === 'denied') {
    return (
      <div className="glass glass-glow-yellow p-4 text-sm">
        <p className="font-bold text-neon-yellow">Microphone access is blocked</p>
        <p className="mt-1.5 text-muted">
          iOS: Settings → Safari → Microphone → Allow.
          <br />
          Android: tap the 🔒 icon in the address bar → Permissions → Microphone.
        </p>
        <button
          type="button"
          onClick={() => void rec.start()}
          className="mt-3 min-h-[44px] rounded-full border border-white/15 bg-white/5 px-5 text-sm font-bold"
        >
          Try again
        </button>
      </div>
    )
  }

  if (rec.status === 'recording') {
    return (
      <div className="glass glass-glow-pink flex flex-col items-center gap-4 p-5">
        {/* pulsing neon ring around the stop button */}
        <div className="relative">
          <span className="absolute inset-0 rounded-full border-2 border-neon-pink animate-pulse-ring" />
          <button
            type="button"
            onClick={finishRecording}
            aria-label="Stop recording"
            className="relative flex h-16 w-16 items-center justify-center rounded-full bg-neon-pink/20 border border-neon-pink text-neon-pink shadow-glow-pink"
          >
            <span className="h-5 w-5 rounded-sm bg-neon-pink" />
          </button>
        </div>
        <p className="font-mono text-lg font-bold text-neon-pink">
          {formatDuration(rec.elapsedSec)}
        </p>
        {/* live waveform */}
        <div className="flex h-10 w-full items-end justify-center gap-[3px]">
          {rec.waveform.map((v, i) => (
            <span
              key={i}
              className="w-1.5 rounded-full bg-neon-pink"
              style={{ height: `${Math.max(8, v * 100)}%`, opacity: 0.4 + v * 0.6 }}
            />
          ))}
        </div>
        <p className="text-xs text-muted">Tap the square to stop</p>
      </div>
    )
  }

  if (rec.status === 'recorded' && rec.audioUrl) {
    return (
      <div className="glass p-4">
        <div className="flex items-center gap-3">
          <audio src={rec.audioUrl} controls className="h-10 min-w-0 flex-1" />
          <span className="shrink-0 text-xs text-muted">{formatDuration(rec.durationSec)}</span>
        </div>
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={() => {
              rec.discard()
              onVoiceChange('none')
            }}
            className="min-h-[44px] flex-1 rounded-full border border-white/15 bg-white/5 text-sm font-bold text-white/80"
          >
            Re-record
          </button>
          <motion.button
            type="button"
            whileTap={{ scale: 0.97 }}
            disabled={cloning}
            onClick={() => void handleClone()}
            className="min-h-[44px] flex-1 rounded-full border border-neon-green/50 bg-neon-green/10 text-sm font-bold text-neon-green shadow-glow-green disabled:opacity-50"
          >
            {cloning ? 'Cloning…' : '✓ Clone voice (ElevenLabs)'}
          </motion.button>
        </div>
      </div>
    )
  }

  // idle / requesting / already cloned
  return (
    <div className="flex items-center gap-3">
      <motion.button
        type="button"
        whileTap={{ scale: 0.97 }}
        onClick={() => void rec.start()}
        disabled={rec.status === 'requesting'}
        className="min-h-[48px] flex-1 rounded-full border border-neon-pink/50 bg-neon-pink/10 px-5 text-sm font-bold text-neon-pink shadow-glow-pink disabled:opacity-60"
      >
        {rec.status === 'requesting'
          ? 'Requesting mic…'
          : voiceStatus === 'cloned'
            ? '🎙 Record again'
            : '🎙 Record voice'}
      </motion.button>
      <AnimatePresence>
        {voiceStatus === 'cloned' && (
          <motion.span
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.6, opacity: 0 }}
            className="shrink-0 rounded-full border border-neon-green/50 bg-neon-green/10 px-3 py-1.5 text-xs font-bold text-neon-green"
          >
            cloned ✓
          </motion.span>
        )}
      </AnimatePresence>
    </div>
  )
}

/** Small status badge used on character cards. */
export function VoiceBadge({ status }: { status: VoiceStatus }) {
  const styles: Record<VoiceStatus, string> = {
    none: 'border-white/15 text-white/50',
    recorded: 'border-neon-yellow/50 text-neon-yellow',
    cloned: 'border-neon-green/50 text-neon-green',
  }
  const labels: Record<VoiceStatus, string> = {
    none: 'no voice',
    recorded: 'recorded',
    cloned: 'cloned ✓',
  }
  return (
    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${styles[status]}`}>
      {labels[status]}
    </span>
  )
}
