import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import type { GenerationJob } from '@/types'
import { getJob } from '@/services/history'
import { startVideoPipeline } from '@/services/pipeline'
import { isMockUrl } from '@/services/providers'
import { toast } from '@/store/toasts'
import { VideoPlayer } from '@/components/result/VideoPlayer'
import { ShareKitSection } from '@/components/result/ShareKitSection'
import { NeonButton } from '@/components/ui/NeonButton'
import { EmptyState } from '@/components/ui/EmptyState'
import { formatDate } from '@/utils/format'

/** Result screen: vertical 9:16 video + download / regenerate + Share Kit. */
export function ResultPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [job, setJob] = useState<GenerationJob | null | undefined>(undefined)

  useEffect(() => {
    setJob(id ? (getJob(id) ?? null) : null)
  }, [id])

  if (job === undefined) return null

  if (job === null) {
    return (
      <EmptyState
        icon="🔍"
        title="Result not found"
        hint="This generation may have been deleted or created on another device."
        ctaLabel="Open history"
        onCta={() => navigate('/history')}
      />
    )
  }

  const download = () => {
    if (!job.resultUrl || isMockUrl(job.resultUrl)) {
      toast('Demo preview has no downloadable file yet', 'info', {
        hint: 'Connect the provider API keys to render real videos.',
      })
      return
    }
    const a = document.createElement('a')
    a.href = job.resultUrl
    a.download = `${job.title.replace(/\s+/g, '-').toLowerCase()}.mp4`
    a.click()
  }

  const regenerate = () => {
    startVideoPipeline({
      type: job.type,
      provider: job.provider,
      title: job.title,
      characters: [],
    })
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
          aria-label="Back"
        >
          ←
        </button>
      </div>

      {job.resultUrl && <VideoPlayer src={job.resultUrl} type={job.type} />}

      <div className="flex gap-3">
        <NeonButton accent="blue" fullWidth onClick={download}>
          ⬇ Download
        </NeonButton>
        <NeonButton accent="pink" variant="ghost" fullWidth onClick={regenerate}>
          ↻ Regenerate
        </NeonButton>
      </div>

      <ShareKitSection job={job} onJobUpdate={setJob} />
    </motion.div>
  )
}
