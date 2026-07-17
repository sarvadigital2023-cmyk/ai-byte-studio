import { useRef, useState, type ReactNode } from 'react'
import { motion } from 'framer-motion'
import { useSoloStore } from '@/store/solo'
import { useSettingsStore } from '@/store/settings'
import { startSoloAvatarPipeline, startVideoPipeline } from '@/services/pipeline'
import { fileToDataUrl } from '@/utils/image'
import { toast } from '@/store/toasts'
import { NeonButton } from '@/components/ui/NeonButton'
import { Chip } from '@/components/ui/Chip'
import { VoiceRecorder } from '@/components/voice/VoiceRecorder'

const SCENE_CHIPS = ['Office', 'City street', 'Neon studio', 'Podcast setup']
const SCENE_MAX = 400

/** Solo Avatar — vertical wizard; each step unlocks when the previous is done. */
export function SoloPage() {
  const solo = useSoloStore()
  const videoProvider = useSettingsStore((s) => s.videoProvider)
  const fileRef = useRef<HTMLInputElement>(null)
  const selfieRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)

  const hasPhoto = !!solo.character.photoUrl
  const hasScene = solo.scene.trim().length > 0
  const hasAvatar = solo.character.avatarStatus === 'done'
  const hasSpeech = solo.speechText.trim().length > 0 || solo.character.voiceStatus !== 'none'
  const allDone = hasPhoto && hasScene && hasAvatar && hasSpeech

  const missing = [
    !hasPhoto && 'photo',
    !hasScene && 'scene',
    !hasAvatar && 'avatar',
    !hasSpeech && 'speech text or voice',
  ].filter(Boolean) as string[]

  const pickPhoto = async (file: File | undefined | null) => {
    if (!file) return
    try {
      solo.setPhoto(await fileToDataUrl(file))
    } catch {
      toast('Could not read the image', 'error')
    }
  }

  const generateAvatar = () => {
    void startSoloAvatarPipeline({
      provider: videoProvider,
      character: solo.character,
      scene: solo.scene,
      onAvatarReady: (avatarId, previewUrl) =>
        solo.setAvatar('done', previewUrl ?? solo.character.photoUrl, avatarId),
    })
  }

  return (
    <div className="space-y-4 pb-6">
      {/* Step 1 — Photo */}
      <StepCard index={1} title="Photo" done={hasPhoto} unlocked>
        {solo.character.photoUrl ? (
          <div className="flex items-center gap-4">
            <img
              src={solo.character.photoUrl}
              alt="Your photo"
              className="h-24 w-24 rounded-2xl border border-white/10 object-cover"
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="min-h-[44px] rounded-full border border-white/15 bg-white/5 px-5 text-sm font-bold"
            >
              Replace photo
            </button>
          </div>
        ) : (
          <>
            <div
              onDragOver={(e) => {
                e.preventDefault()
                setDragOver(true)
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault()
                setDragOver(false)
                void pickPhoto(e.dataTransfer.files?.[0])
              }}
              onClick={() => fileRef.current?.click()}
              className={`flex min-h-[120px] cursor-pointer flex-col items-center justify-center gap-1.5 rounded-2xl border-2 border-dashed p-4 text-center transition-colors ${
                dragOver ? 'border-neon-blue bg-neon-blue/10' : 'border-white/15 bg-white/5'
              }`}
            >
              <span className="text-3xl">📷</span>
              <p className="text-sm font-bold">Drop a photo or tap to choose</p>
              <p className="text-xs text-muted">Face close-up, good lighting works best</p>
            </div>
            <button
              type="button"
              onClick={() => selfieRef.current?.click()}
              className="mt-3 min-h-[44px] w-full rounded-full border border-neon-blue/50 bg-neon-blue/10 text-sm font-bold text-neon-blue"
            >
              🤳 Take a selfie
            </button>
          </>
        )}
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => void pickPhoto(e.target.files?.[0])}
        />
        <input
          ref={selfieRef}
          type="file"
          accept="image/*"
          capture="user"
          className="hidden"
          onChange={(e) => void pickPhoto(e.target.files?.[0])}
        />
      </StepCard>

      {/* Step 2 — Scene */}
      <StepCard index={2} title="Scene" done={hasScene} unlocked={hasPhoto}>
        <textarea
          value={solo.scene}
          maxLength={SCENE_MAX}
          onChange={(e) => solo.setScene(e.target.value)}
          rows={3}
          placeholder="e.g. A cozy podcast studio with warm lamps, city lights in the window behind me…"
          className="w-full resize-none rounded-2xl border border-white/10 bg-white/5 p-4 text-sm outline-none placeholder:text-white/25 focus:border-neon-blue/50"
        />
        <div className="mt-1 text-right text-[11px] text-muted">
          {solo.scene.length} / {SCENE_MAX}
        </div>
        <div data-swipe-ignore className="no-scrollbar mt-1 flex gap-2 overflow-x-auto pb-1">
          {SCENE_CHIPS.map((c) => (
            <Chip
              key={c}
              label={c}
              accent="blue"
              active={solo.scene === c}
              onClick={() => solo.setScene(c)}
            />
          ))}
        </div>
      </StepCard>

      {/* Step 3 — Avatar */}
      <StepCard index={3} title="Avatar" done={hasAvatar} unlocked={hasPhoto && hasScene}>
        {hasAvatar ? (
          <div className="flex items-center gap-4">
            {solo.character.avatarUrl ? (
              <img
                src={solo.character.avatarUrl}
                alt="Avatar preview"
                className="h-24 w-24 rounded-2xl border border-neon-blue/40 object-cover shadow-glow-blue"
              />
            ) : (
              <div className="flex h-24 w-24 items-center justify-center rounded-2xl border border-neon-blue/40 bg-gradient-to-br from-neon-blue/25 via-ink to-neon-pink/20 text-3xl shadow-glow-blue">
                👤
              </div>
            )}
            <div className="flex-1">
              <p className="text-sm font-bold text-neon-green">Avatar ready ✓</p>
              <button
                type="button"
                onClick={generateAvatar}
                className="mt-2 min-h-[44px] rounded-full border border-white/15 bg-white/5 px-5 text-sm font-bold"
              >
                ↻ Regenerate
              </button>
            </div>
          </div>
        ) : (
          <NeonButton accent="blue" fullWidth onClick={generateAvatar}>
            ✨ Generate avatar
          </NeonButton>
        )}
      </StepCard>

      {/* Step 4 — Speech */}
      <StepCard index={4} title="Speech" done={hasSpeech} unlocked={hasAvatar}>
        <textarea
          value={solo.speechText}
          onChange={(e) => solo.setSpeechText(e.target.value)}
          rows={3}
          placeholder="What should your avatar say? Type the speech here…"
          className="w-full resize-none rounded-2xl border border-white/10 bg-white/5 p-4 text-sm outline-none placeholder:text-white/25 focus:border-neon-blue/50"
        />
        <p className="my-2 text-center text-xs text-muted">— or record your voice —</p>
        <VoiceRecorder
          voiceStatus={solo.character.voiceStatus}
          voiceName="My voice"
          onVoiceChange={(status, sample) => solo.setVoice(status, sample)}
        />
      </StepCard>

      {/* Step 5 — Create video */}
      <div className="pt-1">
        <NeonButton
          accent="blue"
          fullWidth
          disabled={!allDone}
          disabledReason={allDone ? undefined : `Missing: ${missing.join(', ')}`}
          onClick={() =>
            void startVideoPipeline({
              type: 'solo',
              provider: videoProvider,
              title: solo.scene ? `Avatar · ${solo.scene.slice(0, 30)}` : 'Solo avatar video',
              characters: [solo.character],
              scene: solo.scene,
              speechText: solo.speechText,
            })
          }
        >
          🎥 Create video
        </NeonButton>
      </div>
    </div>
  )
}

function StepCard({
  index,
  title,
  done,
  unlocked,
  children,
}: {
  index: number
  title: string
  done: boolean
  unlocked: boolean
  children: ReactNode
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, type: 'spring', stiffness: 280, damping: 26 }}
      className={`glass p-4 ${done ? 'glass-glow-green' : ''} ${
        unlocked ? '' : 'pointer-events-none opacity-40'
      }`}
    >
      <div className="mb-3 flex items-center gap-2.5">
        <span
          className={`flex h-7 w-7 items-center justify-center rounded-full border text-xs font-black ${
            done
              ? 'border-neon-green/60 bg-neon-green/10 text-neon-green'
              : 'border-neon-blue/50 bg-neon-blue/10 text-neon-blue'
          }`}
        >
          {done ? '✓' : index}
        </span>
        <h2 className="text-sm font-extrabold">{title}</h2>
        {!unlocked && <span className="ml-auto text-xs text-muted">Complete the previous step</span>}
      </div>
      {children}
    </motion.section>
  )
}
