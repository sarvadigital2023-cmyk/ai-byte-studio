import type { Character, GenerationJob, StudioType, VideoProviderId } from '@/types'
import { uid, TAB_ACCENT } from '@/types'
import {
  getVideoProvider,
  getKeyStatus,
  voiceProvider,
  premadeVoiceForIndex,
  type AudioScene,
} from './providers'
import { ProviderError } from './providers/errors'
import { generateShareKit } from './shareKit'
import { saveJob } from './history'
import { isCloudEnabled, getAccessToken } from './supabase'
import { useGenerationStore, type StepDef } from '@/store/generation'
import { toast, toastMissingKey } from '@/store/toasts'
import { getT, fmt } from '@/i18n'

/**
 * Real generation flows. Each flow builds the step list for the full-screen
 * overlay; every step calls the selected provider's API through the
 * serverless proxies and wires the final result into history + /result/:id.
 */

function typeTitle(type: StudioType): string {
  const t = getT()
  return { solo: t.gen.jobTitleSolo, cinema: t.gen.jobTitleCinema, cartoon: t.gen.jobTitleCartoon }[
    type
  ]
}

function overlayTitle(type: StudioType): string {
  const t = getT()
  return { solo: t.gen.creatingSolo, cinema: t.gen.creatingCinema, cartoon: t.gen.creatingCartoon }[
    type
  ]
}

/**
 * The proxies always require a signed-in caller (they fail closed server-side
 * if Supabase isn't configured at all), so a generation that would otherwise
 * fail with 401/503 mid-run is caught here first with a clear message.
 */
async function ensureSignedIn(): Promise<boolean> {
  if (isCloudEnabled && (await getAccessToken())) return true
  const t = getT()
  toast(t.toasts.signInRequired, 'error', { hint: t.toasts.signInRequiredHint, durationMs: 6000 })
  return false
}

/** One spoken line of the script: "Name: text". Unattributed lines go to the lead. */
function parseScriptLines(
  script: string,
  characters: Character[],
): { character: Character; text: string }[] {
  const lines: { character: Character; text: string }[] = []
  const byName = new Map(characters.map((c) => [c.name.trim().toLowerCase(), c]))
  const lead = characters[0]
  for (const raw of script.split('\n')) {
    const line = raw.trim()
    if (!line) continue
    const m = line.match(/^([^:]{1,40}):\s*(.+)$/)
    const speaker = m ? byName.get(m[1].trim().toLowerCase()) : undefined
    if (speaker && m) lines.push({ character: speaker, text: m[2] })
    else if (lead) lines.push({ character: lead, text: line })
  }
  return lines
}

export interface VideoPipelineInput {
  type: StudioType
  provider: VideoProviderId
  title?: string
  characters: Character[]
  script?: string
  scene?: string
  speechText?: string
  style?: string
  onComplete?: (jobId: string) => void
}

