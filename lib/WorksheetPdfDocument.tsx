// lib/WorksheetPdfDocument.tsx
// SERVER-ONLY: import only from API routes, never from 'use client' components.
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'

type WorksheetActivity = {
  type: string
  instructions: string
  items: string[]
}

interface WorksheetPdfProps {
  activities: WorksheetActivity[]
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
  tracingLine: {
    borderBottomWidth: 1,
    borderBottomColor: '#D1D5DB',
    borderStyle: 'dashed',
    marginBottom: 16,
    paddingBottom: 20,
  },
  tracingLetter: {
    fontSize: 48,
    fontFamily: 'Helvetica-Bold',
    color: '#E5E7EB',
    textAlign: 'center',
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
  writingLines: {
    marginTop: 8,
  },
  writingLine: {
    borderBottomWidth: 1,
    borderBottomColor: '#D1D5DB',
    marginBottom: 12,
    height: 20,
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
        {activities.map((activity, index) => (
          <View key={index} style={styles.activity}>
            <Text style={styles.activityTitle}>
              Actividad {index + 1}: {activity.type}
            </Text>
            <Text style={styles.instructions}>{activity.instructions}</Text>

            {/* Render based on activity type */}
            {activity.type.toLowerCase().includes('tracing') ||
            activity.type.toLowerCase().includes('trazar') ? (
              <View style={styles.tracingLine}>
                <Text style={styles.tracingLetter}>{letter}</Text>
              </View>
            ) : null}

            {activity.type.toLowerCase().includes('matching') ||
            activity.type.toLowerCase().includes('relaciona') ? (
              <View>
                {activity.items.map((item, itemIndex) => (
                  <View key={itemIndex} style={styles.itemBox}>
                    <View style={styles.checkbox} />
                    <Text style={styles.itemText}>{item}</Text>
                  </View>
                ))}
              </View>
            ) : null}

            {activity.type.toLowerCase().includes('writing') ||
            activity.type.toLowerCase().includes('escribe') ? (
              <View style={styles.writingLines}>
                {activity.items.map((_, lineIndex) => (
                  <View key={lineIndex} style={styles.writingLine} />
                ))}
              </View>
            ) : null}
          </View>
        ))}

        <Text style={styles.footer}>Generado el {generatedAt} · MaestraAI · maestraai.mx</Text>
      </Page>
    </Document>
  )
}
