// SERVER-ONLY: import only from API routes, never from 'use client' components.
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'
import React from 'react'
import { WatermarkFooter, PAGE_SIZE, PAGE_PADDING } from './base'
import type { LetterRecognitionContent } from '@/lib/materials/letter-recognition'
import { seededShuffle } from '@/lib/utils/shuffle'

interface LetterRecognitionPdfProps {
  content: LetterRecognitionContent
  letter: string
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
  studentInstructions: {
    fontSize: 11,
    color: '#4338CA',
    fontFamily: 'Helvetica-Bold',
    marginTop: 4,
  },
  teacherInstructions: {
    fontSize: 9,
    color: '#6B7280',
    marginTop: 2,
  },
  // hear_and_circle layout
  hearRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    backgroundColor: '#FAFAFA',
  },
  imageBox: {
    width: 80,
    height: 80,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
    backgroundColor: '#F3F4F6',
  },
  imageBoxDesc: {
    fontSize: 7,
    color: '#9CA3AF',
    textAlign: 'center',
    paddingLeft: 4,
    paddingRight: 4,
  },
  imageBoxWord: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    color: '#111827',
    textAlign: 'center',
    marginTop: 4,
  },
  letterOptions: {
    flexDirection: 'row',
    gap: 12,
    flex: 1,
    justifyContent: 'center',
  },
  letterCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  letterCircleText: {
    fontSize: 20,
    fontFamily: 'Helvetica-Bold',
    color: '#111827',
  },
  // match_to_letter layout
  matchColumnsRow: {
    flexDirection: 'row',
    marginTop: 8,
  },
  matchColumn: {
    flex: 1,
  },
  matchItem: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 6,
    padding: 10,
    marginBottom: 10,
    minHeight: 40,
    justifyContent: 'center',
    backgroundColor: '#F9FAFB',
  },
  matchWordText: {
    fontSize: 13,
    fontFamily: 'Helvetica-Bold',
    color: '#111827',
  },
  matchLetterText: {
    fontSize: 28,
    fontFamily: 'Helvetica-Bold',
    color: '#4338CA',
    textAlign: 'center',
  },
  matchCenterGap: {
    width: 60,
    alignItems: 'center',
  },
  matchLineHint: {
    fontSize: 10,
    color: '#D1D5DB',
    textAlign: 'center',
    marginTop: 18,
    marginBottom: 10,
  },
  // trace_and_say layout
  traceGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginTop: 8,
  },
  traceCard: {
    width: 110,
    alignItems: 'center',
    padding: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
  },
  traceLetter: {
    fontSize: 72,
    fontFamily: 'Helvetica-Bold',
    color: '#E5E7EB',
    textAlign: 'center',
  },
  traceWord: {
    fontSize: 13,
    fontFamily: 'Helvetica-Bold',
    color: '#111827',
    textAlign: 'center',
    marginTop: 4,
  },
  traceDesc: {
    fontSize: 8,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 2,
  },
})

export function LetterRecognitionPdfDocument({
  content,
  letter,
  generatedAt,
}: LetterRecognitionPdfProps) {
  const { activity_type, teacher_instructions, student_instructions, items } = content

  return (
    <Document title={`Reconocimiento de Letras - ${letter.toUpperCase()}`}>
      <Page size={PAGE_SIZE} style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>Reconocimiento de Letras — {letter.toUpperCase()}</Text>
          <Text style={styles.studentInstructions}>{student_instructions}</Text>
          <Text style={styles.teacherInstructions}>Docente: {teacher_instructions}</Text>
        </View>

        {activity_type === 'hear_and_circle' && (
          <View>
            {items.map((item, i) => (
              <View key={i} style={styles.hearRow}>
                <View style={styles.imageBox}>
                  <Text style={styles.imageBoxDesc}>{item.image_description}</Text>
                  <Text style={styles.imageBoxWord}>{item.word}</Text>
                </View>
                <View style={styles.letterOptions}>
                  {/* Shuffle so the correct letter isn't always first (was a giveaway). */}
                  {seededShuffle(
                    [item.target_letter, ...item.foil_letters].slice(0, 4),
                    i * 17 + 3
                  ).map((l, j) => (
                    <View key={j} style={styles.letterCircle}>
                      <Text style={styles.letterCircleText}>{l}</Text>
                    </View>
                  ))}
                </View>
              </View>
            ))}
          </View>
        )}

        {activity_type === 'match_to_letter' && (
          <View style={styles.matchColumnsRow}>
            <View style={styles.matchColumn}>
              {items.map((item, i) => (
                <View key={i} style={styles.matchItem}>
                  <Text style={styles.matchWordText}>{item.word}</Text>
                </View>
              ))}
            </View>
            <View style={styles.matchCenterGap}>
              {items.map((_, i) => (
                <Text key={i} style={styles.matchLineHint}>
                  ———
                </Text>
              ))}
            </View>
            <View style={styles.matchColumn}>
              {/* Shuffle the letters column so each word no longer sits on its answer's row. */}
              {seededShuffle(
                items.map((it) => it.target_letter),
                71
              ).map((l, i) => (
                <View key={i} style={styles.matchItem}>
                  <Text style={styles.matchLetterText}>{l}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {activity_type === 'trace_and_say' && (
          <View style={styles.traceGrid}>
            {items.map((item, i) => (
              <View key={i} style={styles.traceCard}>
                <Text style={styles.traceLetter}>{item.target_letter}</Text>
                <Text style={styles.traceWord}>{item.word}</Text>
                <Text style={styles.traceDesc}>{item.image_description}</Text>
              </View>
            ))}
          </View>
        )}

        <WatermarkFooter generatedAt={generatedAt} />
      </Page>
    </Document>
  )
}
