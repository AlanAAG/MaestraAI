// lib/PlaneacionPdfDocument.tsx
// SERVER-ONLY: import only from API routes, never from 'use client' components.
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'
import type { PlaneacionDocumentProps } from './pdf-planeacion'

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: 'Helvetica',
    backgroundColor: '#FAFBFC',
    fontSize: 10,
  },
  header: {
    borderBottomWidth: 2,
    borderBottomColor: '#4F6AF0',
    paddingBottom: 12,
    marginBottom: 20,
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
  meta: {
    fontSize: 9,
    color: '#6B7280',
    marginTop: 2,
  },
  dayHeader: {
    backgroundColor: '#F3F4F6',
    padding: 10,
    borderRadius: 4,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#4F6AF0',
  },
  dayTitle: {
    fontSize: 14,
    fontFamily: 'Helvetica-Bold',
    color: '#111827',
    marginBottom: 2,
  },
  dayDate: {
    fontSize: 10,
    color: '#6B7280',
  },
  block: {
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  blockTime: {
    fontSize: 9,
    color: '#4F6AF0',
    fontFamily: 'Helvetica-Bold',
    marginBottom: 4,
  },
  blockActivity: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    color: '#111827',
    marginBottom: 4,
  },
  blockDetail: {
    fontSize: 9,
    color: '#6B7280',
    marginTop: 2,
  },
  blockLabel: {
    fontFamily: 'Helvetica-Bold',
    color: '#111827',
  },
  vocabularyBox: {
    backgroundColor: '#EEF2FF',
    padding: 8,
    borderRadius: 4,
    marginBottom: 10,
  },
  vocabularyText: {
    fontSize: 10,
    color: '#4338CA',
    lineHeight: 1.5,
  },
  observationsBox: {
    backgroundColor: '#FEF3C7',
    padding: 8,
    borderRadius: 4,
    marginBottom: 10,
  },
  observationsText: {
    fontSize: 9,
    color: '#92400E',
  },
  neeBox: {
    backgroundColor: '#FEE2E2',
    padding: 8,
    borderRadius: 4,
    marginBottom: 10,
  },
  neeText: {
    fontSize: 9,
    color: '#991B1B',
    marginBottom: 3,
  },
  footer: {
    position: 'absolute',
    bottom: 24,
    left: 40,
    right: 40,
    fontSize: 8,
    color: '#D1D5DB',
    textAlign: 'center',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingTop: 8,
  },
  pageNumber: {
    fontSize: 8,
    color: '#9CA3AF',
  },
})

export function PlaneacionPdfDocument(props: PlaneacionDocumentProps) {
  return (
    <Document title={`Planeación Quincena ${props.fortnightNumber} - MaestraAI`}>
      {/* Cover Page */}
      <Page size="LETTER" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>Planeación Quincenal</Text>
          <Text style={styles.subtitle}>
            Quincena {props.fortnightNumber}: {props.projectName}
          </Text>
          <Text style={styles.meta}>{props.dateRange}</Text>
          <Text style={styles.meta}>
            {props.groupName} • {props.grade} • {props.schoolName}
          </Text>
          <Text style={styles.meta}>Valor del mes: {props.monthlyValue}</Text>
        </View>

        <View style={{ marginTop: 40 }}>
          <Text style={{ fontSize: 12, color: '#6B7280', marginBottom: 20 }}>
            Esta planeación incluye 10 días de actividades alineadas a la Nueva Escuela Mexicana
            (NEM), organizadas por:
          </Text>

          <View style={{ marginBottom: 12 }}>
            <Text style={{ fontSize: 11, fontFamily: 'Helvetica-Bold', color: '#111827' }}>
              • 4 Campos Formativos
            </Text>
            <Text style={{ fontSize: 9, color: '#6B7280', marginLeft: 12, marginTop: 4 }}>
              Lenguajes, Saberes y Pensamiento Científico, Ética Naturaleza y Sociedades, De lo
              Humano y lo Comunitario
            </Text>
          </View>

          <View style={{ marginBottom: 12 }}>
            <Text style={{ fontSize: 11, fontFamily: 'Helvetica-Bold', color: '#111827' }}>
              • 7 Ejes Articuladores
            </Text>
            <Text style={{ fontSize: 9, color: '#6B7280', marginLeft: 12, marginTop: 4 }}>
              Inclusión, Pensamiento crítico, Interculturalidad, Igualdad de género, Vida saludable,
              Lectura y escritura, Artes
            </Text>
          </View>

          <View style={{ marginTop: 30, padding: 12, backgroundColor: '#F3F4F6', borderRadius: 4 }}>
            <Text style={{ fontSize: 9, color: '#6B7280', lineHeight: 1.6 }}>
              Nota: Esta planeación respeta el cronograma fijo institucional (Honores los lunes,
              Letter & Number los martes, etc.) e incluye los 4 elementos permanentes diarios: valor
              del mes, pausa activa, estrategia comunitaria y aventura lectora.
            </Text>
          </View>
        </View>

        <Text style={styles.footer}>
          Generado el {props.generatedAt} · MaestraAI · maestraai.mx
        </Text>
      </Page>

      {/* Lesson Plan Pages */}
      {props.lessonPlans.map((plan, index) => (
        <Page key={plan.dayNumber} size="LETTER" style={styles.page}>
          <View style={styles.dayHeader}>
            <Text style={styles.dayTitle}>
              Día {plan.dayNumber} - {plan.dayLabel}
            </Text>
            <Text style={styles.dayDate}>{plan.dateFormatted}</Text>
          </View>

          {/* Activity Blocks */}
          {plan.blocks.map((block, blockIndex) => (
            <View key={blockIndex} style={styles.block}>
              <Text style={styles.blockTime}>{block.time}</Text>
              <Text style={styles.blockActivity}>{block.activity}</Text>
              {block.materials && (
                <Text style={styles.blockDetail}>
                  <Text style={styles.blockLabel}>Materiales:</Text> {block.materials}
                </Text>
              )}
              <Text style={styles.blockDetail}>
                <Text style={styles.blockLabel}>Campo:</Text> {block.nemField}
              </Text>
              <Text style={styles.blockDetail}>
                <Text style={styles.blockLabel}>Eje:</Text> {block.nemAxis}
              </Text>
            </View>
          ))}

          {/* Vocabulary */}
          {plan.vocabulary && (
            <View style={styles.vocabularyBox}>
              <Text style={styles.vocabularyText}>
                <Text style={{ fontFamily: 'Helvetica-Bold' }}>Vocabulario: </Text>
                {plan.vocabulary}
              </Text>
            </View>
          )}

          {/* Observations */}
          {plan.observations && (
            <View style={styles.observationsBox}>
              <Text style={styles.observationsText}>{plan.observations}</Text>
            </View>
          )}

          {/* NEE Reminders */}
          {plan.neeReminders.length > 0 && (
            <View style={styles.neeBox}>
              <Text
                style={{
                  fontSize: 9,
                  fontFamily: 'Helvetica-Bold',
                  color: '#991B1B',
                  marginBottom: 4,
                }}
              >
                Recordatorios NEE:
              </Text>
              {plan.neeReminders.map((reminder, i) => (
                <Text key={i} style={styles.neeText}>
                  • {reminder}
                </Text>
              ))}
            </View>
          )}

          <Text style={styles.footer}>
            Página {index + 2} de {props.lessonPlans.length + 1} · Quincena {props.fortnightNumber}{' '}
            · {props.projectName}
          </Text>
        </Page>
      ))}
    </Document>
  )
}
