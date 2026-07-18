import type {
  AvatarRequest,
  AvatarResult,
  ProviderInfo,
  RenderRequest,
  VideoProviderApi,
} from './types'
import { apiFetch, poll, proxyPath } from './http'
import { ProviderError } from './errors'
import { compositeSceneWithPhoto } from './runwaySceneComposite'
import { toast } from '@/store/toasts'

/**
 * Runway client (via the /api/runway proxy).
 * text_to_image (gen4_image) for stylized portraits, image_to_video
 * (gen4_turbo) for the final render, polled through v1/tasks/{id}.
 *
 * Note: Runway's public API has no audio-driven lipsync — videos are
 * prompt-driven animations of the avatar. For speech-synced avatars use
 * HeyGen as the Video Provider.
 */

const BASE = '/api/runway'
const RATIO_PORTRAIT = '720:1280'

export const runwayInfo: ProviderInfo = {
  id: 'runway',
  name: 'Runway',
  async testConnection() {
    try {
      await apiFetch(proxyPath(BASE, 'v1/organization'))
      return { ok: true, message: 'Runway API reachable' }
    } catch (err) {
      return { ok: false, message: err instanceof Error ? err.message : 'Connection failed' }
    }
  },
}

interface TaskResponse {
  id?: string
  status?: string
  output?: string[]
  failure?: string
}

async function waitForTask(taskId: string, signal?: AbortSignal): Promise<string> {
  return poll(
    async () => {
      const task = await apiFetch<TaskResponse>(proxyPath(BASE, `v1/tasks/${taskId}`), { signal })
      if (task.status === 'SUCCEEDED') {
        const url = task.output?.[0]
        if (!url) throw new ProviderError('Runway task returned no output')
        return url
      }
      if (task.status === 'FAILED' || task.status === 'CANCELLED') {
        throw new ProviderError(task.failure ?? `Runway task ${task.status?.toLowerCase()}`)
      }
      return null
    },
    { signal },
  )
}

export const runwayVideo: VideoProviderApi = {
  id: 'runway',
  name: 'Runway',

  async createAvatar(req: AvatarRequest): Promise<AvatarResult> {
    // Photo-based characters: the image itself is the avatar source. If a
    // scene was chosen, regenerate the photo in that scene first (identity
    // preserved via a reference image) — otherwise the scene never shows up.
    if (req.character.photoUrl) {
      if (req.scene?.trim()) {
        try {
          const imageUrl = await compositeSceneWithPhoto(
            req.character.photoUrl,
            req.scene.trim(),
            req.signal,
          )
          return { avatarId: imageUrl, previewUrl: imageUrl }
        } catch (err) {
          toast(err instanceof Error ? err.message : 'Could not generate the scene', 'warning', {
            hint: 'Using your original photo instead.',
          })
        }
      }
      return { avatarId: req.character.photoUrl, previewUrl: req.character.photoUrl }
    }
    // Described characters (Cartoon Studio): generate a stylized portrait.
    if (req.character.appearance) {
      const prompt = [
        `Portrait of ${req.character.name || 'a character'}: ${req.character.appearance}`,
        req.style && `Style: ${req.style}`,
      ]
        .filter(Boolean)
        .join('. ')
      const task = await apiFetch<TaskResponse>(proxyPath(BASE, 'v1/text_to_image'), {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          model: 'gen4_image',
          promptText: prompt,
          ratio: RATIO_PORTRAIT,
        }),
        signal: req.signal,
      })
      if (!task.id) throw new ProviderError('Runway did not return a task id')
      const imageUrl = await waitForTask(task.id, req.signal)
      return { avatarId: imageUrl, previewUrl: imageUrl }
    }
    throw new ProviderError(
      `Character "${req.character.name}" needs a photo or an appearance description`,
    )
  },

  async submitVideo(req: RenderRequest): Promise<{ jobId: string }> {
    const lead = req.characters.find((c) => c.avatarId) ?? req.characters[0]
    if (!lead?.avatarId) throw new ProviderError('Generate the avatars first')
    const promptText = [
      req.scene,
      req.script && `Scene based on this script: ${req.script.slice(0, 500)}`,
      req.speechText && `The character is speaking: ${req.speechText.slice(0, 300)}`,
      req.style && `Style: ${req.style}`,
      'Vertical 9:16 video, natural motion, cinematic lighting',
    ]
      .filter(Boolean)
      .join('. ')
    const task = await apiFetch<TaskResponse>(proxyPath(BASE, 'v1/image_to_video'), {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        model: 'gen4_turbo',
        promptImage: lead.avatarId,
        promptText,
        ratio: RATIO_PORTRAIT,
        duration: 10,
      }),
      signal: req.signal,
    })
    if (!task.id) throw new ProviderError('Runway did not return a task id')
    return { jobId: task.id }
  },

  async waitForVideo(jobId: string, signal?: AbortSignal): Promise<{ resultUrl: string }> {
    const resultUrl = await waitForTask(jobId, signal)
    return { resultUrl }
  },
}
