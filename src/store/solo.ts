import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Character, VoiceSample } from '@/types'
import { uid } from '@/types'

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

interface SoloState {
  character: Character
  scene: string
  speechText: string
  setPhoto: (dataUrl: string | undefined) => void
  setScene: (scene: string) => void
  setSpeechText: (text: string) => void
  setAvatar: (status: Character['avatarStatus'], url?: string) => void
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
        set((s) => ({
          character: {
            ...s.character,
            photoUrl: dataUrl,
            // changing the photo invalidates a previously generated avatar
            avatarStatus: 'idle',
            avatarUrl: undefined,
          },
        })),
      setScene: (scene) => set({ scene }),
      setSpeechText: (speechText) => set({ speechText }),
      setAvatar: (status, url) =>
        set((s) => ({
          character: { ...s.character, avatarStatus: status, avatarUrl: url ?? s.character.avatarUrl },
        })),
      setVoice: (status, sample) =>
        set((s) => ({
          character: { ...s.character, voiceStatus: status, voiceSample: sample },
        })),
      reset: () => set({ character: blankCharacter(), scene: '', speechText: '' }),
    }),
    {
      name: 'ai-byte-studio:solo',
      partialize: (s) => ({
        ...s,
        // blob: URLs don't survive a reload — drop the sample, keep the status
        character: { ...s.character, voiceSample: undefined },
      }),
    },
  ),
)
