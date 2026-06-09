// lib/BingoPdfDocument.tsx
// SERVER-ONLY: import only from API routes, never from 'use client' components.
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'
import type { BingoCard } from './materials/bingo'

interface BingoPdfDocumentProps {
  cards: BingoCard[]
  vocabulary: string[]
  title: string
}

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: 'Helvetica',
    backgroundColor: '#FAFBFC',
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
  studentNum: {
    fontSize: 10,
    color: '#6B7280',
    marginTop: 2,
  },
  grid: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    marginTop: 24,
  },
  row: {
    flexDirection: 'row',
  },
  cell: {
    width: 140,
    height: 100,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 4,
  },
  cellFree: {
    width: 140,
    height: 100,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 4,
  },
  cellWord: {
    fontSize: 14,
    fontFamily: 'Helvetica-Bold',
    color: '#1D4ED8',
    textAlign: 'center',
  },
  cellFreeText: {
    fontSize: 16,
    fontFamily: 'Helvetica-Bold',
    color: '#1D4ED8',
    textAlign: 'center',
  },
  footer: {
    position: 'absolute',
    bottom: 20,
    left: 40,
    right: 40,
    fontSize: 8,
    color: '#9CA3AF',
    textAlign: 'center',
  },
  // Caller page
  callerPage: {
    padding: 40,
    fontFamily: 'Helvetica',
  },
  callerTitle: {
    fontSize: 16,
    fontFamily: 'Helvetica-Bold',
    color: '#111827',
    marginBottom: 4,
  },
  callerSubtitle: {
    fontSize: 10,
    color: '#6B7280',
    marginBottom: 20,
  },
  callerGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  callerCard: {
    width: 90,
    height: 50,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 4,
  },
  callerWord: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    color: '#111827',
    textAlign: 'center',
  },
})

function BingoCardPage({
  card,
  studentNumber,
  title,
}: {
  card: string[][]
  studentNumber: number
  title: string
}) {
  return (
    <Page size="LETTER" style={styles.page}>
      <View style={styles.header}>
        <Text style={styles.title}>{title} — Bingo</Text>
        <Text style={styles.studentNum}>Tarjeta #{studentNumber}</Text>
      </View>
      <View style={styles.grid}>
        {card.map((row, ri) => (
          <View key={ri} style={styles.row}>
            {row.map((word, ci) => (
              <View key={ci} style={word === 'FREE' ? styles.cellFree : styles.cell}>
                <Text style={word === 'FREE' ? styles.cellFreeText : styles.cellWord}>
                  {word === 'FREE' ? '★ FREE' : word}
                </Text>
              </View>
            ))}
          </View>
        ))}
      </View>
      <Text style={styles.footer}>maestraia.com</Text>
    </Page>
  )
}

function CallerPage({ vocabulary, title }: { vocabulary: string[]; title: string }) {
  return (
    <Page size="LETTER" style={styles.callerPage}>
      <Text style={styles.callerTitle}>{title} — Tarjetas del Maestro</Text>
      <Text style={styles.callerSubtitle}>Recortar y usar para llamar las palabras</Text>
      <View style={styles.callerGrid}>
        {vocabulary.map((word, i) => (
          <View key={i} style={styles.callerCard}>
            <Text style={styles.callerWord}>{word}</Text>
          </View>
        ))}
      </View>
    </Page>
  )
}

export function BingoPdfDocument({ cards, vocabulary, title }: BingoPdfDocumentProps) {
  return (
    <Document>
      {cards.map(({ card, studentNumber }) => (
        <BingoCardPage
          key={studentNumber}
          card={card}
          studentNumber={studentNumber}
          title={title}
        />
      ))}
      <CallerPage vocabulary={vocabulary} title={title} />
    </Document>
  )
}
