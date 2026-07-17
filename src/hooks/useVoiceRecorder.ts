import { useCallback, useEffect, useRef, useState } from 'react'

export type RecorderStatus =
  | 'idle'
  | 'requesting'
  | 'denied'
  | 'recording'
  | 'recorded'

const WAVEFORM_BARS = 28

/**
 * Microphone recording with a live waveform (Web Audio AnalyserNode).
 * Permission denial is surfaced as status 'denied' so the UI can explain
 * how to re-enable the mic on iOS/Android.
 */
export function useVoiceRecorder() {
  const [status, setStatus] = useState<RecorderStatus>('idle')
  const [elapsedSec, setElapsedSec] = useState(0)
  const [waveform, setWaveform] = useState<number[]>(() => Array(WAVEFORM_BARS).fill(0.05))
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [durationSec, setDurationSec] = useState(0)

  const mediaRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const audioCtxRef = useRef<AudioContext | null>(null)
  const rafRef = useRef<number>(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const startedAtRef = useRef(0)

  const cleanup = useCallback(() => {
    cancelAnimationFrame(rafRef.current)
    if (timerRef.current) clearInterval(timerRef.current)
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    void audioCtxRef.current?.close().catch(() => undefined)
    audioCtxRef.current = null
  }, [])

  useEffect(() => () => cleanup(), [cleanup])

  const start = useCallback(async () => {
    setStatus('requesting')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream

      // Live waveform via AnalyserNode
      const ctx = new AudioContext()
      audioCtxRef.current = ctx
      const source = ctx.createMediaStreamSource(stream)
      const analyser = ctx.createAnalyser()
      analyser.fftSize = 256
      source.connect(analyser)
      const data = new Uint8Array(analyser.frequencyBinCount)
      const tick = () => {
        analyser.getByteFrequencyData(data)
        const step = Math.floor(data.length / WAVEFORM_BARS)
        const bars = Array.from({ length: WAVEFORM_BARS }, (_, i) => {
          let sum = 0
          for (let j = 0; j < step; j++) sum += data[i * step + j]
          return Math.max(0.05, sum / step / 255)
        })
        setWaveform(bars)
        rafRef.current = requestAnimationFrame(tick)
      }
      rafRef.current = requestAnimationFrame(tick)

      const recorder = new MediaRecorder(stream)
      mediaRef.current = recorder
      chunksRef.current = []
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, {
          type: recorder.mimeType || 'audio/webm',
        })
        setAudioUrl((prev) => {
          if (prev) URL.revokeObjectURL(prev)
          return URL.createObjectURL(blob)
        })
        setDurationSec((Date.now() - startedAtRef.current) / 1000)
        setStatus('recorded')
        cleanup()
      }
      recorder.start()
      startedAtRef.current = Date.now()
      setElapsedSec(0)
      timerRef.current = setInterval(
        () => setElapsedSec((Date.now() - startedAtRef.current) / 1000),
        200,
      )
      setStatus('recording')
    } catch {
      cleanup()
      setStatus('denied')
    }
  }, [cleanup])

  const stop = useCallback(() => {
    if (mediaRef.current?.state === 'recording') mediaRef.current.stop()
  }, [])

  const discard = useCallback(() => {
    if (audioUrl) URL.revokeObjectURL(audioUrl)
    setAudioUrl(null)
    setDurationSec(0)
    setStatus('idle')
  }, [audioUrl])

  return { status, elapsedSec, waveform, audioUrl, durationSec, start, stop, discard }
}
