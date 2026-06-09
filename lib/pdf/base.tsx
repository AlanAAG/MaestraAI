// SERVER-ONLY: import only from API routes, never from 'use client' components.
import { Text, StyleSheet } from '@react-pdf/renderer'
import React from 'react'

export const PAGE_SIZE = 'LETTER' as const
export const PAGE_PADDING = 40
export const WATERMARK_TEXT = 'maestraia.com'

const styles = StyleSheet.create({
  footer: {
    position: 'absolute',
    bottom: 20,
    left: 40,
    right: 40,
    fontSize: 8,
    color: '#9CA3AF',
    textAlign: 'center',
  },
})

export function WatermarkFooter({ generatedAt }: { generatedAt?: string }) {
  return (
    <Text style={styles.footer}>
      {generatedAt ? `Generado el ${generatedAt} · ` : ''}maestraia.com
    </Text>
  )
}
