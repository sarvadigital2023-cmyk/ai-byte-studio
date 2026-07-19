import { useRef, useState, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useSoloStore } from '@/store/solo'
import { useSettingsStore } from '@/store/settings'
import { startSoloAvatarPipeline, startVideoPipeline } from '@/services/pipeline'
import { fileToDataUrl } from '@/utils/image'
import { toast } from '@/store/toasts'
import { NeonButton } from '@/components/ui/NeonButton'
import { Chip } from '@/components/ui/Chip'
import { VoiceRecorder } from '@/components/voice/VoiceRecorder'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { useT } from '@/i18n'

const SCENE_MAX = 400

/** Solo Avatar — vertical wizard; each step unlocks when the previous is done. */
export function SoloPage() {
  const solo = useSoloStore()
  const videoProvider = useSettingsStore((s) => s.videoProvider)
  const t = useT()
  const fileRef = useRef<HTMLInputElement>(null)
  const selfieRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)
  const [confirmReset, setConfirmReset] = useState(false)

  const isRunway = videoProvider === 'runway'
  const hasPhoto = !!solo.character.photoUrl
  const hasScene = solo.scene.trim().length > 0
  const hasAvatar = solo.character.avatarStatus === 'done'
  const hasVoice = solo.character.voiceStatus !== 'none'
  // A recorded voice only counts as usable speech while its audio blob is
  // still in memory; after a reload the blob url is gone (only a cloned
  // voiceId survives), so it no longer satisfies the speech step on its own —
  // typed text is then required, and it's spoken in the cloned voice. This
  // avoids marking the step complete and then failing mid-generation.
  const hasRecordedAudio = !!solo.character.voiceSample?.url
  const hasSpeech = solo.speechText.trim().length > 0 || hasRecordedAudio
  // Runway produces a silent, prompt-driven video — speech/voice is ignored,
  // so it isn't required to create the video on that provider.
  const speechRequired = !isRunway
  const allDone = hasPhoto && hasScene && hasAvatar && (!speechRequired || hasSpeech)
  const hasAnything =
    hasPhoto || hasScene || hasAvatar || hasVoice || solo.speechText.trim().length > 0

  const resetAll = () => {
    solo.reset()
    // Clear the native file input value too — otherwise re-picking the exact
    // same file afterwards may not fire a change event in some browsers.
    if (fileRef.current) fileRef.current.value = ''
    if (selfieRef.current) selfieRef.current.value = ''
    setConfirmReset(false)
    toast(t.common.startedOver, 'success')
  }

  const missing = [
    !hasPhoto && t.solo.missingPhoto,
    !hasScene && t.solo.missingScene,
    !hasAvatar && t.solo.missingAvatar,
    speechRequired && !hasSpeech && t.solo.missingSpeech,
  ].filter(Boolean) as string[]

  const pickPhoto = async (file: File | undefined | null) => {
    if (!file) return
    try {
      solo.setPhoto(await fileToDataUrl(file))
    } catch {
      toast(t.solo.imageReadError, 'error')
    }
  }

  const generateAvatar = () => {
    void startSoloAvatarPipeline({
      provider: videoProvider,
      character: solo.character,
      scene: solo.scene,
      onAvatarReady: (avatarId, previewUrl, provider) =>
        solo.setAvatar('done', previewUrl ?? solo.character.photoUrl, avatarId, provider),
    })
  }

  return (
    <div className="space-y-4 pb-6">
      {hasAnything && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => setConfirmReset(true)}
            className="min-h-[36px] rounded-full border border-white/10 bg-white/5 px-3.5 text-xs font-bold text-white/60"
          >
            {t.common.startOver}
          </button>
        </div>
      )}

      {/* Step 1 — Photo */}
      <StepCard index={1} title={t.solo.stepPhoto} done={hasPhoto} unlocked lockedHint={t.solo.completePrevious}>
        {solo.character.photoUrl ? (
          <div className="flex items-center gap-4">
            <img
              src={solo.character.photoUrl}
              alt={t.solo.stepPhoto}
              className="h-24 w-24 rounded-2xl border border-white/10 object-cover"
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="min-h-[44px] rounded-full border border-white/15 bg-white/5 px-5 text-sm font-bold"
            >
              {t.solo.replacePhoto}
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
              <p className="text-sm font-bold">{t.solo.dropPhoto}</p>
              <p className="text-xs text-muted">{t.solo.photoHint}</p>
            </div>
            <button
              type="button"
              onClick={() => selfieRef.current?.click()}
              className="mt-3 min-h-[44px] w-full rounded-full border border-neon-blue/50 bg-neon-blue/10 text-sm font-bold text-neon-blue"
            >
              {t.solo.takeSelfie}
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

      {/* HeyGen scene limitation notice — shown only while HeyGen is the
          selected video provider; disappears instantly when switching to
          Runway. Remove this block once HeyGen supports scene generation. */}
      <AnimatePresence>
        {videoProvider === 'heygen' && (
          <motion.div
            key="heygen-scene-notice"
            initial={{ opacity: 0, height: 0, marginBottom: 0 }}
            animate={{ opacity: 1, height: 'auto', marginBottom: 16 }}
            exit={{ opacity: 0, height: 0, marginBottom: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="overflow-hidden"
          >
            <div className="glass glass-glow-yellow flex items-start gap-2.5 p-3.5">
              <span className="text-base leading-none">⚠️</span>
              <p className="text-xs leading-relaxed text-neon-yellow/90">
                {t.solo.heygenSceneNotice}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Step 2 — Scene */}
      <StepCard
        index={2}
        title={t.solo.stepScene}
        done={hasScene}
        unlocked={hasPhoto}
        lockedHint={t.solo.completePrevious}
      >
        <textarea
          value={solo.scene}
          maxLength={SCENE_MAX}
          onChange={(e) => solo.setScene(e.target.value)}
          rows={3}
          placeholder={t.solo.scenePlaceholder}
          className="w-full resize-none rounded-2xl border border-white/10 bg-white/5 p-4 text-sm outline-none placeholder:text-white/25 focus:border-neon-blue/50"
        />
        <div className="mt-1 text-right text-[11px] text-muted">
          {solo.scene.length} / {SCENE_MAX}
        </div>
        <div data-swipe-ignore className="no-scrollbar mt-1 flex gap-2 overflow-x-auto pb-1">
          {t.solo.sceneChips.map((c) => (
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
      <StepCard
        index={3}
        title={t.solo.stepAvatar}
        done={hasAvatar}
        unlocked={hasPhoto && hasScene}
        lockedHint={t.solo.completePrevious}
      >
        {hasAvatar ? (
          <div className="flex items-center gap-4">
            {solo.character.avatarUrl ? (
              <img
                src={solo.character.avatarUrl}
                alt={t.solo.stepAvatar}
                className="h-24 w-24 rounded-2xl border border-neon-blue/40 object-cover shadow-glow-blue"
              />
            ) : (
              <div className="flex h-24 w-24 items-center justify-center rounded-2xl border border-neon-blue/40 bg-gradient-to-br from-neon-blue/25 via-ink to-neon-pink/20 text-3xl shadow-glow-blue">
                👤
              </div>
            )}
            <div className="flex-1">
              <p className="text-sm font-bold text-neon-green">{t.solo.avatarReady}</p>
              <button
                type="button"
                onClick={generateAvatar}
                className="mt-2 min-h-[44px] rounded-full border border-white/15 bg-white/5 px-5 text-sm font-bold"
              >
                {t.solo.regenerate}
              </button>
            </div>
          </div>
        ) : (
          <NeonButton accent="blue" fullWidth onClick={generateAvatar}>
            {t.solo.generateAvatar}
          </NeonButton>
        )}
      </StepCard>

      {/* Step 4 — Speech */}
      <StepCard
        index={4}
        title={t.solo.stepSpeech}
        done={speechRequired ? hasSpeech : true}
        unlocked={hasAvatar}
        lockedHint={t.solo.completePrevious}
      >
        <AnimatePresence>
          {isRunway && (
            <motion.div
              initial={{ opacity: 0, height: 0, marginBottom: 0 }}
              animate={{ opacity: 1, height: 'auto', marginBottom: 12 }}
              exit={{ opacity: 0, height: 0, marginBottom: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="overflow-hidden"
            >
              <div className="glass glass-glow-yellow flex items-start gap-2.5 p-3.5">
                <span className="text-base leading-none">⚠️</span>
                <p className="text-xs leading-relaxed text-neon-yellow/90">
                  {t.providers.runwaySilentNotice}
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <textarea
          value={solo.speechText}
          onChange={(e) => solo.setSpeechText(e.target.value)}
          rows={3}
          placeholder={t.solo.speechPlaceholder}
          className="w-full resize-none rounded-2xl border border-white/10 bg-white/5 p-4 text-sm outline-none placeholder:text-white/25 focus:border-neon-blue/50"
        />
        <p className="my-2 text-center text-xs text-muted">{t.solo.orRecordVoice}</p>
        <VoiceRecorder
          voiceStatus={solo.character.voiceStatus}
          voiceName={t.voice.myVoice}
          onVoiceChange={(status, sample) => solo.setVoice(status, sample)}
        />
      </StepCard>

      {/* Step 5 — Create video */}
      <div className="pt-1">
        <NeonButton
          accent="blue"
          fullWidth
          disabled={!allDone}
          disabledReason={allDone ? undefined : `${t.solo.missingPrefix}${missing.join(', ')}`}
          onClick={() =>
            void startVideoPipeline({
              type: 'solo',
              provider: videoProvider,
              title: solo.scene ? `Avatar · ${solo.scene.slice(0, 30)}` : undefined,
              characters: [solo.character],
              scene: solo.scene,
              speechText: solo.speechText,
            })
          }
        >
          {t.solo.createVideo}
        </NeonButton>
      </div>

      <ConfirmDialog
        open={confirmReset}
        title={t.common.startOverTitle}
        message={t.common.startOverMessage}
        confirmLabel={t.common.startOver}
        onConfirm={resetAll}
        onCancel={() => setConfirmReset(false)}
      />
    </div>
  )
}

function StepCard({
  index,
  title,
  done,
  unlocked,
  lockedHint,
  children,
}: {
  index: number
  title: string
  done: boolean
  unlocked: boolean
  lockedHint: string
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
        {!unlocked && <span className="ml-auto text-xs text-muted">{lockedHint}</span>}
      </div>
      {children}
    </motion.section>
  )
}
