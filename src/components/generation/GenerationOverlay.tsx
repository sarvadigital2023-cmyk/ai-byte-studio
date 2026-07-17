import { useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { useGenerationStore } from '@/store/generation'
import { NeonProgress } from '@/components/ui/NeonProgress'
import { NeonButton } from '@/components/ui/NeonButton'
import { ACCENT } from '@/utils/accent'
import { useT } from '@/i18n'

/**
 * Full-screen generation overlay: step-by-step statuses, neon progress bar,
 * cancel and per-step retry. Navigates to /result/:id when a video job
 * finishes.
 */
export function GenerationOverlay() {
  const gen = useGenerationStore()
  const navigate = useNavigate()
  const t = useT()
  const a = ACCENT[gen.accent]

  const visible = gen.status === 'running' || gen.status === 'error' || gen.status === 'done'
  const doneCount = gen.steps.filter((s) => s.status === 'done').length
  const progress = gen.steps.length
    ? (doneCount + (gen.status === 'running' ? 0.4 : 0)) / gen.steps.length
    : 0
  const failedStep = gen.steps.find((s) => s.status === 'error')

  // When a video pipeline produced a job, open its result screen.
  useEffect(() => {
    if (gen.status === 'done') {
      const jobId = gen.resultJobId
      const t = setTimeout(() => {
        gen.dismiss()
        if (jobId) navigate(`/result/${jobId}`)
      }, 900)
      return () => clearTimeout(t)
    }
  }, [gen.status]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[55] flex flex-col justify-center bg-ink/95 backdrop-blur-xl px-6"
        >
          <div className="mx-auto w-full max-w-sm">
            <motion.h2
              initial={{ y: 12, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className={`text-center text-xl font-extrabold ${a.text}`}
            >
              {gen.status === 'done' ? t.gen.done : gen.title}
            </motion.h2>

            <div className="mt-6">
              <NeonProgress
                progress={gen.status === 'done' ? 1 : progress}
                accent={gen.accent}
                active={gen.status === 'running'}
              />
            </div>

            <ul className="mt-8 space-y-4">
              {gen.steps.map((step, i) => (
                <motion.li
                  key={step.id}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.06, type: 'spring', stiffness: 300, damping: 26 }}
                  className="flex items-start gap-3"
                >
                  <span
                    className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs font-black ${
                      step.status === 'done'
                        ? 'border-neon-green/60 bg-neon-green/10 text-neon-green'
                        : step.status === 'active'
                          ? `${a.border} ${a.bg} ${a.text}`
                          : step.status === 'error'
                            ? 'border-neon-pink/60 bg-neon-pink/10 text-neon-pink'
                            : 'border-white/15 text-white/30'
                    }`}
                  >
                    {step.status === 'done' ? '✓' : step.status === 'error' ? '✕' : i + 1}
                  </span>
                  <div className="min-w-0">
                    <p
                      className={`text-sm font-semibold ${
                        step.status === 'active'
                          ? a.text
                          : step.status === 'done'
                            ? 'text-white/85'
                            : step.status === 'error'
                              ? 'text-neon-pink'
                              : 'text-white/40'
                      }`}
                    >
                      {step.label}
                      {step.status === 'active' && <span className="animate-pulse">…</span>}
                    </p>
                    {step.status === 'error' && step.errorMessage && (
                      <p className="mt-1 text-xs text-neon-pink/80">{step.errorMessage}</p>
                    )}
                  </div>
                </motion.li>
              ))}
            </ul>

            <div className="mt-10 flex flex-col items-center gap-3">
              {gen.status === 'error' && failedStep && (
                <NeonButton accent={gen.accent} fullWidth onClick={gen.retryStep}>
                  {t.gen.retryStep}
                </NeonButton>
              )}
              {gen.status !== 'done' && (
                <button
                  type="button"
                  onClick={() => {
                    gen.cancel()
                    gen.dismiss()
                  }}
                  className="min-h-[44px] px-6 text-sm font-bold text-white/50"
                >
                  {t.common.cancel}
                </button>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
