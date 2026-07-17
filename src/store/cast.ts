import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Character, CartoonStyle, VideoProviderId, VoiceSample } from '@/types'
import { uid, MAX_CHARACTERS } from '@/types'
import { getVideoProvider } from '@/services/providers'
import { toast } from '@/store/toasts'
import { getT } from '@/i18n'

/**
 * Shared multi-character store factory used by Cinema Studio and
 * Cartoon Studio — same cast rules (5–6 characters), separate persistence.
 */

export interface CastState {
  characters: Character[]
  script: string
  style: CartoonStyle
  generatingAll: boolean
  addCharacter: () => Character | null
  updateCharacter: (id: string, patch: Partial<Character>) => void
  removeCharacter: (id: string) => void
  setVoice: (id: string, status: Character['voiceStatus'], sample?: VoiceSample) => void
  setScript: (script: string) => void
  setStyle: (style: CartoonStyle) => void
  /** Sequential avatar generation with per-card progress. */
  generateAll: (provider: VideoProviderId, kind: 'cinema' | 'cartoon') => Promise<void>
  retryCharacter: (provider: VideoProviderId, kind: 'cinema' | 'cartoon', id: string) => Promise<void>
  reset: () => void
}

function blankCharacter(index: number): Character {
  return {
    id: uid(),
    name: `Character ${index + 1}`,
    role: '',
    appearance: '',
    voiceStatus: 'none',
    avatarStatus: 'idle',
  }
}

export function createCastStore(storageKey: string) {
  return create<CastState>()(
    persist(
      (set, get) => {
        async function generateOne(
          provider: VideoProviderId,
          kind: 'cinema' | 'cartoon',
          id: string,
        ): Promise<void> {
          const api = getVideoProvider(provider)
          const char = get().characters.find((c) => c.id === id)
          if (!char) return
          set((s) => ({
            characters: s.characters.map((c) =>
              c.id === id ? { ...c, avatarStatus: 'generating' } : c,
            ),
          }))
          try {
            const { avatarId, previewUrl } = await api.createAvatar({
              type: kind,
              character: char,
              style: kind === 'cartoon' ? get().style : undefined,
            })
            set((s) => ({
              characters: s.characters.map((c) =>
                c.id === id
                  ? {
                      ...c,
                      avatarStatus: 'done',
                      avatarId,
                      avatarUrl: previewUrl ?? c.photoUrl,
                    }
                  : c,
              ),
            }))
          } catch (err) {
            toast(err instanceof Error ? err.message : getT().cast.avatarFailed, 'error')
            set((s) => ({
              characters: s.characters.map((c) =>
                c.id === id ? { ...c, avatarStatus: 'error' } : c,
              ),
            }))
          }
        }

        return {
          characters: [],
          script: '',
          style: 'pixar3d' as CartoonStyle,
          generatingAll: false,

          addCharacter: () => {
            const { characters } = get()
            if (characters.length >= MAX_CHARACTERS) return null
            const c = blankCharacter(characters.length)
            set({ characters: [...characters, c] })
            return c
          },

          updateCharacter: (id, patch) =>
            set((s) => ({
              characters: s.characters.map((c) => (c.id === id ? { ...c, ...patch } : c)),
            })),

          removeCharacter: (id) =>
            set((s) => ({ characters: s.characters.filter((c) => c.id !== id) })),

          setVoice: (id, status, sample) =>
            set((s) => ({
              characters: s.characters.map((c) =>
                c.id === id ? { ...c, voiceStatus: status, voiceSample: sample } : c,
              ),
            })),

          setScript: (script) => set({ script }),
          setStyle: (style) => set({ style }),

          generateAll: async (provider, kind) => {
            const pending = get().characters.filter((c) => c.avatarStatus !== 'done')
            set((s) => ({
              generatingAll: true,
              characters: s.characters.map((c) =>
                c.avatarStatus === 'done' ? c : { ...c, avatarStatus: 'queued' },
              ),
            }))
            for (const c of pending) {
              await generateOne(provider, kind, c.id)
            }
            set({ generatingAll: false })
          },

          retryCharacter: async (provider, kind, id) => {
            await generateOne(provider, kind, id)
          },

          reset: () => set({ characters: [], script: '', generatingAll: false }),
        }
      },
      {
        name: storageKey,
        partialize: (s) => ({
          characters: s.characters.map((c) => ({
            ...c,
            voiceSample: undefined,
            // an interrupted generation resumes as idle after reload
            avatarStatus: (c.avatarStatus === 'done' ? 'done' : 'idle') as Character['avatarStatus'],
          })),
          script: s.script,
          style: s.style,
        }),
      },
    ),
  )
}

export const useCinemaStore = createCastStore('ai-byte-studio:cinema')
export const useCartoonStore = createCastStore('ai-byte-studio:cartoon')
