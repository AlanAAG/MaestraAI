// lib/GameCardsPdfDocument.tsx
// SERVER-ONLY: import only from API routes, never from 'use client' components.
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'

type GamePair = {
  id: string
  word: string
  visual_hint: string
}

interface GameCardsPdfProps {
  pairs: GamePair[]
  gameType: string
  generatedAt: string
}

const styles = StyleSheet.create({
  page: {
    padding: 30,
    fontFamily: 'Helvetica',
    backgroundColor: '#FFFFFF',
  },
  header: {
    marginBottom: 20,
    paddingBottom: 10,
    borderBottomWidth: 2,
    borderBottomColor: '#4F6AF0',
  },
  title: {
    fontSize: 16,
    fontFamily: 'Helvetica-Bold',
    color: '#111827',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 10,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 4,
  },
  instructions: {
    fontSize: 9,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 1.4,
    backgroundColor: '#F3F4F6',
    padding: 8,
    borderRadius: 4,
  },
  grid: {
    display: 'flex',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 20,
  },
  cardContainer: {
    width: '48%',
    marginBottom: 12,
  },
  card: {
    border: '2px dashed #D1D5DB',
    borderRadius: 8,
    padding: 16,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 80,
    backgroundColor: '#FAFBFC',
  },
  wordCard: {
    borderColor: '#3B82F6',
    backgroundColor: '#EFF6FF',
  },
  hintCard: {
    borderColor: '#10B981',
    backgroundColor: '#F0FDF4',
    marginTop: 8,
  },
  cardLabel: {
    fontSize: 8,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 4,
    fontFamily: 'Helvetica-Bold',
  },
  cardText: {
    fontSize: 14,
    fontFamily: 'Helvetica-Bold',
    color: '#111827',
    textAlign: 'center',
  },
  hintText: {
    fontSize: 10,
    color: '#111827',
    textAlign: 'center',
    lineHeight: 1.4,
  },
  footer: {
    position: 'absolute',
    bottom: 20,
    left: 30,
    right: 30,
    fontSize: 8,
    color: '#9CA3AF',
    textAlign: 'center',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingTop: 8,
  },
})

export function GameCardsPdfDocument({ pairs, gameType, generatedAt }: GameCardsPdfProps) {
  // Split pairs into pages (4 pairs per page = 8 cards)
  const pages: (typeof pairs)[] = []
  for (let i = 0; i < pairs.length; i += 4) {
    pages.push(pairs.slice(i, i + 4))
  }

  return (
    <Document title={`Game Cards - ${gameType} - MaestraAI`}>
      {pages.map((pagePairs, pageIndex) => (
        <Page key={pageIndex} size="LETTER" style={styles.page}>
          <View style={styles.header}>
            <Text style={styles.title}>
              Tarjetas de Juego - {gameType === 'memory_match' ? 'Memory Match' : gameType}
            </Text>
            <Text style={styles.subtitle}>
              Página {pageIndex + 1} de {pages.length}
            </Text>
          </View>

          <View style={styles.instructions}>
            <Text>
              Imprime estas tarjetas en cartulina, recórtalas y úsalas para jugar en el salón. Cada
              palabra tiene una pista visual que forma una pareja.
            </Text>
          </View>

          <View style={styles.grid}>
            {pagePairs.map((pair) => (
              <View key={pair.id} style={styles.cardContainer}>
                {/* Word card */}
                <View style={[styles.card, styles.wordCard]}>
                  <Text style={styles.cardLabel}>PALABRA</Text>
                  <Text style={styles.cardText}>{pair.word}</Text>
                </View>

                {/* Hint card */}
                <View style={[styles.card, styles.hintCard]}>
                  <Text style={styles.cardLabel}>PISTA</Text>
                  <Text style={styles.hintText}>{pair.visual_hint}</Text>
                </View>
              </View>
            ))}
          </View>

          <Text style={styles.footer}>Generado el {generatedAt} · MaestraAI · maestraai.mx</Text>
        </Page>
      ))}
    </Document>
  )
}
