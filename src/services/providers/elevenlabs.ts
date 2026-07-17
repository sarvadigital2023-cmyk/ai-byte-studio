import type { ProviderInfo, VoiceProviderApi } from './types'
import { apiFetch } from './http'
import { ProviderError } from './errors'

/**
 * ElevenLabs client (via the /api/elevenlabs proxy).
 * Instant Voice Cloning (v1/voices/add) + multilingual TTS.
 */

const BASE = '/api/elevenlabs'

/** Premade multilingual voice used when a character has no cloned voice. */
export const DEFAULT_VOICE_ID = '21m00Tcm4TlvDq8ikWAM'

export const elevenLabsInfo: ProviderInfo = {
  id: 'elevenlabs',
  name: 'ElevenLabs',
  async testConnection() {
    try {
      const res = await apiFetch<{ subscription?: { tier?: string } }>(`${BASE}/v1/user`)
      const tier = res.subscription?.tier
      return { ok: true, message: tier ? `Connected · ${tier} plan` : 'ElevenLabs API reachable' }
    } catch (err) {
      return { ok: false, message: err instanceof Error ? err.message : 'Connection failed' }
    }
  },
}

export const elevenLabsVoice: VoiceProviderApi = {
  async cloneVoice(sampleUrl: string, name: string, signal?: AbortSignal) {
    const sample = await (await fetch(sampleUrl)).blob()
    const form = new FormData()
    form.append('name', name)
    form.append('files', sample, 'sample.webm')
    const res = await apiFetch<{ voice_id?: string }>(`${BASE}/v1/voices/add`, {
      method: 'POST',
      body: form,
      signal,
    })
    if (!res.voice_id) throw new ProviderError('ElevenLabs did not return a voice_id')
    return { voiceId: res.voice_id }
  },

  async synthesizeSpeech(text: string, voiceId?: string, signal?: AbortSignal): Promise<Blob> {
    return apiFetch<Blob>(
      `${BASE}/v1/text-to-speech/${voiceId ?? DEFAULT_VOICE_ID}`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          text,
          model_id: 'eleven_multilingual_v2',
        }),
        signal,
      },
      'blob',
    )
  },
}
