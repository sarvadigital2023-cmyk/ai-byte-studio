import type { Character, StudioType, VideoProviderId } from '@/types'

/**
 * Provider abstraction. The UI and pipeline only talk to these interfaces;
 * implementations live in heygen.ts / runway.ts / elevenlabs.ts and call the
 * real APIs through the /api/* serverless proxies.
 */

export interface ProviderInfo {
  id: 'heygen' | 'runway' | 'elevenlabs'
  name: string
  /** Live connection check against the provider's account endpoint. */
  testConnection: () => Promise<{ ok: boolean; message: string }>
}

export interface AvatarRequest {
  type: StudioType
  character: Character
  scene?: string
  style?: string
  signal?: AbortSignal
}

export interface AvatarResult {
  /** Provider-side id used for video generation (e.g. HeyGen talking_photo_id). */
  avatarId: string
  /** Displayable preview image (URL or data URL), when available. */
  previewUrl?: string
}

/** One spoken line, with provider-side audio reference when speech is used. */
export interface AudioScene {
  characterId: string
  avatarId: string
  audioRef: string
}

export interface RenderRequest {
  type: StudioType
  provider: VideoProviderId
  characters: Character[]
  script?: string
  scene?: string
  speechText?: string
  style?: string
  /** Prepared by the speech step (HeyGen path). */
  audioScenes?: AudioScene[]
  signal?: AbortSignal
}

export interface VideoProviderApi {
  id: VideoProviderId
  name: string
  createAvatar(req: AvatarRequest): Promise<AvatarResult>
  /**
   * Uploads synthesized/recorded speech audio to the provider and returns a
   * reference usable in submitVideo. Absent when the provider cannot drive
   * video from audio (Runway's public API has no audio lipsync).
   */
  prepareSpeechAudio?(audio: Blob, signal?: AbortSignal): Promise<string>
  /** Submits the render job (motion sync + render happen provider-side). */
  submitVideo(req: RenderRequest): Promise<{ jobId: string }>
  /** Polls until the video is ready and returns its URL. */
  waitForVideo(jobId: string, signal?: AbortSignal): Promise<{ resultUrl: string }>
}

export interface VoiceProviderApi {
  /** Instant voice cloning from a recorded sample. */
  cloneVoice(sampleUrl: string, name: string, signal?: AbortSignal): Promise<{ voiceId: string }>
  /** Text-to-speech; returns the audio blob. */
  synthesizeSpeech(text: string, voiceId?: string, signal?: AbortSignal): Promise<Blob>
}
