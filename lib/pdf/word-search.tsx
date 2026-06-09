// SERVER-ONLY: import only from API routes, never from 'use client' components.
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'
import React from 'react'
import { WatermarkFooter, PAGE_SIZE, PAGE_PADDING } from './base'
import type { WordSearchResult } from '@/lib/materials/word-search'

interface WordSearchPdfProps {
  content: WordSearchResult
  wordPaths?: Array<Array<{ x: number; y: number }>>
  title: string
  generatedAt: string
}

function getCellSize(gridSize: number) {
  return gridSize <= 8 ? 56 : 38
}

const styles = StyleSheet.create({
  page: {
    padding: PAGE_PADDING,
    fontFamily: 'Helvetica',
    backgroundColor: '#FFFFFF',
  },
  header: {
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    paddingBottom: 8,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontFamily: 'Helvetica-Bold',
    color: '#111827',
  },
  teacherBadge: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: '#FFFFFF',
    backgroundColor: '#4338CA',
    paddingLeft: 6,
    paddingRight: 6,
    paddingTop: 2,
    paddingBottom: 2,
    borderRadius: 4,
    marginLeft: 8,
  },
  subtitle: {
    fontSize: 10,
    color: '#6B7280',
    marginTop: 2,
  },
  grid: {
    flexDirection: 'column',
    marginTop: 12,
  },
  row: {
    flexDirection: 'row',
  },
  cell: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellHighlighted: {
    borderWidth: 1,
    borderColor: '#93C5FD',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#DBEAFE',
  },
  cellText: {
    fontFamily: 'Helvetica-Bold',
    color: '#111827',
    textAlign: 'center',
  },
  wordBank: {
    marginTop: 16,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  wordChip: {
    paddingLeft: 8,
    paddingRight: 8,
    paddingTop: 4,
    paddingBottom: 4,
    borderWidth: 1,
    borderColor: '#6366F1',
    borderRadius: 4,
  },
  wordChipText: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    color: '#4338CA',
  },
})

function GridPage({
  grid,
  words,
  gridSize,
  wordPaths,
  title,
  isAnswerKey,
  generatedAt,
}: {
  grid: string[][]
  words: string[]
  gridSize: number
  wordPaths?: Array<Array<{ x: number; y: number }>>
  title: string
  isAnswerKey: boolean
  generatedAt: string
}) {
  const cs = getCellSize(gridSize)
  const fontSize = cs <= 38 ? 9 : 12

  const highlightedCells = new Set<string>()
  if (isAnswerKey && wordPaths) {
    for (const path of wordPaths) {
      for (const { x, y } of path) {
        highlightedCells.add(`${y},${x}`)
      }
    }
  }

  return (
    <Page size={PAGE_SIZE} style={styles.page}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>{title} — Sopa de Letras</Text>
          {isAnswerKey && <Text style={styles.teacherBadge}>DOCENTE</Text>}
        </View>
        <Text style={styles.subtitle}>
          {isAnswerKey
            ? 'Clave de respuestas'
            : `Encuentra las ${words.length} palabras en la cuadrícula`}
        </Text>
      </View>

      <View style={styles.grid}>
        {grid.map((rowArr, ri) => (
          <View key={ri} style={styles.row}>
            {rowArr.map((letter, ci) => {
              const highlighted = isAnswerKey && highlightedCells.has(`${ri},${ci}`)
              return (
                <View
                  key={ci}
                  style={[
                    highlighted ? styles.cellHighlighted : styles.cell,
                    { width: cs, height: cs },
                  ]}
                >
                  <Text style={[styles.cellText, { fontSize }]}>{letter}</Text>
                </View>
              )
            })}
          </View>
        ))}
      </View>

      <View style={styles.wordBank}>
        {words.map((w, i) => (
          <View key={i} style={styles.wordChip}>
            <Text style={styles.wordChipText}>{w.toUpperCase()}</Text>
          </View>
        ))}
      </View>

      <WatermarkFooter generatedAt={generatedAt} />
    </Page>
  )
}

export function WordSearchPdfDocument({
  content,
  wordPaths,
  title,
  generatedAt,
}: WordSearchPdfProps) {
  const { grid, words, gridSize } = content
  return (
    <Document title={`Sopa de Letras - ${title}`}>
      <GridPage
        grid={grid}
        words={words}
        gridSize={gridSize}
        title={title}
        isAnswerKey={false}
        generatedAt={generatedAt}
      />
      <GridPage
        grid={grid}
        words={words}
        gridSize={gridSize}
        wordPaths={wordPaths}
        title={title}
        isAnswerKey={true}
        generatedAt={generatedAt}
      />
    </Document>
  )
}
