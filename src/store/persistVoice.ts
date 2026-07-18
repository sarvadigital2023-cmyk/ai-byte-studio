import type { Character } from '@/types'

/**
 * Normalizes a character for persistence to localStorage.
 *
 * A recorded voice sample is a `blob:` object URL that does NOT survive a
 * reload, so:
 *   - a *cloned* voice keeps working (its ElevenLabs `voiceId` is a durable
 *     server-side id) — we keep the id but drop the dead blob url;
 *   - a merely *recorded* (not cloned) voice can't be replayed after reload,
 *     so it's downgraded to 'none' instead of leaving the wizard falsely
 *     showing the speech step as complete and then failing mid-generation.
 *
 * An in-flight avatar generation resumes as 'idle' after reload.
 */
export function persistableCharacter(c: Character): Character {
  const voiceId = c.voiceSample?.voiceId
  const cloned = c.voiceStatus === 'cloned' && !!voiceId
  return {
    ...c,
    voiceStatus: cloned ? 'cloned' : 'none',
    voiceSample: cloned
      ? { url: '', durationSec: c.voiceSample!.durationSec, recordedAt: c.voiceSample!.recordedAt, voiceId }
      : undefined,
    avatarStatus: c.avatarStatus === 'done' ? 'done' : 'idle',
  }
}
