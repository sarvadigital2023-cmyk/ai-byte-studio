import { create } from 'zustand'
import { uid } from '@/types'

export type ToastTone = 'info' | 'success' | 'warning' | 'error'

export interface Toast {
  id: string
  message: string
  tone: ToastTone
  /** Optional secondary line (e.g. a setup hint). */
  hint?: string
  /** Optional action rendered as a button inside the toast. */
  action?: { label: string; onClick: () => void }
}

interface ToastState {
  toasts: Toast[]
  push: (t: Omit<Toast, 'id'> & { durationMs?: number }) => string
  dismiss: (id: string) => void
}

export const useToastStore = create<ToastState>((set, get) => ({
  toasts: [],
  push: ({ durationMs = 4000, ...t }) => {
    const id = uid()
    set((s) => ({ toasts: [...s.toasts.slice(-3), { ...t, id }] }))
    if (durationMs > 0) {
      setTimeout(() => get().dismiss(id), durationMs)
    }
    return id
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}))

export function toast(
  message: string,
  tone: ToastTone = 'info',
  opts?: { hint?: string; durationMs?: number; action?: Toast['action'] },
): void {
  useToastStore.getState().push({ message, tone, ...opts })
}

/** Error shown when a required provider API key is missing from the environment. */
export function toastMissingKey(providerName: string): void {
  toast(`${providerName} key is not configured`, 'error', {
    hint: 'Add it in Vercel → Project Settings → Environment Variables, then redeploy.',
    durationMs: 6000,
  })
}
