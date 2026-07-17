import { useRef, useState } from 'react'
import { motion } from 'framer-motion'
import type { Character } from '@/types'
import { fileToDataUrl } from '@/utils/image'
import { toast } from '@/store/toasts'
import { VoiceBadge, VoiceRecorder } from '@/components/voice/VoiceRecorder'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { ACCENT, type Accent } from '@/utils/accent'
import type { VoiceSample, VoiceStatus } from '@/types'

interface CharacterCardProps {
  character: Character
  accent: Accent
  /** 'photo' — Cinema (photo upload); 'appearance' — Cartoon (description). */
  mode: 'photo' | 'appearance'
  onUpdate: (patch: Partial<Character>) => void
  onRemove: () => void
  onVoiceChange: (status: VoiceStatus, sample?: VoiceSample) => void
  onRetryAvatar?: () => void
}

const AVATAR_STATUS_LABEL: Record<Character['avatarStatus'], string> = {
  idle: '',
  queued: 'queued…',
  generating: 'generating…',
  done: 'done ✓',
  error: 'failed',
}

export function CharacterCard({
  character,
  accent,
  mode,
  onUpdate,
  onRemove,
  onVoiceChange,
  onRetryAvatar,
}: CharacterCardProps) {
  const a = ACCENT[accent]
  const fileRef = useRef<HTMLInputElement>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)

  const pickPhoto = async (file: File | undefined) => {
    if (!file) return
    try {
      const dataUrl = await fileToDataUrl(file)
      onUpdate({ photoUrl: dataUrl, avatarStatus: 'idle', avatarUrl: undefined })
    } catch {
      toast('Could not read the image', 'error')
    }
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.92, y: 16 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ type: 'spring', stiffness: 300, damping: 26 }}
      className={`glass w-[264px] shrink-0 snap-center p-4 ${a.glass}`}
    >
      {/* portrait / photo area */}
      {mode === 'photo' ? (
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="relative block h-40 w-full overflow-hidden rounded-xl border border-white/10 bg-white/5"
        >
          {character.photoUrl ? (
            <img src={character.photoUrl} alt={character.name} className="h-full w-full object-cover" />
          ) : (
            <span className="flex h-full flex-col items-center justify-center gap-1 text-xs text-muted">
              <span className="text-2xl">📷</span>
              Add photo
            </span>
          )}
          {character.avatarStatus !== 'idle' && (
            <span
              className={`absolute bottom-2 left-2 rounded-full border px-2 py-0.5 text-[10px] font-bold backdrop-blur ${
                character.avatarStatus === 'done'
                  ? 'border-neon-green/60 bg-ink/60 text-neon-green'
                  : character.avatarStatus === 'error'
                    ? 'border-neon-pink/60 bg-ink/60 text-neon-pink'
                    : `border-white/20 bg-ink/60 text-white/80`
              }`}
            >
              {AVATAR_STATUS_LABEL[character.avatarStatus]}
            </span>
          )}
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => void pickPhoto(e.target.files?.[0])}
          />
        </button>
      ) : (
        <div
          className={`relative flex h-40 w-full items-center justify-center overflow-hidden rounded-xl border border-white/10 ${
            character.avatarStatus === 'done'
              ? `bg-gradient-to-br from-neon-green/25 via-ink to-neon-blue/20`
              : 'bg-white/5'
          }`}
        >
          {character.avatarStatus === 'done' ? (
            <span className="text-5xl drop-shadow-[0_0_14px_rgba(57,255,136,0.8)]">🧑‍🎨</span>
          ) : character.avatarStatus === 'generating' || character.avatarStatus === 'queued' ? (
            <div className="skeleton absolute inset-0" />
          ) : (
            <span className="px-4 text-center text-xs text-muted">
              Stylized portrait appears here after generation
            </span>
          )}
          {character.avatarStatus !== 'idle' && (
            <span
              className={`absolute bottom-2 left-2 rounded-full border px-2 py-0.5 text-[10px] font-bold backdrop-blur ${
                character.avatarStatus === 'done'
                  ? 'border-neon-green/60 bg-ink/60 text-neon-green'
                  : character.avatarStatus === 'error'
                    ? 'border-neon-pink/60 bg-ink/60 text-neon-pink'
                    : 'border-white/20 bg-ink/60 text-white/80'
              }`}
            >
              {AVATAR_STATUS_LABEL[character.avatarStatus]}
            </span>
          )}
        </div>
      )}

      {character.avatarStatus === 'error' && onRetryAvatar && (
        <button
          type="button"
          onClick={onRetryAvatar}
          className="mt-2 w-full rounded-full border border-neon-pink/50 bg-neon-pink/10 py-1.5 text-xs font-bold text-neon-pink"
        >
          ↻ Retry avatar
        </button>
      )}

      {/* name + voice badge */}
      <div className="mt-3 flex items-center gap-2">
        <input
          value={character.name}
          onChange={(e) => onUpdate({ name: e.target.value })}
          placeholder="Name"
          className="min-w-0 flex-1 bg-transparent text-sm font-bold outline-none placeholder:text-white/30"
        />
        <VoiceBadge status={character.voiceStatus} />
      </div>

      {mode === 'photo' ? (
        <input
          value={character.role}
          onChange={(e) => onUpdate({ role: e.target.value })}
          placeholder="Role in the scene"
          className="mt-2 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs outline-none placeholder:text-white/30 focus:border-white/25"
        />
      ) : (
        <textarea
          value={character.appearance ?? ''}
          onChange={(e) => onUpdate({ appearance: e.target.value })}
          placeholder="Detailed appearance: age, hair, outfit, vibe…"
          rows={3}
          className="mt-2 w-full resize-none rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs outline-none placeholder:text-white/30 focus:border-white/25"
        />
      )}

      <div className="mt-3">
        <VoiceRecorder
          voiceStatus={character.voiceStatus}
          voiceName={character.name}
          onVoiceChange={onVoiceChange}
        />
      </div>

      <button
        type="button"
        onClick={() => setConfirmOpen(true)}
        className="mt-3 w-full py-1 text-xs font-bold text-white/40"
      >
        Delete character
      </button>

      <ConfirmDialog
        open={confirmOpen}
        title={`Delete ${character.name || 'character'}?`}
        message="The photo, description and recorded voice for this character will be removed."
        onConfirm={() => {
          setConfirmOpen(false)
          onRemove()
        }}
        onCancel={() => setConfirmOpen(false)}
      />
    </motion.div>
  )
}
