import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import type { GenerationJob, ShareKitEntry, SharePlatform } from '@/types'
import { SHARE_PLATFORMS } from '@/types'
import { generateShareKit } from '@/services/shareKit'
import { saveJob } from '@/services/history'
import { copyText } from '@/utils/clipboard'
import { toast } from '@/store/toasts'
import { Chip } from '@/components/ui/Chip'

interface ShareKitSectionProps {
  job: GenerationJob
  onJobUpdate: (job: GenerationJob) => void
}

/**
 * Ready-to-publish content per platform: editable title / description /
 * hashtags with one-tap copy. Edits persist to history (and Supabase).
 */
export function ShareKitSection({ job, onJobUpdate }: ShareKitSectionProps) {
  const [selected, setSelected] = useState<SharePlatform[]>(['tiktok'])

  const togglePlatform = (id: SharePlatform) => {
    setSelected((s) => (s.includes(id) ? s.filter((p) => p !== id) : [...s, id]))
  }

  const updateEntry = (platform: SharePlatform, patch: Partial<ShareKitEntry>) => {
    const entry = job.shareKit[platform]
    if (!entry) return
    const updated: GenerationJob = {
      ...job,
      shareKit: { ...job.shareKit, [platform]: { ...entry, ...patch } },
    }
    onJobUpdate(updated)
    saveJob(updated)
  }

  const regenerate = () => {
    const updated: GenerationJob = { ...job, shareKit: generateShareKit(job.type, job.title) }
    onJobUpdate(updated)
    saveJob(updated)
    toast('Share texts regenerated', 'success')
  }

  return (
    <section className="pb-8">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-base font-extrabold">Share Kit</h2>
        <button
          type="button"
          onClick={regenerate}
          className="rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-bold text-white/80"
        >
          ↻ Regenerate texts
        </button>
      </div>

      <div data-swipe-ignore className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-3">
        {SHARE_PLATFORMS.map((p) => (
          <Chip
            key={p.id}
            label={p.label}
            accent="blue"
            active={selected.includes(p.id)}
            onClick={() => togglePlatform(p.id)}
          />
        ))}
      </div>

      <AnimatePresence>
        {selected.map((platform) => {
          const entry = job.shareKit[platform]
          if (!entry) return null
          const label = SHARE_PLATFORMS.find((p) => p.id === platform)?.label ?? platform
          return (
            <motion.div
              key={platform}
              layout
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ type: 'spring', stiffness: 300, damping: 28 }}
              className="glass mb-3 p-4"
            >
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-sm font-extrabold text-neon-blue">{label}</h3>
                <CopyButton
                  label="Copy all"
                  text={`${entry.title}\n\n${entry.description}\n\n${entry.hashtags}`}
                />
              </div>
              <EditableBlock
                label="Title"
                value={entry.title}
                rows={2}
                onChange={(v) => updateEntry(platform, { title: v })}
              />
              <EditableBlock
                label="Description"
                value={entry.description}
                rows={4}
                onChange={(v) => updateEntry(platform, { description: v })}
              />
              <EditableBlock
                label="Hashtags"
                value={entry.hashtags}
                rows={2}
                onChange={(v) => updateEntry(platform, { hashtags: v })}
              />
            </motion.div>
          )
        })}
      </AnimatePresence>
    </section>
  )
}

function EditableBlock({
  label,
  value,
  rows,
  onChange,
}: {
  label: string
  value: string
  rows: number
  onChange: (v: string) => void
}) {
  return (
    <div className="mb-3 last:mb-0">
      <div className="mb-1 flex items-center justify-between">
        <span className="text-[11px] font-bold uppercase tracking-wide text-muted">{label}</span>
        <CopyButton text={value} />
      </div>
      <textarea
        value={value}
        rows={rows}
        onChange={(e) => onChange(e.target.value)}
        className="w-full resize-none rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs leading-relaxed outline-none focus:border-white/25"
      />
    </div>
  )
}

function CopyButton({ text, label = 'Copy' }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.94 }}
      onClick={async () => {
        const ok = await copyText(text)
        if (ok) {
          setCopied(true)
          toast('Copied to clipboard', 'success', { durationMs: 1500 })
          setTimeout(() => setCopied(false), 1800)
        } else {
          toast('Copy failed', 'error')
        }
      }}
      className={`rounded-full border px-3 py-1 text-[11px] font-bold transition-colors ${
        copied
          ? 'border-neon-green/60 bg-neon-green/10 text-neon-green'
          : 'border-white/15 bg-white/5 text-white/70'
      }`}
    >
      {copied ? '✓ Copied' : label}
    </motion.button>
  )
}
