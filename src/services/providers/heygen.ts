import type {
  AvatarRequest,
  AvatarResult,
  ProviderInfo,
  RenderRequest,
  VideoProviderApi,
} from './types'
import { apiFetch, dataUrlToBlob, mediaProxyUrl, poll, proxyPath } from './http'
import { ProviderError } from './errors'
import { getT, fmt } from '@/i18n'

/**
 * HeyGen client (via the /api/heygen proxy).
 * Flow: photo → talking photo asset → v2/video/generate (HeyGen performs
 * speech-driven lipsync + motion server-side) → poll v1/video_status.get.
 */

const BASE = '/api/heygen'

export const heygenInfo: ProviderInfo = {
  id: 'heygen',
  name: 'HeyGen',
  async testConnection() {
    const t = getT()
    try {
      const res = await apiFetch<{ data?: { remaining_quota?: number } }>(
        proxyPath(BASE, 'v2/user/remaining_quota'),
      )
      const quota = res.data?.remaining_quota
      return {
        ok: true,
        message:
          quota !== undefined
            ? fmt(t.conn.connectedQuota, { n: quota })
            : fmt(t.conn.reachable, { p: 'HeyGen' }),
      }
    } catch (err) {
      return { ok: false, message: err instanceof Error ? err.message : t.conn.failed }
    }
  },
}

interface TalkingPhotoResponse {
  data?: { talking_photo_id?: string; talking_photo_url?: string }
}

async function createTalkingPhoto(image: Blob, signal?: AbortSignal): Promise<AvatarResult> {
  const res = await apiFetch<TalkingPhotoResponse>(proxyPath(BASE, 'v1/talking_photo'), {
    method: 'POST',
    headers: { 'content-type': image.type || 'image/jpeg' },
    body: image,
    signal,
  })
  const id = res.data?.talking_photo_id
  if (!id) throw new ProviderError('HeyGen did not return a talking_photo_id')
  return { avatarId: id, previewUrl: res.data?.talking_photo_url }
}

/** Generates a stylized portrait from a text description (Cartoon Studio). */
async function generatePhotoAvatar(
  req: AvatarRequest,
): Promise<{ imageUrl: string }> {
  const prompt = [req.character.appearance, req.style && `Style: ${req.style}`, '9:16 portrait']
    .filter(Boolean)
    .join('. ')
  const gen = await apiFetch<{ data?: { generation_id?: string } }>(
    proxyPath(BASE, 'v2/photo_avatar/photo/generate'),
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        name: req.character.name || 'Character',
        appearance: prompt,
        orientation: 'vertical',
      }),
      signal: req.signal,
    },
  )
  const generationId = gen.data?.generation_id
  if (!generationId) throw new ProviderError('HeyGen did not return a generation_id')

  return poll(
    async () => {
      const status = await apiFetch<{
        data?: { status?: string; image_url_list?: string[]; msg?: string }
      }>(proxyPath(BASE, `v2/photo_avatar/generation/${generationId}`), { signal: req.signal })
      const s = status.data?.status
      if (s === 'success') {
        const url = status.data?.image_url_list?.[0]
        if (!url) throw new ProviderError('HeyGen returned no portrait image')
        return { imageUrl: url }
      }
      if (s === 'failed') {
        throw new ProviderError(status.data?.msg ?? 'HeyGen portrait generation failed')
      }
      return null
    },
    { signal: req.signal },
  )
}

export const heygenVideo: VideoProviderApi = {
  id: 'heygen',
  name: 'HeyGen',

  async createAvatar(req: AvatarRequest): Promise<AvatarResult> {
    if (req.character.photoUrl) {
      // HeyGen's talking_photo API animates the uploaded photo exactly as
      // provided — it has no endpoint of its own to change a photo's
      // background from a text description, and provider calls must stay
      // within the selected provider (it must never call Runway behind the
      // user's back). The Solo screen already shows a proactive banner about
      // this while HeyGen is selected, so no scene handling is needed here.
      const image = await dataUrlToBlob(req.character.photoUrl)
      const result = await createTalkingPhoto(image, req.signal)
      return { ...result, previewUrl: result.previewUrl ?? req.character.photoUrl }
    }
    if (req.character.appearance) {
      const { imageUrl } = await generatePhotoAvatar(req)
      const image = await apiFetch<Blob>(mediaProxyUrl(imageUrl), { signal: req.signal }, 'blob')
      const result = await createTalkingPhoto(image, req.signal)
      return { ...result, previewUrl: imageUrl }
    }
    throw new ProviderError(
      `Character "${req.character.name}" needs a photo or an appearance description`,
    )
  },

  async prepareSpeechAudio(audio: Blob, signal?: AbortSignal): Promise<string> {
    const res = await apiFetch<{ data?: { id?: string; asset_id?: string } }>(
      proxyPath(BASE, 'v1/asset'),
      {
        method: 'POST',
        headers: { 'content-type': audio.type || 'audio/mpeg' },
        body: audio,
        signal,
      },
    )
    const id = res.data?.id ?? res.data?.asset_id
    if (!id) throw new ProviderError('HeyGen audio asset upload failed')
    return id
  },

  async submitVideo(req: RenderRequest): Promise<{ jobId: string }> {
    if (!req.audioScenes?.length) {
      throw new ProviderError('No speech scenes prepared for the video')
    }
    const video_inputs = req.audioScenes.map((scene) => ({
      character: {
        type: 'talking_photo',
        talking_photo_id: scene.avatarId,
      },
      voice: {
        type: 'audio',
        audio_asset_id: scene.audioRef,
      },
    }))
    const res = await apiFetch<{ data?: { video_id?: string } }>(
      proxyPath(BASE, 'v2/video/generate'),
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          video_inputs,
          dimension: { width: 720, height: 1280 },
        }),
        signal: req.signal,
      },
    )
    const id = res.data?.video_id
    if (!id) throw new ProviderError('HeyGen did not return a video_id')
    return { jobId: id }
  },

  async waitForVideo(jobId: string, signal?: AbortSignal): Promise<{ resultUrl: string }> {
    return poll(
      async () => {
        const res = await apiFetch<{
          data?: { status?: string; video_url?: string; error?: { message?: string } | null }
        }>(
          proxyPath(BASE, 'v1/video_status.get', `&video_id=${encodeURIComponent(jobId)}`),
          { signal },
        )
        const status = res.data?.status
        if (status === 'completed') {
          const url = res.data?.video_url
          if (!url) throw new ProviderError('HeyGen returned no video URL')
          return { resultUrl: url }
        }
        if (status === 'failed') {
          throw new ProviderError(res.data?.error?.message ?? 'HeyGen render failed')
        }
        return null
      },
      { signal },
    )
  },
}
