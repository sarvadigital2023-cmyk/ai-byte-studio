import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { StudioType, VideoProviderId } from '@/types'
import { getSupabase, getCurrentUserId } from '@/services/supabase'

type Locale = 'en' | 'ru'

function detectLocale(): Locale {
  return typeof navigator !== 'undefined' && navigator.language?.toLowerCase().startsWith('ru')
    ? 'ru'
    : 'en'
}

interface SettingsState {
  /** Global video provider for Solo, Cinema and Cartoon pipelines. */
  videoProvider: VideoProviderId
  /** Last used tab, restored on app open. */
  lastTab: StudioType
  /** UI language. */
  locale: Locale
  setVideoProvider: (id: VideoProviderId) => void
  setLastTab: (tab: StudioType) => void
  setLocale: (locale: Locale) => void
  hydrateFromProfile: () => Promise<void>
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      videoProvider: 'heygen',
      lastTab: 'solo',
      locale: detectLocale(),
      setLocale: (locale) => {
        set({ locale })
        document.documentElement.lang = locale
      },
      setVideoProvider: (id) => {
        set({ videoProvider: id })
        void saveProfilePreference(id)
      },
      setLastTab: (tab) => set({ lastTab: tab }),
      hydrateFromProfile: async () => {
        const supabase = getSupabase()
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
  const supabase = getSupabase()
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
