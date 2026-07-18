import { apiFetch, poll, proxyPath } from './http'
import { ProviderError } from './errors'

/**
 * Regenerates a photo with a new scene/background via Runway's gen4_image,
 * using the original photo as an identity reference (`referenceImages`,
 * `@Person` in the prompt). Shared by both HeyGen and Runway avatar
 * creation: HeyGen's talking_photo API has no way to swap a photo's
 * background on its own, and Runway's photo-based avatar path previously
 * used the uploaded photo unchanged, ignoring the scene entirely. This is
 * why a chosen scene ("Office", "Neon studio", …) never showed up in either
 * provider's generated avatar.
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
