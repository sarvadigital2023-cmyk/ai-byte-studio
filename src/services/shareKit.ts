import type { ShareKit, ShareKitEntry, SharePlatform, StudioType } from '@/types'
import { SHARE_PLATFORMS } from '@/types'

/**
 * Generates platform-optimized publishing texts. Mocked with templates for
 * now — swap `buildEntry` for an LLM call later without touching the UI.
 */

const TYPE_LABEL: Record<StudioType, string> = {
  solo: 'AI avatar video',
  cinema: 'AI mini-movie',
  cartoon: 'AI cartoon',
}

const TYPE_TAGS: Record<StudioType, string[]> = {
  solo: ['#aiavatar', '#digitalclone', '#talkingavatar'],
  cinema: ['#aimovie', '#aifilm', '#virtualactors'],
  cartoon: ['#aicartoon', '#aianimation', '#cartoonai'],
}

const BASE_TAGS = ['#ai', '#aivideo', '#aibytestudio', '#generativeai']

function pick<T>(arr: T[], seed: number): T {
  return arr[seed % arr.length]
}

function buildEntry(
  platform: SharePlatform,
  type: StudioType,
  title: string,
  seed: number,
): ShareKitEntry {
  const label = TYPE_LABEL[type]
  const hooks = [
    `You won't believe this is AI 🤯`,
    `Made in minutes with AI ⚡`,
    `The future of video is here 🚀`,
    `Zero cameras. 100% AI ✨`,
  ]
  const hook = pick(hooks, seed)
  const tags = [...BASE_TAGS, ...TYPE_TAGS[type]]

  switch (platform) {
    case 'tiktok':
      return {
        platform,
        title: `${hook} — ${title}`,
        description: `${label} "${title}" created entirely with AI Byte Studio. Follow for more AI experiments! 🔥`,
        hashtags: [...tags, '#fyp', '#foryou', '#viral'].join(' '),
      }
    case 'instagram-reels':
      return {
        platform,
        title: `${title} ✨`,
        description: `${hook}\n\nThis ${label} was generated with AI Byte Studio — avatar, voice and motion, all AI.\n\nSave this for your next project 📌`,
        hashtags: [...tags, '#reels', '#reelsinstagram', '#explore'].join(' '),
      }
    case 'facebook-reels':
      return {
        platform,
        title,
        description: `${hook} This ${label} was made end-to-end with AI Byte Studio. What should we generate next? Tell us in the comments 👇`,
        hashtags: [...tags, '#facebookreels'].join(' '),
      }
    case 'youtube':
      return {
        platform,
        title: `${title} | ${label} made with AI Byte Studio`,
        description: `${hook}\n\nIn this video: "${title}" — a ${label} generated with AI Byte Studio.\n\n⏱ Pipeline: avatar generation → voice cloning → motion sync (lipsync + gestures) → final render.\n\n👍 Like & subscribe for more AI-generated content.`,
        hashtags: [...tags, '#youtube'].join(' '),
      }
    case 'youtube-shorts':
      return {
        platform,
        title: `${hook} #Shorts`,
        description: `"${title}" — ${label} generated with AI Byte Studio. Subscribe for more!`,
        hashtags: [...tags, '#shorts', '#ytshorts'].join(' '),
      }
  }
}

export function generateShareKit(type: StudioType, title: string): ShareKit {
  const seed = Math.floor(Math.random() * 1000)
  const kit: ShareKit = {}
  for (const { id } of SHARE_PLATFORMS) {
    kit[id] = buildEntry(id, type, title, seed + id.length)
  }
  return kit
}