export async function startVideoPipeline(input: VideoPipelineInput): Promise<void> {
  const { type, provider, characters } = input
  const api = getVideoProvider(provider)

  if (!(await ensureSignedIn())) return

  // Hard requirement: keys must be configured — no generation without them.
  const keys = await getKeyStatus(true)
  if (!keys[provider]) {
    toastMissingKey(api.name)
    return
  }
  const speechNeeded = !!api.prepareSpeechAudio
  if (speechNeeded && !keys.elevenlabs) {
    toastMissingKey('ElevenLabs')
    return
  }

  const t = getT()
  const jobId = uid()
  const title = input.title?.trim() || typeTitle(type)

  // Mutable context shared between sequential steps.
  const ctx: {
    characters: Character[]
    audioScenes: AudioScene[]
    videoJobId?: string
  } = { characters: characters.map((c) => ({ ...c })), audioScenes: [] }

  const steps: StepDef[] = [
    {
      id: 'avatar',
      label: type === 'solo' ? t.gen.stepPreparingAvatar : t.gen.stepPreparingAvatars,
      run: async (signal) => {
        for (const c of ctx.characters) {
          // Reuse an existing avatar only if the SAME provider produced it — a
          // HeyGen talking_photo_id is meaningless to Runway and vice versa.
          if (c.avatarId && c.avatarProvider === provider) continue
          const { avatarId, previewUrl } = await api.createAvatar({
            type,
            character: c,
            scene: input.scene,
            style: input.style,
            signal,
          })
          c.avatarId = avatarId
          c.avatarProvider = provider
          if (previewUrl) c.avatarUrl = previewUrl
        }
      },
    },
  ]

  if (speechNeeded) {
    steps.push({
      id: 'speech',
      label: t.gen.stepSpeech,
      run: async (signal) => {
        ctx.audioScenes = []
        const lines =
          type === 'solo'
            ? buildSoloLines(ctx.characters[0], input.speechText)
            : parseScriptLines(input.script ?? '', ctx.characters)
        if (lines.length === 0) {
          throw new ProviderError(getT().gen.nothingToSay)
        }
        // Distinct premade voice per character (by position) when a character
        // has no cloned voice, so multi-character casts don't all sound alike.
        const voiceByChar = new Map<string, string>()
        ctx.characters.forEach((c, i) => {
          voiceByChar.set(c.id, c.voiceSample?.voiceId ?? premadeVoiceForIndex(i))
        })
        for (const line of lines) {
          const audio =
            line.text === RECORDED_AUDIO_SENTINEL && line.character.voiceSample?.url
              ? await (await fetch(line.character.voiceSample.url)).blob()
              : await voiceProvider.synthesizeSpeech(
                  line.text,
                  voiceByChar.get(line.character.id),
                  signal,
                )
          const audioRef = await api.prepareSpeechAudio!(audio, signal)
          ctx.audioScenes.push({
            characterId: line.character.id,
            avatarId: line.character.avatarId!,
            audioRef,
          })
        }
      },
    })
  }

  steps.push(
    {
      id: 'motion',
      label: fmt(speechNeeded ? t.gen.stepMotion : t.gen.stepAnimating, { p: api.name }),
      run: async (signal) => {
        const { jobId: videoJobId } = await api.submitVideo({
          type,
          provider,
          characters: ctx.characters,
          script: input.script,
          scene: input.scene,
          speechText: input.speechText,
          style: input.style,
          audioScenes: ctx.audioScenes,
          signal,
        })
        ctx.videoJobId = videoJobId
      },
    },
    {
      id: 'render',
      label: fmt(t.gen.stepRender, { p: api.name }),
      run: async (signal) => {
        if (!ctx.videoJobId) throw new ProviderError('Render job was not submitted')
        const { resultUrl } = await api.waitForVideo(ctx.videoJobId, signal)
        const job: GenerationJob = {
          id: jobId,
          projectId: uid(),
          type,
          title,
          status: 'done',
          provider,
          steps: useGenerationStore.getState().steps.map((s) => ({ ...s, status: 'done' })),
          resultUrl,
          shareKit: generateShareKit(type, title),
          createdAt: new Date().toISOString(),
        }
        saveJob(job)
        useGenerationStore.getState().setResultJobId(jobId)
      },
    },
  )

  useGenerationStore.getState().start({
    title: overlayTitle(type),
    accent: TAB_ACCENT[type],
    steps,
    onDone: () => input.onComplete?.(jobId),
  })
}

/** Marks "use the recorded sample as-is" instead of TTS. */
const RECORDED_AUDIO_SENTINEL = '__recorded_audio__'

function buildSoloLines(
  character: Character,
  speechText: string | undefined,
): { character: Character; text: string }[] {
  if (speechText?.trim()) return [{ character, text: speechText.trim() }]
  if (character.voiceSample?.url) {
    return [{ character, text: RECORDED_AUDIO_SENTINEL }]
  }
  return []
}

/** Solo wizard step 3 — avatar-only pipeline in the same overlay. */
export async function startSoloAvatarPipeline(opts: {
  provider: VideoProviderId
  character: Character
  scene: string
  onAvatarReady: (avatarId: string, previewUrl: string | undefined, provider: VideoProviderId) => void
}): Promise<void> {
  const api = getVideoProvider(opts.provider)
  if (!(await ensureSignedIn())) return
  const keys = await getKeyStatus(true)
  if (!keys[opts.provider]) {
    toastMissingKey(api.name)
    return
  }

  const steps: StepDef[] = [
    {
      id: 'avatar',
      label: fmt(getT().gen.stepCreatingAvatar, { p: api.name }),
      run: async (signal) => {
        const { avatarId, previewUrl } = await api.createAvatar({
          type: 'solo',
          character: opts.character,
          scene: opts.scene,
          signal,
        })
        opts.onAvatarReady(avatarId, previewUrl, opts.provider)
      },
    },
  ]

  useGenerationStore.getState().start({
    title: getT().gen.generatingAvatar,
    accent: 'blue',
    steps,
  })
}
