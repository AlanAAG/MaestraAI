// @vitest-environment node
// Explicit opt-in: calls the real model with fictional vocabulary; saves no records.
// Run with NODE_USE_ENV_PROXY=1 MATERIALS_LIVE_SMOKE=1 npx vitest run lib/materials/generation.live.test.ts
import { describe, expect, it } from 'vitest'
import { buildFlashcardContent } from './flashcards'
import { buildGameContent } from './games'

describe.skipIf(process.env.MATERIALS_LIVE_SMOKE !== '1')(
  'live synthetic materials generation',
  () => {
    it('creates playable memory pairs and flashcards from the supplied words', async () => {
      process.loadEnvFile('.env.local')
      const words = ['cat', 'dog', 'sun']
      const [game, flashcards] = await Promise.all([
        buildGameContent(words, 'memory_match', undefined, undefined, 3),
        buildFlashcardContent(words),
      ])
      expect(game.game_type).toBe('memory_match')
      expect(game.pairs).toHaveLength(3)
      expect(new Set(game.pairs.map((pair) => pair.id)).size).toBe(3)
      expect(new Set(game.pairs.map((pair) => pair.word.toLowerCase()))).toEqual(new Set(words))
      expect(flashcards.cards).toHaveLength(3)
      expect(new Set(flashcards.cards.map((card) => card.word.toLowerCase()))).toEqual(
        new Set(words)
      )
    }, 90_000)
  }
)
