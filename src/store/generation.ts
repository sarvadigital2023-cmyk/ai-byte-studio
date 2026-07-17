import { create } from 'zustand'
import type { GenerationStep } from '@/types'
import { CancelledError } from '@/services/providers/mock'

/**
 * Generic pipeline runner behind the full-screen generation overlay.
 * Steps run sequentially; a failed step can be retried on its own
 * without restarting the whole pipeline.
 */

export interface StepDef {
  id: string
  label: string
  run: (signal: AbortSignal) => Promise<void>
}

export type OverlayStatus = 'idle' | 'running' | 'error' | 'done' | 'cancelled'

interface GenerationState {
  status: OverlayStatus
  title: string
  accent: 'blue' | 'pink' | 'green'
  steps: GenerationStep[]
  current: number
  /** Set by the final step of video pipelines; ResultPage opens this job. */
  resultJobId: string | null
  start: (opts: {
    title: string
    accent?: 'blue' | 'pink' | 'green'
    steps: StepDef[]
    onDone?: () => void
  }) => void
  retryStep: () => void
  cancel: () => void
  dismiss: () => void
  setResultJobId: (id: string) => void
}

let defs: StepDef[] = []
let controller: AbortController | null = null
let onDoneCb: (() => void) | undefined

export const useGenerationStore = create<GenerationState>((set, get) => {
  async function runFrom(index: number): Promise<void> {
    for (let i = index; i < defs.length; i++) {
      if (get().status !== 'running') return
      set((s) => ({
        current: i,
        steps: s.steps.map((st, j) =>
          j === i ? { ...st, status: 'active', errorMessage: undefined } : st,
        ),
      }))
      try {
        await defs[i].run(controller!.signal)
      } catch (err) {
        if (err instanceof CancelledError || get().status === 'cancelled') return
        const message = err instanceof Error ? err.message : 'Step failed'
        set((s) => ({
          status: 'error',
          steps: s.steps.map((st, j) =>
            j === i ? { ...st, status: 'error', errorMessage: message } : st,
          ),
        }))
        return
      }
      set((s) => ({
        steps: s.steps.map((st, j) => (j === i ? { ...st, status: 'done' } : st)),
      }))
    }
    set({ status: 'done' })
    onDoneCb?.()
  }

  return {
    status: 'idle',
    title: '',
    accent: 'blue',
    steps: [],
    current: 0,
    resultJobId: null,

    start: ({ title, accent = 'blue', steps, onDone }) => {
      defs = steps
      onDoneCb = onDone
      controller = new AbortController()
      set({
        status: 'running',
        title,
        accent,
        current: 0,
        resultJobId: null,
        steps: steps.map((s) => ({ id: s.id, label: s.label, status: 'pending' })),
      })
      void runFrom(0)
    },

    retryStep: () => {
      if (get().status !== 'error') return
      controller = new AbortController()
      set({ status: 'running' })
      void runFrom(get().current)
    },

    cancel: () => {
      controller?.abort()
      set({ status: 'cancelled' })
    },

    dismiss: () => set({ status: 'idle', steps: [], resultJobId: null }),

    setResultJobId: (id) => set({ resultJobId: id }),
  }
})
