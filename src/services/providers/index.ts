import type { ProviderId, VideoProviderId } from '@/types'
import type { ProviderInfo, VideoProviderApi } from './types'
import { heygenInfo, heygenVideo } from './heygen'
import { runwayInfo, runwayVideo } from './runway'
import { elevenLabsInfo, elevenLabsVoice } from './elevenlabs'

export const PROVIDERS: Record<ProviderId, ProviderInfo> = {
  heygen: heygenInfo,
  runway: runwayInfo,
  elevenlabs: elevenLabsInfo,
}

const VIDEO_PROVIDERS: Record<VideoProviderId, VideoProviderApi> = {
  heygen: heygenVideo,
  runway: runwayVideo,
}

/** Resolve the video pipeline for the globally selected provider. */
export function getVideoProvider(id: VideoProviderId): VideoProviderApi {
  return VIDEO_PROVIDERS[id]
}

export const voiceProvider = elevenLabsVoice
export { premadeVoiceForIndex } from './elevenlabs'

export { CancelledError, ProviderError } from './errors'
export { getKeyStatus, type KeyStatus } from './health'
export type { ProviderInfo, VideoProviderApi, AudioScene } from './types'
