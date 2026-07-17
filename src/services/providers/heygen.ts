import type { ProviderInfo, VideoProviderApi, AvatarRequest, RenderRequest } from './types'
import { mockDelay, maybeFail, mockMediaUrl } from './mock'
import { uid } from '@/types'

const apiKey = () => import.meta.env.VITE_HEYGEN_API_KEY

export const heygenInfo: ProviderInfo = {
  id: 'heygen',
  name: 'HeyGen',
  isConfigured: () => !!apiKey(),
  async testConnection() {
    if (!apiKey()) {
      return { ok: false, message: 'VITE_HEYGEN_API_KEY is not set in the environment' }
    }
    // Real check: GET https://api.heygen.com/v2/user/remaining_quota with X-Api-Key.
    await mockDelay(undefined, 800, 1600)
    return { ok: true, message: 'HeyGen API reachable' }
  },
}

/**
 * Mock implementation of the HeyGen pipeline. Replace the bodies with real
 * calls to https://api.heygen.com (photo avatar → video generate → poll status)
 * keeping the same interface.
 */
export const heygenVideo: VideoProviderApi = {
  id: 'heygen',
  name: 'HeyGen',
  async createAvatar(req: AvatarRequest) {
    await mockDelay(req.signal)
    maybeFail('HeyGen could not detect a face in the photo. Try a clearer close-up.')
    return { avatarUrl: mockMediaUrl('avatar', `${req.character.id}-${uid().slice(0, 6)}`) }
  },
  async syncMotion(req: RenderRequest) {
    await mockDelay(req.signal)
    maybeFail('HeyGen motion sync timed out. Retry the step.')
  },
  async renderVideo(req: RenderRequest) {
    await mockDelay(req.signal, 2500, 4000)
    maybeFail('HeyGen render queue is busy. Retry the step.')
    return { resultUrl: mockMediaUrl('video', uid()) }
  },
}
