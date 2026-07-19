import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Character, VideoProviderId, VoiceSample } from '@/types'
import { uid } from '@/types'
import { persistableCharacter } from './persistVoice'

/** Solo Avatar wizard state — one implicit character. */

function blankCharacter(): Character {
  return {
    id: uid(),
    name: 'Me',
    role: '',
    voiceStatus: 'none',
    avatarStatus: 'idle',
  }
}

/** Clears any generated avatar (photo or scene changed → it's stale). */
function invalidateAvatar(c: Character): Character {
  return { ...c, avatarStatus: 'idle', avatarUrl: undefined, avatarId: undefined, avatarProvider: undefined }
}

interface SoloState {
  character: Character
  scene: string
  speechText: string
  setPhoto: (dataUrl: string | undefined) => void
  setScene: (scene: string) => void
  setSpeechText: (text: string) => void
  setAvatar: (
    status: Character['avatarStatus'],
    url?: string,
    avatarId?: string,
    provider?: VideoProviderId,
  ) => void
  setVoice: (status: Character['voiceStatus'], sample?: VoiceSample) => void
  reset: () => void
}

export const useSoloStore = create<SoloState>()(
  persist(
    (set) => ({
      character: blankCharacter(),
      scene: '',
      speechText: '',
      setPhoto: (dataUrl) =>
        set((s) => ({ character: invalidateAvatar({ ...s.character, photoUrl: dataUrl }) })),
      setScene: (scene) =>
        set((s) =>
          scene === s.scene
            ? { scene }
            : // changing the scene invalidates a previously generated avatar,
              // otherwise the video would render the old scene silently
              { scene, character: s.character.avatarId ? invalidateAvatar(s.character) : s.character },
        ),
      setSpeechText: (speechText) => set({ speechText }),
      setAvatar: (status, url, avatarId, provider) =>
        set((s) => ({
          character: {
            ...s.character,
            avatarStatus: status,
            avatarUrl: url ?? s.character.avatarUrl,
            avatarId: avatarId ?? s.character.avatarId,
            avatarProvider: provider ?? s.character.avatarProvider,
          },
        })),
      setVoice: (status, sample) =>
        set((s) => ({
          character: { ...s.character, voiceStatus: status, voiceSample: sample },
        })),
      reset: () => set({ character: blankCharacter(), scene: '', speechText: '' }),
    }),
    {
      name: 'ai-byte-studio:solo',
      partialize: (s) => ({ ...s, character: persistableCharacter(s.character) }),
    },
  ),
)
