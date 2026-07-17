import type { ProviderInfo, VoiceProviderApi } from './types'
import { mockDelay, maybeFail } from './mock'
import { uid } from '@/types'

const apiKey = () => import.meta.env.VITE_ELEVENLABS_API_KEY

export const elevenLabsInfo: ProviderInfo = {
  id: 'elevenlabs',
  name: 'ElevenLabs',
  isConfigured: () => !!apiKey(),
  async testConnection() {
    if (!apiKey()) {
      return { ok: false, message: 'VITE_ELEVENLABS_API_KEY is not set in the environment' }
    }
    // Real check: GET https://api.elevenlabs.io/v1/user with xi-api-key header.
    await mockDelay(undefined, 800, 1600)
    return { ok: true, message: 'ElevenLabs API reachable' }
  },
}

/**
 * Mock ElevenLabs client. Replace with real calls to
 * https://api.elevenlabs.io/v1 (voices/add for IVC cloning, text-to-speech),
 * keeping the same interface.
 */
export const elevenLabsVoice: VoiceProviderApi = {
  async cloneVoice(_sampleUrl: string, signal?: AbortSignal) {
    await mockDelay(signal)
    maybeFail('ElevenLabs voice cloning failed. Try a longer, cleaner sample.', 0.08)
    return { voiceId: `voice_${uid().slice(0, 8)}` }
  },
  async synthesizeSpeech(_text: string, signal?: AbortSignal) {
    await mockDelay(signal)
    maybeFail('ElevenLabs speech synthesis failed. Retry the step.', 0.08)
    return { audioUrl: `mock://audio/${uid()}` }
  },
}
