import { describe, expect, it } from 'vitest'
import { bouncePatrolLetterVideos } from './youtube'

describe('bouncePatrolLetterVideos', () => {
  it('one video per unique A-Z letter, baked ids, junk dropped', () => {
    // Pure map lookup — no network.
    const videos = bouncePatrolLetterVideos(['a', 'A', ' b ', '3', ''])
    expect(videos).toHaveLength(2)
    expect(videos[0]).toMatchObject({
      title: 'The Letter A Song - Learn the Alphabet',
      channel: 'Bounce Patrol - Kids Songs',
      video_id: 'gsb999VSvh8',
      url: 'https://www.youtube.com/watch?v=gsb999VSvh8',
      verified: true,
    })
    expect(videos[1].title).toBe('The Letter B Song - Learn the Alphabet')
  })

  it('empty letters → no videos', () => {
    expect(bouncePatrolLetterVideos([])).toEqual([])
  })

  it('covers all 26 letters with distinct ids', () => {
    const all = bouncePatrolLetterVideos('ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split(''))
    expect(all).toHaveLength(26)
    expect(new Set(all.map((v) => v.video_id)).size).toBe(26)
    expect(all.every((v) => v.url?.includes('watch?v='))).toBe(true)
  })
})
