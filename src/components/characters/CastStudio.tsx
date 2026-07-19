import { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import type { StoreApi, UseBoundStore } from 'zustand'
import type { CastState } from '@/store/cast'
import { useSettingsStore } from '@/store/settings'
import { startVideoPipeline } from '@/services/pipeline'
import { CharacterCard } from './CharacterCard'
import { NeonButton } from '@/components/ui/NeonButton'
import { Chip } from '@/components/ui/Chip'
import { EmptyState } from '@/components/ui/EmptyState'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { ACCENT, type Accent } from '@/utils/accent'
import { countWords, estimateSpeechDuration, formatDuration } from '@/utils/format'
import {
  CARTOON_STYLES,
  MAX_CHARACTERS,
  MIN_CHARACTERS,
  MIN_READY_AVATARS,
  cartoonStyleLabel,
} from '@/types'
import { useT, fmt } from '@/i18n'
import { toast } from '@/store/toasts'

interface CastStudioProps {
  kind: 'cinema' | 'cartoon'
  accent: Accent
  useStore: UseBoundStore<StoreApi<CastState>>
}

/**
 * Shared Cinema/Cartoon studio: 5–6 character carousel, script editor with
 * name highlighting, sequential avatar generation, final movie/cartoon CTA.
 */
export function CastStudio({ kind, accent, useStore }: CastStudioProps) {
  const a = ACCENT[accent]
  const store = useStore()
  const videoProvider = useSettingsStore((s) => s.videoProvider)
  const t = useT()
  const [confirmReset, setConfirmReset] = useState(false)

  const count = store.characters.length
  const enough = count >= MIN_CHARACTERS
  const readyCharacters = store.characters.filter((c) => c.avatarStatus === 'done')
  const readyToCreate = readyCharacters.length >= MIN_READY_AVATARS
  const scriptFilled = store.script.trim().length > 0
  const words = countWords(store.script)
  const estimate = estimateSpeechDuration(store.script)

  // Cinema needs a photo per character; Cartoon needs an appearance description.
  // Generation just errors per-card without these, so gate the button instead.
  const missingInputs =
    kind === 'cinema'
      ? store.characters.some((c) => !c.photoUrl)
      : store.characters.some((c) => !c.appearance?.trim())
  const missingInputsReason = missingInputs
    ? kind === 'cinema'
      ? t.cast.reasonAddPhotos
      : t.cast.reasonAddAppearance
    : undefined

  // A character without a finished avatar is skipped from the final video
  // rather than blocking it, so Create only needs a minimum ready count —
  // not every character, and not the photo/appearance inputs of the rest.
  const createDisabledReason = !enough
    ? fmt(t.cast.reasonAddMore, { n: MIN_CHARACTERS - count, min: MIN_CHARACTERS })
    : !readyToCreate
      ? fmt(t.cast.reasonGenerateFirst, { n: MIN_READY_AVATARS })
      : !scriptFilled
        ? t.cast.reasonWriteScript
        : undefined

  const generateDisabledReason = !enough
    ? fmt(t.cast.reasonNeedRange, { min: MIN_CHARACTERS, max: MAX_CHARACTERS, n: count })
    : missingInputsReason
      ? missingInputsReason
      : store.generatingAll
        ? t.cast.reasonInProgress
        : undefined

  // Highlight "Name:" line starts in the script preview
  const names = useMemo(
    () => store.characters.map((c) => c.name.trim()).filter(Boolean),
    [store.characters],
  )
  const scriptPreview = useMemo(() => {
    if (!scriptFilled || names.length === 0) return null
    const pattern = new RegExp(
      `^(${names.map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')}):`,
      'i',
    )
    return store.script.split('\n').map((line, i) => {
      const m = line.match(pattern)
      return (
        <p key={i} className="min-h-[1.2em] text-xs leading-relaxed">
          {m ? (
            <>
              <span className={`font-bold ${a.text}`}>{m[1]}:</span>
              <span className="text-white/70">{line.slice(m[0].length)}</span>
            </>
          ) : (
            <span className="text-white/50">{line}</span>
          )}
        </p>
      )
    })
  }, [store.script, names, scriptFilled, a.text])

  const handleCreate = () => {
    void startVideoPipeline({
      type: kind,
      provider: videoProvider,
      title: kind === 'cinema' ? t.gen.myMovie : t.gen.myCartoon,
      // Characters without a finished avatar are left out of the video
      // instead of blocking it or being force-generated mid-render.
      characters: readyCharacters,
      script: store.script,
      style: kind === 'cartoon' ? cartoonStyleLabel(store.style) : undefined,
    })
  }

  const hasAnything = count > 0 || store.script.trim().length > 0

  const resetAll = () => {
    store.reset()
    setConfirmReset(false)
    toast(t.common.startedOver, 'success')
  }

  return (
    <div className="space-y-6 pb-6">
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

      {/* Style picker — cartoon only, chosen once for the whole project */}
      {kind === 'cartoon' && (
        <section>
          <h2 className="mb-2 text-sm font-bold text-white/80">{t.cast.projectStyle}</h2>
          <div data-swipe-ignore className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
            {CARTOON_STYLES.map((s) => (
              <Chip
                key={s.id}
                label={s.label}
                accent={accent}
                active={store.style === s.id}
                onClick={() => store.setStyle(s.id)}
              />
            ))}
          </div>
        </section>
      )}

      {/* Characters */}
      <section>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-bold text-white/80">{t.cast.characters}</h2>
          <span
            className={`rounded-full border px-2.5 py-1 text-xs font-bold ${
              enough ? 'border-neon-green/50 text-neon-green' : 'border-neon-yellow/50 text-neon-yellow'
            }`}
          >
            {fmt(t.cast.counter, { n: count, max: MAX_CHARACTERS })}
          </span>
        </div>

        {count === 0 ? (
          <EmptyState
            icon={kind === 'cinema' ? '🎬' : '🎨'}
            title={kind === 'cinema' ? t.cast.emptyTitleCinema : t.cast.emptyTitleCartoon}
            hint={fmt(kind === 'cinema' ? t.cast.emptyHintCinema : t.cast.emptyHintCartoon, {
              min: MIN_CHARACTERS,
              max: MAX_CHARACTERS,
            })}
            ctaLabel={t.cast.addFirst}
            accent={accent}
            onCta={() => store.addCharacter()}
          />
        ) : (
          <div data-swipe-ignore className="no-scrollbar -mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2">
            <AnimatePresence mode="popLayout">
              {store.characters.map((c) => (
                <CharacterCard
                  key={c.id}
                  character={c}
                  accent={accent}
                  mode={kind === 'cinema' ? 'photo' : 'appearance'}
                  onUpdate={(patch) => store.updateCharacter(c.id, patch)}
                  onRemove={() => store.removeCharacter(c.id)}
                  onVoiceChange={(status, sample) => store.setVoice(c.id, status, sample)}
                  onRetryAvatar={() => void store.retryCharacter(videoProvider, kind, c.id)}
                />
              ))}
            </AnimatePresence>
            {count < MAX_CHARACTERS && (
              <motion.button
                layout
                type="button"
                whileTap={{ scale: 0.96 }}
                onClick={() => store.addCharacter()}
                className={`glass flex h-auto w-[120px] shrink-0 snap-center flex-col items-center justify-center gap-2 border-dashed ${a.border} text-sm font-bold ${a.text}`}
              >
                <span className="text-2xl">+</span>
                {t.common.add}
              </motion.button>
            )}
          </div>
        )}

        {count > 0 && !enough && (
          <p className="mt-2 text-xs text-neon-yellow">
            {fmt(kind === 'cinema' ? t.cast.incompleteCinema : t.cast.incompleteCartoon, {
              min: MIN_CHARACTERS,
            })}
          </p>
        )}
      </section>

      {/* Script */}
      <section>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-bold text-white/80">{t.cast.script}</h2>
          <span className="text-xs text-muted">
            {fmt(t.cast.scriptStats, { words, duration: formatDuration(estimate) })}
          </span>
        </div>
        <textarea
          value={store.script}
          onChange={(e) => store.setScript(e.target.value)}
          rows={7}
          placeholder={t.cast.scriptPlaceholder}
          className="w-full resize-none rounded-2xl border border-white/10 bg-white/5 p-4 text-sm leading-relaxed outline-none placeholder:text-white/25 focus:border-white/30"
        />
        {scriptPreview && (
          <div className="glass mt-2 max-h-36 overflow-y-auto p-3">{scriptPreview}</div>
        )}
      </section>

      {/* Actions */}
      <section className="space-y-3">
        <NeonButton
          accent={accent}
          fullWidth
          disabled={!enough || missingInputs || store.generatingAll}
          disabledReason={generateDisabledReason}
          onClick={() => void store.generateAll(videoProvider, kind)}
        >
          {store.generatingAll
            ? t.cast.generating
            : kind === 'cinema'
              ? t.cast.generateAllCinema
              : t.cast.generateAllCartoon}
        </NeonButton>
        <NeonButton
          accent={accent}
          fullWidth
          disabled={!!createDisabledReason}
          disabledReason={createDisabledReason}
          onClick={handleCreate}
        >
          {kind === 'cinema' ? t.cast.createMovie : t.cast.createCartoon}
        </NeonButton>
      </section>

      <ConfirmDialog
        open={confirmReset}
        title={t.common.startOverTitle}
        message={t.common.startOverMessageCast}
        confirmLabel={t.common.startOver}
        onConfirm={resetAll}
        onCancel={() => setConfirmReset(false)}
      />
    </div>
  )
}
