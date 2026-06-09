// SERVER-ONLY: import only from API routes, never from 'use client' components.
import { renderToBuffer, type DocumentProps } from '@react-pdf/renderer'
import React from 'react'
import { FlashcardPdfDocument } from '@/lib/FlashcardPdfDocument'
import { WorksheetPdfDocument } from '@/lib/WorksheetPdfDocument'
import { GameCardsPdfDocument } from '@/lib/GameCardsPdfDocument'
import { BingoPdfDocument } from '@/lib/BingoPdfDocument'
import { generateAllCards } from '@/lib/materials/bingo'
import { WordSearchPdfDocument } from '@/lib/pdf/word-search'
import { MatchingPdfDocument } from '@/lib/pdf/matching'
import { LetterRecognitionPdfDocument } from '@/lib/pdf/letter-recognition'
import { SongWorksheetPdfDocument } from '@/lib/pdf/song-worksheet'

export type RenderResult = { buffer: Buffer; filename: string }

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function renderMaterialPdf(
  material: any,
  generatedAt: string
): Promise<RenderResult | null> {
  switch (material.type) {
    case 'flashcards': {
      const buffer = await renderToBuffer(
        React.createElement(FlashcardPdfDocument, {
          cards: material.content.cards || [],
          letter: material.letter || undefined,
          generatedAt,
        }) as React.ReactElement<DocumentProps>
      )
      return { buffer, filename: `Flashcards_${material.letter || 'Vocabulario'}.pdf` }
    }

    case 'worksheets':
    case 'worksheet': {
      const buffer = await renderToBuffer(
        React.createElement(WorksheetPdfDocument, {
          activities: material.content.activities || [],
          letter: material.letter || undefined,
          vocabulary: material.vocabulary || [],
          generatedAt,
        }) as React.ReactElement<DocumentProps>
      )
      return { buffer, filename: `Worksheet_${material.letter || 'Actividades'}.pdf` }
    }

    case 'memory_game': {
      const buffer = await renderToBuffer(
        React.createElement(GameCardsPdfDocument, {
          pairs: material.content.pairs || [],
          gameType: material.content.game_type || 'memory_match',
          generatedAt,
        }) as React.ReactElement<DocumentProps>
      )
      return { buffer, filename: `Memorama.pdf` }
    }

    case 'bingo': {
      const { vocabulary = [], card_count = 10, free_space = true } = material.content
      const result = generateAllCards(vocabulary, card_count, free_space)
      const buffer = await renderToBuffer(
        React.createElement(BingoPdfDocument, {
          cards: result.cards,
          vocabulary,
          title: 'Vocabulario',
        }) as React.ReactElement<DocumentProps>
      )
      return { buffer, filename: `Bingo_${card_count}_tarjetas.pdf` }
    }

    case 'word_search': {
      const title =
        (material.vocabulary as string[] | null)?.slice(0, 3).join(', ') || 'Vocabulario'
      const buffer = await renderToBuffer(
        React.createElement(WordSearchPdfDocument, {
          content: material.content,
          title,
          generatedAt,
        }) as React.ReactElement<DocumentProps>
      )
      return { buffer, filename: `SopaDeLetras.pdf` }
    }

    case 'matching': {
      const title =
        (material.vocabulary as string[] | null)?.slice(0, 3).join(', ') || 'Vocabulario'
      const buffer = await renderToBuffer(
        React.createElement(MatchingPdfDocument, {
          content: material.content,
          title,
          generatedAt,
        }) as React.ReactElement<DocumentProps>
      )
      return { buffer, filename: `Matching.pdf` }
    }

    case 'letter_recognition': {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const letter = (material.content.items as any[])?.[0]?.target_letter || 'A'
      const buffer = await renderToBuffer(
        React.createElement(LetterRecognitionPdfDocument, {
          content: material.content,
          letter,
          generatedAt,
        }) as React.ReactElement<DocumentProps>
      )
      return { buffer, filename: `Reconocimiento_${letter}.pdf` }
    }

    case 'song_worksheet': {
      const title = material.content.lyric_worksheet?.title || 'Cancion'
      const buffer = await renderToBuffer(
        React.createElement(SongWorksheetPdfDocument, {
          content: material.content,
          title,
          generatedAt,
        }) as React.ReactElement<DocumentProps>
      )
      return { buffer, filename: `HojaCancion.pdf` }
    }

    default:
      return null
  }
}
