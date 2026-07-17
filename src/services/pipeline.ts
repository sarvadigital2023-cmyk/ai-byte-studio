import type { Character, GenerationJob, StudioType, VideoProviderId } from '@/types'
import { uid, TAB_ACCENT } from '@/types'
import { getVideoProvider, PROVIDERS } from './providers'
import { voiceProvider } from './providers'
import { generateShareKit } from './shareKit'
import { saveJob } from './history'
import { useGenerationStore, type StepDef } from '@/store/generation'
import { toastMissingKey } from '@/store/toasts'

/**
 * High-level generation flows. Each flow builds the step list for the
 * full-screen overlay and wires the final result into history + /result/:id.
 */

const TYPE_TITLE: Record<StudioType, string> = {
  solo: 'Solo avatar video',
  cinema: 'Movie',
  cartoon: 'Cartoon',
}

/** Warn (once per start) about any missing provider keys. Demo mode continues on mocks. */
function warnMissingKeys(provider: VideoProviderId, needsSpeech: boolean): void {
  if (!PROVIDERS[provider].isConfigured()) toastMissingKey(PROVIDERS[provider].name)
  if (needsSpeech && !PROVIDERS.elevenlabs.isConfigured()) toastMissingKey('ElevenLabs')
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
  /** Called with the saved job id when the pipeline completes. */
  onComplete?: (jobId: string) => void
}

export function startVideoPipeline(input: VideoPipelineInput): void {
  const { type, provider, characters } = input
  const api = getVideoProvider(provider)
  warnMissingKeys(provider, true)

  const gen = useGenerationStore.getState()
  const jobId = uid()
  const title = input.title?.trim() || TYPE_TITLE[type]

  const renderReq = {
    type,
    provider,
    characters,
    script: input.script,
    scene: input.scene,
    speechText: input.speechText,
    style: input.style,
  }

  const speechSource =
    input.speechText || input.script || characters.map((c) => c.role).join('. ')

  const steps: StepDef[] = [
    {
      id: 'avatar',
      label: type === 'solo' ? 'Preparing avatar' : 'Preparing avatars',
      run: async (signal) => {
        // Avatars are generated beforehand in the wizard; this validates and
        // re-uploads them to the provider session.
        for (const c of characters) {
          if (!c.avatarUrl) {
            await api.createAvatar({ type, character: c, scene: input.scene, style: input.style, signal })
          }
        }
      },
    },
    {
      id: 'speech',
      label: 'Synthesizing speech (ElevenLabs)',
      run: async (signal) => {
        await voiceProvider.synthesizeSpeech(speechSource, signal)
      },
    },
    {
      id: 'motion',
      label: 'Syncing motion (lipsync + gestures)',
      run: async (signal) => {
        await api.syncMotion({ ...renderReq, signal })
      },
    },
    {
      id: 'render',
      label: `Rendering video (${api.name})`,
      run: async (signal) => {
        const { resultUrl } = await api.renderVideo({ ...renderReq, signal })
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
  ]

  gen.start({
    title: `Creating your ${TYPE_TITLE[type].toLowerCase()}`,
    accent: TAB_ACCENT[type],
    steps,
    onDone: () => input.onComplete?.(jobId),
  })
}

/** Solo wizard step 3 — avatar-only pipeline in the same overlay. */
export function startSoloAvatarPipeline(opts: {
  provider: VideoProviderId
  character: Character
  scene: string
  onAvatarReady: (avatarUrl: string) => void
}): void {
  const api = getVideoProvider(opts.provider)
  warnMissingKeys(opts.provider, false)

  const steps: StepDef[] = [
    {
      id: 'upload',
      label: 'Uploading photo',
      run: async (signal) => {
        // Placeholder for the real upload; instant-ish for good UX.
        await new Promise<void>((resolve, reject) => {
          const t = setTimeout(resolve, 600)
          signal.addEventListener('abort', () => {
            clearTimeout(t)
            reject(new DOMException('aborted', 'AbortError'))
          })
        })
      },
    },
    {
      id: 'avatar',
      label: `Creating avatar (${api.name})`,
      run: async (signal) => {
        const { avatarUrl } = await api.createAvatar({
          type: 'solo',
          character: opts.character,
          scene: opts.scene,
          signal,
        })
        opts.onAvatarReady(avatarUrl)
      },
    },
  ]

  useGenerationStore.getState().start({
    title: 'Generating avatar',
    accent: 'blue',
    steps,
  })
}
