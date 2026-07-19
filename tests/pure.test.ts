import { describe, expect, it } from 'vitest'
import { cartoonStyleLabel, uid, MIN_CHARACTERS, MAX_CHARACTERS } from '@/types'
import { pathFromQuery, queryString } from '../api/_proxy'
import type { VercelRequest } from '@vercel/node'

function req(url: string): VercelRequest {
  return { url, headers: {} } as unknown as VercelRequest
}

describe('cartoonStyleLabel', () => {
  it('maps ids to human labels', () => {
    expect(cartoonStyleLabel('pixar3d')).toBe('Pixar 3D')
    expect(cartoonStyleLabel('flat2d')).toBe('2D Flat')
  })
})

describe('character limits', () => {
  it('are the documented 5–6 range', () => {
    expect(MIN_CHARACTERS).toBe(5)
    expect(MAX_CHARACTERS).toBe(6)
  })
})

describe('uid', () => {
  it('returns a non-empty unique-ish string', () => {
    expect(uid().length).toBeGreaterThan(0)
    expect(uid()).not.toBe(uid())
  })
})

describe('proxy path parsing', () => {
  it('reads the ?path= param and decodes slashes', () => {
    expect(pathFromQuery(req('/api/heygen?path=v2%2Fuser%2Fremaining_quota'))).toBe(
      'v2/user/remaining_quota',
    )
  })

  it('returns empty when no path param is present', () => {
    expect(pathFromQuery(req('/api/heygen'))).toBe('')
  })

  it('forwards other query params but drops our own path param', () => {
    expect(queryString(req('/api/heygen?path=v1/x&video_id=abc&n=2'))).toBe('?video_id=abc&n=2')
    expect(queryString(req('/api/heygen?path=v1/x'))).toBe('')
  })
})
