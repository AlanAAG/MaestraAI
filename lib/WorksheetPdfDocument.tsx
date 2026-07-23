// lib/WorksheetPdfDocument.tsx
// SERVER-ONLY: import only from API routes, never from 'use client' components.
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'
import { normalizeWorksheetItems, type WorksheetActivity } from '@/lib/materials/worksheet-content'
import { seededShuffle } from '@/lib/utils/shuffle'

// Old content stored plain-string items and `instructions` — tolerated at render.
type StoredActivity = Omit<WorksheetActivity, 'items' | 'type'> & {
  type: string
  instructions?: string
  items?: unknown
}

interface WorksheetPdfProps {
  activities: StoredActivity[]
  letter?: string
  vocabulary: string[]
  generatedAt: string
}

const styles = StyleSheet.create({
  page: {
    padding: 40,
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
    fontSize: 18,
    fontFamily: 'Helvetica-Bold',
    color: '#111827',
  },
  subtitle: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 4,
  },
  vocabularyBox: {
    backgroundColor: '#F3F4F6',
    padding: 12,
    borderRadius: 4,
    marginBottom: 20,
  },
  vocabularyTitle: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    color: '#111827',
    marginBottom: 6,
  },
  vocabularyText: {
    fontSize: 10,
    color: '#4B5563',
    lineHeight: 1.5,
  },
  activity: {
    marginBottom: 24,
    pageBreakInside: 'avoid',
  },
  activityTitle: {
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
    color: '#111827',
    marginBottom: 8,
  },
  instructions: {
    fontSize: 10,
    color: '#6B7280',
    marginBottom: 12,
    lineHeight: 1.5,
  },
  itemBox: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  checkbox: {
    width: 16,
    height: 16,
    border: '2px solid #9CA3AF',
    borderRadius: 3,
    marginRight: 8,
  },
  itemText: {
    fontSize: 11,
    color: '#111827',
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    fontSize: 8,
    color: '#9CA3AF',
    textAlign: 'center',
  },
})

export function WorksheetPdfDocument({
  activities,
  letter,
  vocabulary,
  generatedAt,
}: WorksheetPdfProps) {
  return (
    <Document title={`Worksheet ${letter ? `- Letra ${letter}` : ''} - MaestraAI`}>
      <Page size="LETTER" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>Hoja de Trabajo{letter ? ` - Letra ${letter}` : ''}</Text>
          <Text style={styles.subtitle}>Actividades de Vocabulario</Text>
        </View>

        {/* Vocabulary reference */}
        <View style={styles.vocabularyBox}>
          <Text style={styles.vocabularyTitle}>Vocabulario de hoy:</Text>
          <Text style={styles.vocabularyText}>{vocabulary.join(', ')}</Text>
        </View>

        {/* Activities */}
        {activities.map((activity, index) => {
          const items = normalizeWorksheetItems(activity.items)
          return (
            <View key={index} style={styles.activity}>
              <Text style={styles.activityTitle}>
                Actividad {index + 1}: {activity.title || activity.type}
              </Text>
              <Text style={styles.instructions}>
                {activity.teacher_instruction || activity.instructions || ''}
              </Text>

              {items.map((item, itemIndex) => (
                <View key={itemIndex} style={styles.itemBox}>
                  <View style={styles.checkbox} />
                  <Text style={styles.itemText}>
                    {item.foil_words?.length
                      ? // Circling: all options shuffled as equals — the correct answer must not be
                        // typographically distinguishable on the printed student sheet.
                        seededShuffle([item.word, ...item.foil_words], index * 7 + itemIndex).join(
                          '      '
                        )
                      : item.word}
                    {item.teacher_instruction ? ` — ${item.teacher_instruction}` : ''}
                  </Text>
                </View>
              ))}

              {/* Matching: two columns with the RIGHT side shuffled so a word never sits on its
                  answer's row — otherwise the download reveals the answer. Kids draw the lines. */}
              {(() => {
                const pairs = activity.pairs ?? []
                if (!pairs.length) return null
                const answers = pairs.map((p) => p.translation || p.description || '')
                const hasAnswers = answers.some(Boolean)
                if (!hasAnswers) {
                  return pairs.map((pair, i) => (
                    <View key={i} style={styles.itemBox}>
                      <View style={styles.checkbox} />
                      <Text style={styles.itemText}>{pair.word}</Text>
                    </View>
                  ))
                }
                const shuffled = seededShuffle(answers, index * 13 + 5)
                return (
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 24 }}>
                    <View style={{ flex: 1 }}>
                      {pairs.map((pair, i) => (
                        <Text key={i} style={[styles.itemText, { marginBottom: 10 }]}>
                          {pair.word}
                        </Text>
                      ))}
                    </View>
                    <View style={{ flex: 1 }}>
                      {shuffled.map((a, i) => (
                        <Text key={i} style={[styles.itemText, { marginBottom: 10 }]}>
                          {a}
                        </Text>
                      ))}
                    </View>
                  </View>
                )
              })()}
            </View>
          )
        })}

        <Text style={styles.footer}>Generado el {generatedAt} · MaestraAI · maestraai.mx</Text>
      </Page>
    </Document>
  )
}
