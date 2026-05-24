// lib/DiaryPdfDocument.tsx
// SERVER-ONLY: import only from API routes, never from 'use client' components.
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'
import type { DiaryDocumentProps } from './pdf'

const styles = StyleSheet.create({
  page: {
    padding: 48,
    fontFamily: 'Helvetica',
    backgroundColor: '#FAFBFC',
  },
  header: {
    borderBottomWidth: 2,
    borderBottomColor: '#4F6AF0',
    paddingBottom: 12,
    marginBottom: 24,
  },
  title: {
    fontSize: 22,
    fontFamily: 'Helvetica-Bold',
    color: '#111827',
  },
  subtitle: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  meta: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 2,
  },
  body: {
    fontSize: 12,
    color: '#111827',
    lineHeight: 1.7,
    marginTop: 8,
  },
  footer: {
    position: 'absolute',
    bottom: 32,
    left: 48,
    right: 48,
    fontSize: 9,
    color: '#D1D5DB',
    textAlign: 'center',
  },
})

export function DiaryPdfDocument({
  teacherName,
  weekLabel,
  summaryText,
  generatedAt,
}: DiaryDocumentProps) {
  return (
    <Document title="Diario de la Educadora — MaestraAI">
      <Page size="LETTER" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>Diario de la Educadora</Text>
          <Text style={styles.subtitle}>{weekLabel}</Text>
          <Text style={styles.meta}>{teacherName}</Text>
        </View>
        <Text style={styles.body}>{summaryText}</Text>
        <Text style={styles.footer}>
          Generado el {generatedAt} · MaestraAI · diario.maestraai.mx
        </Text>
      </Page>
    </Document>
  )
}
