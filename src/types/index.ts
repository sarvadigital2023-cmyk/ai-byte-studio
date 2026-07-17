/** Domain types shared across the whole app. */

export type StudioType = 'solo' | 'cinema' | 'cartoon'

export type ProviderId = 'heygen' | 'runway' | 'elevenlabs'

/** Providers that can render video (global app setting). */
export type VideoProviderId = 'heygen' | 'runway'

export type VoiceStatus = 'none' | 'recorded' | 'cloned'

export interface VoiceSample {
  /** Object URL (local mode) or storage URL of the recorded audio. */
  url: string
  durationSec: number
  recordedAt: string
}

export type AvatarStatus = 'idle' | 'queued' | 'generating' | 'done' | 'error'

export interface Character {
  id: string
  name: string
  /** "Role in the scene" (cinema) — also reused as a short bio. */
  role: string
  /** Uploaded photo (cinema / solo). */
  photoUrl?: string
  /** Detailed appearance description (cartoon). */
  appearance?: string
  voiceStatus: VoiceStatus
  voiceSample?: VoiceSample
  avatarStatus: AvatarStatus
  avatarUrl?: string
}

export type CartoonStyle = 'pixar3d' | 'anime' | 'flat2d' | 'claymation'

export const CARTOON_STYLES: { id: CartoonStyle; label: string }[] = [
  { id: 'pixar3d', label: 'Pixar 3D' },
  { id: 'anime', label: 'Anime' },
  { id: 'flat2d', label: '2D Flat' },
  { id: 'claymation', label: 'Claymation' },
]

export type GenerationStepStatus = 'pending' | 'active' | 'done' | 'error'

export interface GenerationStep {
  id: string
  label: string
  status: GenerationStepStatus
  errorMessage?: string
}

export type GenerationStatus = 'idle' | 'running' | 'error' | 'done' | 'cancelled'

export type SharePlatform =
  | 'tiktok'
  | 'instagram-reels'
  | 'facebook-reels'
  | 'youtube'
  | 'youtube-shorts'

export const SHARE_PLATFORMS: { id: SharePlatform; label: string }[] = [
  { id: 'tiktok', label: 'TikTok' },
  { id: 'instagram-reels', label: 'Instagram Reels' },
  { id: 'facebook-reels', label: 'Facebook Reels' },
  { id: 'youtube', label: 'YouTube' },
  { id: 'youtube-shorts', label: 'YouTube Shorts' },
]

export interface ShareKitEntry {
  platform: SharePlatform
  title: string
  description: string
  hashtags: string
}

export type ShareKit = Partial<Record<SharePlatform, ShareKitEntry>>

export interface GenerationJob {
  id: string
  projectId: string
  type: StudioType
  title: string
  status: GenerationStatus
  provider: VideoProviderId
  steps: GenerationStep[]
  resultUrl?: string
  shareKit: ShareKit
  createdAt: string
}

export interface ProjectPayload {
  characters: Character[]
  script?: string
  scene?: string
  speechText?: string
  style?: CartoonStyle
}

export interface Project {
  id: string
  type: StudioType
  title: string
  createdAt: string
  updatedAt: string
  payload: ProjectPayload
}

export type ConnectionTestState = 'idle' | 'testing' | 'ok' | 'fail'

export const TAB_ORDER: StudioType[] = ['solo', 'cinema', 'cartoon']

export const TAB_ACCENT: Record<StudioType, 'blue' | 'pink' | 'green'> = {
  solo: 'blue',
  cinema: 'pink',
  cartoon: 'green',
}

export const MIN_CHARACTERS = 5
export const MAX_CHARACTERS = 6

export function uid(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}
