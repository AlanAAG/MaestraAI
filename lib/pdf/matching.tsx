// SERVER-ONLY: import only from API routes, never from 'use client' components.
import { Document, Page, Text, View, Image, StyleSheet } from '@react-pdf/renderer'
import React from 'react'
import { WatermarkFooter, PAGE_SIZE, PAGE_PADDING } from './base'
import type { MatchingContent } from '@/lib/materials/matching'

interface MatchingPdfProps {
  content: MatchingContent
  title: string
  generatedAt: string
}

const styles = StyleSheet.create({
  page: {
    padding: PAGE_PADDING,
    fontFamily: 'Helvetica',
    backgroundColor: '#FFFFFF',
  },
  header: {
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    paddingBottom: 8,
  },
  title: {
    fontSize: 18,
    fontFamily: 'Helvetica-Bold',
    color: '#111827',
  },
  subtitle: {
    fontSize: 10,
    color: '#6B7280',
    marginTop: 2,
  },
  columnsRow: {
    flexDirection: 'row',
    marginTop: 12,
  },
  column: {
    flex: 1,
  },
  centerGap: {
    width: 80,
    alignItems: 'center',
  },
  item: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 6,
    padding: 10,
    marginBottom: 10,
    minHeight: 44,
    justifyContent: 'center',
    backgroundColor: '#F9FAFB',
  },
  leftItem: {
    borderColor: '#4F6AF0',
    backgroundColor: '#EEF2FF',
  },
  rightItem: {
    borderColor: '#10B981',
    backgroundColor: '#F0FDF4',
  },
  itemLabel: {
    fontSize: 8,
    color: '#6B7280',
    marginBottom: 2,
  },
  itemText: {
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
    color: '#111827',
  },
  lineHint: {
    fontSize: 10,
    color: '#D1D5DB',
    textAlign: 'center',
    marginTop: 22,
    marginBottom: 10,
  },
  teacherNote: {
    marginTop: 20,
    padding: 12,
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#F59E0B',
    borderRadius: 6,
  },
  teacherNoteLabel: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: '#92400E',
    marginBottom: 4,
  },
  teacherNoteText: {
    fontSize: 10,
    color: '#78350F',
  },
})

function seededShuffle<T>(arr: T[], seed: number): T[] {
  const result = [...arr]
  let s = seed | 0
  for (let i = result.length - 1; i > 0; i--) {
    s = (Math.imul(1664525, s) + 1013904223) | 0
    const j = Math.abs(s) % (i + 1)
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

export function MatchingPdfDocument({ content, title, generatedAt }: MatchingPdfProps) {
  const { pairs, teacher_note } = content
  const seed = pairs.map((p) => p.word).join('').length * 17 + pairs.length
  const rightItems = seededShuffle(
    pairs.map((p) => ({ image_url: p.image_url, image_description: p.image_description })),
    seed
  )

  return (
    <Document title={`Matching - ${title}`}>
      <Page size={PAGE_SIZE} style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>{title} — Une con una linea</Text>
          <Text style={styles.subtitle}>
            El docente lee cada palabra. Los alumnos trazan una linea a la imagen correcta.
          </Text>
        </View>

        <View style={styles.columnsRow}>
          <View style={styles.column}>
            {pairs.map((pair, i) => (
              <View key={i} style={[styles.item, styles.leftItem]}>
                <Text style={styles.itemText}>{pair.word}</Text>
                <Text style={styles.itemLabel}>{pair.translation}</Text>
              </View>
            ))}
          </View>

          <View style={styles.centerGap}>
            {pairs.map((_, i) => (
              <Text key={i} style={styles.lineHint}>
                ———
              </Text>
            ))}
          </View>

          <View style={styles.column}>
            {rightItems.map((item, i) =>
              item.image_url ? (
                <View key={i} style={[styles.item, styles.rightItem]}>
                  {/* eslint-disable-next-line jsx-a11y/alt-text */}
                  <Image
                    src={item.image_url}
                    style={{ width: '100%', height: 44, objectFit: 'contain' }}
                  />
                </View>
              ) : (
                <View key={i} style={[styles.item, styles.rightItem]}>
                  <Text style={styles.itemText}>{item.image_description}</Text>
                </View>
              )
            )}
          </View>
        </View>

        {teacher_note ? (
          <View style={styles.teacherNote}>
            <Text style={styles.teacherNoteLabel}>NOTA DOCENTE</Text>
            <Text style={styles.teacherNoteText}>{teacher_note}</Text>
          </View>
        ) : null}

        <WatermarkFooter generatedAt={generatedAt} />
      </Page>
    </Document>
  )
}
