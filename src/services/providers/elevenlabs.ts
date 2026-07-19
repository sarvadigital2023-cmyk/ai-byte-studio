import type { ProviderInfo, VoiceProviderApi } from './types'
import { apiFetch, proxyPath } from './http'
import { ProviderError } from './errors'
import { getT, fmt } from '@/i18n'

/**
 * ElevenLabs client (via the /api/elevenlabs proxy).
 * Instant Voice Cloning (v1/voices/add) + multilingual TTS.
 */

const BASE = '/api/elevenlabs'

/**
 * Premade multilingual voices, used when a character has no cloned voice.
 * A rotating set (not a single default) so that, in Cinema/Cartoon, distinct
 * characters don't all speak in the same voice. `premadeVoiceForIndex` picks
 * deterministically by character position.
 */
export const PREMADE_VOICE_IDS = [
  '21m00Tcm4TlvDq8ikWAM', // Rachel
  'AZnzlk1XvdvUeBnXmlld', // Domi
  'ErXwobaYiN019PkySvjV', // Antoni
  'MF3mGyEYCl7XYWbV9V6O', // Elli
  'TxGEqnHWrfWFTfGW9XjX', // Josh
  'pNInz6obpgDQGcFmaJgB', // Adam
]

export const DEFAULT_VOICE_ID = PREMADE_VOICE_IDS[0]

export function premadeVoiceForIndex(index: number): string {
  return PREMADE_VOICE_IDS[index % PREMADE_VOICE_IDS.length]
}

/** Picks a sensible upload filename from the recorded blob's MIME type — iOS
 * Safari records audio/mp4, not webm, and ElevenLabs keys off the extension. */
function audioFileName(type: string): string {
  if (type.includes('mp4') || type.includes('m4a')) return 'sample.mp4'
  if (type.includes('mpeg') || type.includes('mp3')) return 'sample.mp3'
  if (type.includes('ogg')) return 'sample.ogg'
  if (type.includes('wav')) return 'sample.wav'
  return 'sample.webm'
}

export const elevenLabsInfo: ProviderInfo = {
  id: 'elevenlabs',
  name: 'ElevenLabs',
  async testConnection() {
    const t = getT()
    try {
      const res = await apiFetch<{ subscription?: { tier?: string } }>(proxyPath(BASE, 'v1/user'))
      const tier = res.subscription?.tier
      return {
        ok: true,
        message: tier
          ? fmt(t.conn.connectedPlan, { plan: tier })
          : fmt(t.conn.reachable, { p: 'ElevenLabs' }),
      }
    } catch (err) {
      return { ok: false, message: err instanceof Error ? err.message : t.conn.failed }
    }
  },
}

export const elevenLabsVoice: VoiceProviderApi = {
  async cloneVoice(sampleUrl: string, name: string, signal?: AbortSignal) {
    const sample = await (await fetch(sampleUrl)).blob()
    const form = new FormData()
    form.append('name', name)
    form.append('files', sample, audioFileName(sample.type))
    const res = await apiFetch<{ voice_id?: string }>(proxyPath(BASE, 'v1/voices/add'), {
      method: 'POST',
      body: form,
      signal,
    })
    if (!res.voice_id) throw new ProviderError('ElevenLabs did not return a voice_id')
    return { voiceId: res.voice_id }
  },

  async synthesizeSpeech(text: string, voiceId?: string, signal?: AbortSignal): Promise<Blob> {
    return apiFetch<Blob>(
      proxyPath(BASE, `v1/text-to-speech/${voiceId ?? DEFAULT_VOICE_ID}`),
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
