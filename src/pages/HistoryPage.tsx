import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import type { GenerationJob, StudioType } from '@/types'
import { deleteJob, listLocalJobs, refreshFromCloud } from '@/services/history'
import { isCloudEnabled } from '@/services/supabase'
import { EmptyState } from '@/components/ui/EmptyState'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { formatDate } from '@/utils/format'
import { useT, fmt } from '@/i18n'

const TYPE_STYLE: Record<StudioType, { cls: string; emoji: string }> = {
  solo: { cls: 'border-neon-blue/50 text-neon-blue', emoji: '👤' },
  cinema: { cls: 'border-neon-pink/50 text-neon-pink', emoji: '🎬' },
  cartoon: { cls: 'border-neon-green/50 text-neon-green', emoji: '🎨' },
}

/** Generation history with pull-to-refresh (cloud merge) and delete. */
export function HistoryPage() {
  const navigate = useNavigate()
  const t = useT()
  const typeLabel: Record<StudioType, string> = {
    solo: t.history.badgeSolo,
    cinema: t.history.badgeCinema,
    cartoon: t.history.badgeCartoon,
  }
  const [jobs, setJobs] = useState<GenerationJob[]>(() => listLocalJobs())
  const [refreshing, setRefreshing] = useState(false)
  const [toDelete, setToDelete] = useState<GenerationJob | null>(null)
  const [pull, setPull] = useState(0)
  const startY = useRef<number | null>(null)

  const refresh = async () => {
    setRefreshing(true)
    try {
      setJobs(await refreshFromCloud())
    } finally {
      setRefreshing(false)
    }
  }

  useEffect(() => {
    if (isCloudEnabled()) void refresh()
  }, [])

  return (
    <div
      className="min-h-[60vh]"
      onTouchStart={(e) => {
        if (window.scrollY <= 0) startY.current = e.touches[0].clientY
      }}
      onTouchMove={(e) => {
        if (startY.current === null) return
        const dy = e.touches[0].clientY - startY.current
        setPull(Math.max(0, Math.min(90, dy * 0.5)))
      }}
      onTouchEnd={() => {
        if (pull > 55 && !refreshing) void refresh()
        setPull(0)
        startY.current = null
      }}
    >
      <motion.div
        animate={{ height: refreshing ? 44 : pull }}
        className="flex items-end justify-center overflow-hidden"
      >
        <span className={`pb-2 text-xs font-bold text-neon-blue ${refreshing ? 'animate-pulse' : ''}`}>
          {refreshing ? t.history.refreshing : pull > 55 ? t.history.release : t.history.pull}
        </span>
      </motion.div>

      <h1 className="mb-4 text-lg font-extrabold">{t.history.title}</h1>

      {jobs.length === 0 ? (
        <EmptyState
          icon="🎞"
          title={t.history.emptyTitle}
          hint={t.history.emptyHint}
          ctaLabel={t.history.emptyCta}
          onCta={() => navigate('/solo')}
        />
      ) : (
        <ul className="space-y-3 pb-6">
          <AnimatePresence>
            {jobs.map((job, i) => {
              const badge = TYPE_STYLE[job.type]
              return (
                <motion.li
                  key={job.id}
                  layout
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -30 }}
                  transition={{ delay: i * 0.04, type: 'spring', stiffness: 300, damping: 28 }}
                >
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => navigate(`/result/${job.id}`)}
                    onKeyDown={(e) => e.key === 'Enter' && navigate(`/result/${job.id}`)}
                    className="glass flex cursor-pointer items-center gap-3 p-3"
                  >
                    {/* thumbnail */}
                    <div
                      className={`flex h-16 w-12 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-gradient-to-br from-white/10 to-transparent text-xl`}
                    >
                      {badge.emoji}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold">{job.title}</p>
                      <p className="mt-0.5 text-xs text-muted">{formatDate(job.createdAt)}</p>
                      <div className="mt-1.5 flex items-center gap-2">
                        <span
                          className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${badge.cls}`}
                        >
                          {typeLabel[job.type]}
                        </span>
                        <span
                          className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${
                            job.status === 'done'
                              ? 'border-neon-green/50 text-neon-green'
                              : 'border-neon-yellow/50 text-neon-yellow'
                          }`}
                        >
                          {job.status === 'done' ? t.history.ready : job.status}
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      aria-label={t.common.delete}
                      onClick={(e) => {
                        e.stopPropagation()
                        setToDelete(job)
                      }}
                      className="shrink-0 px-2 py-3 text-white/40"
                    >
                      🗑
                    </button>
                  </div>
                </motion.li>
              )
            })}
          </AnimatePresence>
        </ul>
      )}

      <ConfirmDialog
        open={!!toDelete}
        title={t.history.deleteTitle}
        message={fmt(t.history.deleteMessage, { title: toDelete?.title ?? '' })}
        onConfirm={() => {
          if (toDelete) {
            deleteJob(toDelete.id)
            setJobs((js) => js.filter((j) => j.id !== toDelete.id))
          }
          setToDelete(null)
        }}
        onCancel={() => setToDelete(null)}
      />
    </div>
  )
}
