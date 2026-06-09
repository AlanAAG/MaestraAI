// SERVER-ONLY: import only from API routes, never from 'use client' components.
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'
import React from 'react'
import { WatermarkFooter, PAGE_SIZE, PAGE_PADDING } from './base'
import type { SongWorksheetContent } from '@/lib/materials/song-worksheet'

interface SongWorksheetPdfProps {
  content: SongWorksheetContent
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
  lyricLine: {
    marginBottom: 14,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  lyricText: {
    fontSize: 13,
    color: '#111827',
  },
  optionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 6,
  },
  optionChip: {
    paddingLeft: 8,
    paddingRight: 8,
    paddingTop: 3,
    paddingBottom: 3,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    backgroundColor: '#F9FAFB',
  },
  optionChipText: {
    fontSize: 9,
    color: '#374151',
  },
  tprHeaderRow: {
    flexDirection: 'row',
    borderBottomWidth: 2,
    borderBottomColor: '#4338CA',
    paddingTop: 6,
    paddingBottom: 6,
    backgroundColor: '#EEF2FF',
  },
  tprRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    paddingTop: 8,
    paddingBottom: 8,
  },
  tprWordCol: {
    flex: 1,
    paddingRight: 8,
  },
  tprGestureCol: {
    flex: 2,
  },
  tprHeaderText: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    color: '#4338CA',
  },
  tprWord: {
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
    color: '#111827',
  },
  tprGesture: {
    fontSize: 11,
    color: '#374151',
  },
  vocabGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 8,
  },
  vocabCard: {
    width: '31%',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#F9FAFB',
    alignItems: 'center',
    minHeight: 90,
    justifyContent: 'center',
  },
  vocabWord: {
    fontSize: 16,
    fontFamily: 'Helvetica-Bold',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 6,
  },
  vocabImageBox: {
    width: '100%',
    height: 50,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderStyle: 'dashed',
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  vocabImageText: {
    fontSize: 7,
    color: '#9CA3AF',
    textAlign: 'center',
    paddingLeft: 4,
    paddingRight: 4,
  },
})

export function SongWorksheetPdfDocument({ content, title, generatedAt }: SongWorksheetPdfProps) {
  const { lyric_worksheet, tpr_guide, vocab_cards } = content

  return (
    <Document title={`Hoja de Cancion - ${title}`}>
      <Page size={PAGE_SIZE} style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>{lyric_worksheet.title || title} — Completa la cancion</Text>
          <Text style={styles.subtitle}>Escucha y escribe la palabra que falta en cada linea</Text>
        </View>

        {lyric_worksheet.lines.map((line, i) => (
          <View key={i} style={styles.lyricLine}>
            <Text style={styles.lyricText}>
              {line.text.replace(line.missing_word, '_________')}
            </Text>
            {line.options && line.options.length > 0 ? (
              <View style={styles.optionsRow}>
                {line.options.map((opt, j) => (
                  <View key={j} style={styles.optionChip}>
                    <Text style={styles.optionChipText}>{opt.image_description}</Text>
                  </View>
                ))}
              </View>
            ) : null}
          </View>
        ))}

        <WatermarkFooter generatedAt={generatedAt} />
      </Page>

      {tpr_guide && tpr_guide.length > 0 ? (
        <Page size={PAGE_SIZE} style={styles.page}>
          <View style={styles.header}>
            <View style={styles.titleRow}>
              <Text style={styles.title}>Guia TPR — {title}</Text>
              <Text style={styles.teacherBadge}>DOCENTE</Text>
            </View>
            <Text style={styles.subtitle}>Movimientos y gestos para acompanar la cancion</Text>
          </View>

          <View style={styles.tprHeaderRow}>
            <View style={styles.tprWordCol}>
              <Text style={styles.tprHeaderText}>PALABRA</Text>
            </View>
            <View style={styles.tprGestureCol}>
              <Text style={styles.tprHeaderText}>GESTO / MOVIMIENTO</Text>
            </View>
          </View>

          {tpr_guide.map((item, i) => (
            <View key={i} style={styles.tprRow}>
              <View style={styles.tprWordCol}>
                <Text style={styles.tprWord}>{item.word}</Text>
              </View>
              <View style={styles.tprGestureCol}>
                <Text style={styles.tprGesture}>{item.gesture}</Text>
              </View>
            </View>
          ))}

          <WatermarkFooter generatedAt={generatedAt} />
        </Page>
      ) : null}

      {vocab_cards && vocab_cards.length > 0 ? (
        <Page size={PAGE_SIZE} style={styles.page}>
          <View style={styles.header}>
            <Text style={styles.title}>Tarjetas de Vocabulario — {title}</Text>
            <Text style={styles.subtitle}>Recorta y usa para practicar el vocabulario</Text>
          </View>

          <View style={styles.vocabGrid}>
            {vocab_cards.slice(0, 6).map((card, i) => (
              <View key={i} style={styles.vocabCard}>
                <Text style={styles.vocabWord}>{card.word}</Text>
                <View style={styles.vocabImageBox}>
                  <Text style={styles.vocabImageText}>{card.image_description}</Text>
                </View>
              </View>
            ))}
          </View>

          <WatermarkFooter generatedAt={generatedAt} />
        </Page>
      ) : null}
    </Document>
  )
}
