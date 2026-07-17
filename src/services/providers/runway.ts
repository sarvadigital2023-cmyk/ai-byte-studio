import type { ProviderInfo, VideoProviderApi, AvatarRequest, RenderRequest } from './types'
import { mockDelay, maybeFail, mockMediaUrl } from './mock'
import { uid } from '@/types'

const apiKey = () => import.meta.env.VITE_RUNWAY_API_KEY

export const runwayInfo: ProviderInfo = {
  id: 'runway',
  name: 'Runway',
  isConfigured: () => !!apiKey(),
  async testConnection() {
    if (!apiKey()) {
      return { ok: false, message: 'VITE_RUNWAY_API_KEY is not set in the environment' }
    }
    // Real check: GET https://api.dev.runwayml.com/v1/organization with Bearer auth.
    await mockDelay(undefined, 800, 1600)
    return { ok: true, message: 'Runway API reachable' }
  },
}

/**
 * Mock implementation of the Runway pipeline. Replace with real calls to
 * https://api.dev.runwayml.com (gen-4 image/video tasks + polling), keeping
 * the same interface.
 */
export const runwayVideo: VideoProviderApi = {
  id: 'runway',
  name: 'Runway',
  async createAvatar(req: AvatarRequest) {
    await mockDelay(req.signal)
    maybeFail('Runway avatar task failed. Retry the step.')
    return { avatarUrl: mockMediaUrl('avatar', `${req.character.id}-${uid().slice(0, 6)}`) }
  },
  async syncMotion(req: RenderRequest) {
    await mockDelay(req.signal)
    maybeFail('Runway motion sync failed. Retry the step.')
  },
  async renderVideo(req: RenderRequest) {
    await mockDelay(req.signal, 2500, 4000)
    maybeFail('Runway render failed. Retry the step.')
    return { resultUrl: mockMediaUrl('video', uid()) }
  },
}
