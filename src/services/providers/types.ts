import type { Character, StudioType, VideoProviderId } from '@/types'

/**
 * Provider abstraction. The UI only ever talks to these interfaces, so the
 * mock implementations can be swapped for real HTTP clients without touching
 * a single component.
 */

export interface ProviderInfo {
  id: 'heygen' | 'runway' | 'elevenlabs'
  name: string
  /** Whether the API key is present in the environment. */
  isConfigured: () => boolean
  /** Async connection check (mocked until real APIs are wired). */
  testConnection: () => Promise<{ ok: boolean; message: string }>
}

export interface AvatarRequest {
  type: StudioType
  character: Character
  scene?: string
  style?: string
  signal?: AbortSignal
}

export interface RenderRequest {
  type: StudioType
  provider: VideoProviderId
  characters: Character[]
  script?: string
  scene?: string
  speechText?: string
  style?: string
  signal?: AbortSignal
}

/** Video pipeline steps handled by HeyGen / Runway. */
export interface VideoProviderApi {
  id: VideoProviderId
  name: string
  createAvatar(req: AvatarRequest): Promise<{ avatarUrl: string }>
  /** Lipsync + body motion, driven by the synthesized voiceover. */
  syncMotion(req: RenderRequest): Promise<void>
  renderVideo(req: RenderRequest): Promise<{ resultUrl: string }>
}

/** Speech synthesis / voice cloning, handled by ElevenLabs. */
export interface VoiceProviderApi {
  cloneVoice(sampleUrl: string, signal?: AbortSignal): Promise<{ voiceId: string }>
  synthesizeSpeech(text: string, signal?: AbortSignal): Promise<{ audioUrl: string }>
}
