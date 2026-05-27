// lib/FlashcardPdfDocument.tsx
// SERVER-ONLY: import only from API routes, never from 'use client' components.
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'

type FlashcardContent = {
  cards: Array<{
    front: string
    back: string
    color: string
    sentence: string
  }>
}

interface FlashcardPdfProps {
  cards: FlashcardContent['cards']
  letter?: string
  generatedAt: string
}

const styles = StyleSheet.create({
  page: {
    padding: 20,
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
  },
  grid: {
    display: 'flex',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 20,
  },
  card: {
    width: '48%',
    aspectRatio: 1,
    border: '2px dashed #D1D5DB',
    borderRadius: 8,
    padding: 12,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FAFBFC',
  },
  cardFront: {
    borderColor: '#4F6AF0',
    backgroundColor: '#EEF2FF',
  },
  cardWord: {
    fontSize: 24,
    fontFamily: 'Helvetica-Bold',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 8,
  },
  cardColor: {
    fontSize: 10,
    color: '#4F6AF0',
    textAlign: 'center',
    fontFamily: 'Helvetica-Bold',
    marginBottom: 4,
  },
  cardSentence: {
    fontSize: 9,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 1.4,
  },
  cardBack: {
    borderColor: '#10B981',
    backgroundColor: '#F0FDF4',
  },
  cardDefinition: {
    fontSize: 11,
    color: '#111827',
    textAlign: 'center',
    lineHeight: 1.5,
  },
  footer: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    fontSize: 8,
    color: '#9CA3AF',
    textAlign: 'center',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingTop: 8,
  },
})

export function FlashcardPdfDocument({ cards, letter, generatedAt }: FlashcardPdfProps) {
  // Split cards into groups of 4 (2x2 grid per page)
  const pages: (typeof cards)[] = []
  for (let i = 0; i < cards.length; i += 4) {
    pages.push(cards.slice(i, i + 4))
  }

  return (
    <Document title={`Flashcards ${letter ? `- Letra ${letter}` : ''} - MaestraAI`}>
      {pages.map((pageCards, pageIndex) => (
        <Page key={pageIndex} size="LETTER" style={styles.page}>
          <View style={styles.header}>
            <Text style={styles.title}>
              Flashcards de Vocabulario{letter ? ` - Letra ${letter}` : ''}
            </Text>
            <Text style={styles.subtitle}>
              Página {pageIndex + 1} de {pages.length}
            </Text>
            <Text style={styles.instructions}>
              Imprime en cartulina, recorta por las líneas punteadas y dobla por la mitad
            </Text>
          </View>

          <View style={styles.grid}>
            {pageCards.map((card, cardIndex) => (
              <View key={cardIndex}>
                {/* Front side (word + sentence) */}
                <View style={[styles.card, styles.cardFront]}>
                  <Text style={styles.cardWord}>{card.front}</Text>
                  {card.color && <Text style={styles.cardColor}>{card.color}</Text>}
                  <Text style={styles.cardSentence}>{card.sentence}</Text>
                </View>

                {/* Back side (definition) */}
                <View style={[styles.card, styles.cardBack, { marginTop: 10 }]}>
                  <Text style={styles.cardDefinition}>{card.back}</Text>
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
