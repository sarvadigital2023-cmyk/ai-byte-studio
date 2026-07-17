import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import type { GenerationJob } from '@/types'
import { getJob } from '@/services/history'
import { toast } from '@/store/toasts'
import { VideoPlayer } from '@/components/result/VideoPlayer'
import { ShareKitSection } from '@/components/result/ShareKitSection'
import { NeonButton } from '@/components/ui/NeonButton'
import { EmptyState } from '@/components/ui/EmptyState'
import { formatDate } from '@/utils/format'
import { useT } from '@/i18n'

/** Result screen: vertical 9:16 video + download / regenerate + Share Kit. */
export function ResultPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const t = useT()
  const [job, setJob] = useState<GenerationJob | null | undefined>(undefined)

  useEffect(() => {
    setJob(id ? (getJob(id) ?? null) : null)
  }, [id])

  if (job === undefined) return null

  if (job === null) {
    return (
      <EmptyState
        icon="🔍"
        title={t.result.notFoundTitle}
        hint={t.result.notFoundHint}
        ctaLabel={t.result.openHistory}
        onCta={() => navigate('/history')}
      />
    )
  }

  const download = () => {
    if (!job.resultUrl) {
      toast(t.result.noVideoFile, 'error')
      return
    }
    const a = document.createElement('a')
    a.href = job.resultUrl
    a.download = `${job.title.replace(/\s+/g, '-').toLowerCase()}.mp4`
    a.rel = 'noopener'
    a.target = '_blank'
    a.click()
  }

  // A faithful regeneration needs the source project (characters, script),
  // which lives in the studio stores — reopen the studio and re-run there.
  const regenerate = () => {
    toast(t.result.reopened, 'info')
    navigate(`/${job.type}`)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 280, damping: 26 }}
      className="space-y-5"
    >
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-extrabold">{job.title}</h1>
          <p className="text-xs text-muted">
            {formatDate(job.createdAt)} · {job.provider === 'heygen' ? 'HeyGen' : 'Runway'}
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5"
          aria-label={t.common.back}
        >
          ←
        </button>
      </div>

      {job.resultUrl && <VideoPlayer src={job.resultUrl} />}

      <div className="flex gap-3">
        <NeonButton accent="blue" fullWidth onClick={download}>
          {t.result.download}
        </NeonButton>
        <NeonButton accent="pink" variant="ghost" fullWidth onClick={regenerate}>
          {t.result.regenerate}
        </NeonButton>
      </div>

      <ShareKitSection job={job} onJobUpdate={setJob} />
    </motion.div>
  )
}
