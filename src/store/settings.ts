import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { StudioType, VideoProviderId } from '@/types'
import { supabase, getCurrentUserId } from '@/services/supabase'

interface SettingsState {
  /** Global video provider for Solo, Cinema and Cartoon pipelines. */
  videoProvider: VideoProviderId
  /** Last used tab, restored on app open. */
  lastTab: StudioType
  setVideoProvider: (id: VideoProviderId) => void
  setLastTab: (tab: StudioType) => void
  hydrateFromProfile: () => Promise<void>
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      videoProvider: 'heygen',
      lastTab: 'solo',
      setVideoProvider: (id) => {
        set({ videoProvider: id })
        void saveProfilePreference(id)
      },
      setLastTab: (tab) => set({ lastTab: tab }),
      hydrateFromProfile: async () => {
        if (!supabase) return
        const userId = await getCurrentUserId()
        if (!userId) return
        const { data } = await supabase
          .from('profiles')
          .select('video_provider')
          .eq('user_id', userId)
          .maybeSingle()
        if (data?.video_provider === 'heygen' || data?.video_provider === 'runway') {
          set({ videoProvider: data.video_provider })
        }
      },
    }),
    { name: 'ai-byte-studio:settings' },
  ),
)

async function saveProfilePreference(id: VideoProviderId): Promise<void> {
  if (!supabase) return
  const userId = await getCurrentUserId()
  if (!userId) return
  try {
    await supabase
      .from('profiles')
      .upsert({ user_id: userId, video_provider: id }, { onConflict: 'user_id' })
  } catch {
    // Local persistence is the fallback; cloud preference is best-effort.
  }
}
