import { useMemo } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import type { StoreApi, UseBoundStore } from 'zustand'
import type { CastState } from '@/store/cast'
import { useSettingsStore } from '@/store/settings'
import { startVideoPipeline } from '@/services/pipeline'
import { CharacterCard } from './CharacterCard'
import { NeonButton } from '@/components/ui/NeonButton'
import { Chip } from '@/components/ui/Chip'
import { EmptyState } from '@/components/ui/EmptyState'
import { ACCENT, type Accent } from '@/utils/accent'
import { countWords, estimateSpeechDuration, formatDuration } from '@/utils/format'
import { CARTOON_STYLES, MAX_CHARACTERS, MIN_CHARACTERS } from '@/types'

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

  const count = store.characters.length
  const enough = count >= MIN_CHARACTERS
  const allGenerated = enough && store.characters.every((c) => c.avatarStatus === 'done')
  const scriptFilled = store.script.trim().length > 0
  const words = countWords(store.script)
  const estimate = estimateSpeechDuration(store.script)

  const createDisabledReason = !enough
    ? `Add at least ${MIN_CHARACTERS - count} more character${MIN_CHARACTERS - count > 1 ? 's' : ''} (minimum ${MIN_CHARACTERS})`
    : !allGenerated
      ? 'Generate all avatars first'
      : !scriptFilled
        ? 'Write the script first'
        : undefined

  const generateDisabledReason = !enough
    ? `Need ${MIN_CHARACTERS}–${MAX_CHARACTERS} characters (now ${count})`
    : store.generatingAll
      ? 'Generation in progress…'
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
    startVideoPipeline({
      type: kind,
      provider: videoProvider,
      title: kind === 'cinema' ? 'My movie' : 'My cartoon',
      characters: store.characters,
      script: store.script,
      style: kind === 'cartoon' ? store.style : undefined,
    })
  }

  return (
    <div className="space-y-6 pb-6">
      {/* Style picker — cartoon only, chosen once for the whole project */}
      {kind === 'cartoon' && (
        <section>
          <h2 className="mb-2 text-sm font-bold text-white/80">Project style</h2>
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
          <h2 className="text-sm font-bold text-white/80">Characters</h2>
          <span
            className={`rounded-full border px-2.5 py-1 text-xs font-bold ${
              enough ? 'border-neon-green/50 text-neon-green' : 'border-neon-yellow/50 text-neon-yellow'
            }`}
          >
            {count} / {MAX_CHARACTERS} characters
          </span>
        </div>

        {count === 0 ? (
          <EmptyState
            icon={kind === 'cinema' ? '🎬' : '🎨'}
            title="No characters yet"
            hint={`Add ${MIN_CHARACTERS}–${MAX_CHARACTERS} characters to build your ${
              kind === 'cinema' ? 'movie cast' : 'cartoon cast'
            }.`}
            ctaLabel="+ Add first character"
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
                Add
              </motion.button>
            )}
          </div>
        )}

        {count > 0 && !enough && (
          <p className="mt-2 text-xs text-neon-yellow">
            Project is incomplete — a {kind === 'cinema' ? 'movie' : 'cartoon'} needs at least{' '}
            {MIN_CHARACTERS} characters.
          </p>
        )}
      </section>

      {/* Script */}
      <section>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-bold text-white/80">Script</h2>
          <span className="text-xs text-muted">
            {words} words · ≈{formatDuration(estimate)}
          </span>
        </div>
        <textarea
          value={store.script}
          onChange={(e) => store.setScript(e.target.value)}
          rows={7}
          placeholder={'Format each line as:\nName: line of dialogue\n\nMaya: Did you see that?!\nLeo: I told you the city never sleeps…'}
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
          disabled={!enough || store.generatingAll}
          disabledReason={generateDisabledReason}
          onClick={() => void store.generateAll(videoProvider, kind)}
        >
          {store.generatingAll
            ? 'Generating avatars…'
            : kind === 'cinema'
              ? 'Generate all avatars'
              : 'Generate all characters'}
        </NeonButton>
        <NeonButton
          accent={accent}
          fullWidth
          disabled={!!createDisabledReason}
          disabledReason={createDisabledReason}
          onClick={handleCreate}
        >
          {kind === 'cinema' ? '🎬 Create movie' : '🎨 Create cartoon'}
        </NeonButton>
      </section>
    </div>
  )
}
