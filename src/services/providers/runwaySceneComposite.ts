import { apiFetch, poll, proxyPath } from './http'
import { ProviderError } from './errors'

/**
 * Runway-only. Regenerates a photo with a new scene/background via Runway's
 * gen4_image, using the original photo as an identity reference
 * (`referenceImages`, `@Person` in the prompt).
 *
 * Import this ONLY from runway.ts. Provider clients must never call another
 * provider's proxy — a previous version of this file was shared between
 * heygen.ts and runway.ts, which made HeyGen silently call Runway's API
 * whenever a scene was set, even when the user had selected HeyGen as the
 * video provider. Each provider's calls must stay within that provider.
 */

const RUNWAY_BASE = '/api/runway'
const RATIO_PORTRAIT = '720:1280'

interface TaskResponse {
  id?: string
  status?: string
  output?: string[]
  failure?: string
}

export async function compositeSceneWithPhoto(
  photoDataUrl: string,
  scene: string,
  signal?: AbortSignal,
): Promise<string> {
  const task = await apiFetch<TaskResponse>(proxyPath(RUNWAY_BASE, 'v1/text_to_image'), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      model: 'gen4_image',
      promptText:
        `@Person, in this scene: ${scene}. Keep the person's face, identity and outfit ` +
        `unchanged; change only the setting and background. Photorealistic, vertical 9:16 ` +
        `portrait, natural lighting.`,
      ratio: RATIO_PORTRAIT,
      referenceImages: [{ uri: photoDataUrl, tag: 'Person' }],
    }),
    signal,
  })
  if (!task.id) throw new ProviderError('Runway did not return a task id for the scene')

  return poll(
    async () => {
      const t = await apiFetch<TaskResponse>(proxyPath(RUNWAY_BASE, `v1/tasks/${task.id}`), {
        signal,
      })
      if (t.status === 'SUCCEEDED') {
        const url = t.output?.[0]
        if (!url) throw new ProviderError('Runway returned no scene image')
        return url
      }
      if (t.status === 'FAILED' || t.status === 'CANCELLED') {
        throw new ProviderError(t.failure ?? 'Scene generation failed')
      }
      return null
    },
    { signal },
  )
}
