// lib/materials/worksheets.ts
import Anthropic from '@anthropic-ai/sdk'
import { WORKSHEETS_PROMPT } from '@/prompts/materials'
import { classContextBlock, type FortnightContext } from './types'

export type { WorksheetActivity, WorksheetContent, WorksheetItem } from './worksheet-content'
import type { WorksheetContent } from './worksheet-content'

export async function buildWorksheetContent(
  vocabulary: string[],
  context?: FortnightContext
): Promise<WorksheetContent> {
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  const contextBlock = classContextBlock(context)

  const userMessage = `${contextBlock}Vocabulario para las actividades:
${vocabulary.map((word) => `- ${word}`).join('\n')}

Genera actividades de worksheet apropiadas para este vocabulario.`

  const response = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 2048,
    temperature: 0.3,
    system: WORKSHEETS_PROMPT,
    messages: [{ role: 'user', content: userMessage }],
  })

  const content = response.content[0]
  if (content.type !== 'text') {
    throw new Error('Unexpected response type from Claude')
  }

  const jsonMatch =
    content.text.match(/```json\n([\s\S]*?)\n```/) || content.text.match(/\{[\s\S]*\}/)
  const raw = jsonMatch?.[1] ?? jsonMatch?.[0]
  if (!raw) throw new Error('Claude no devolvió JSON válido')
  try {
    return JSON.parse(raw) as WorksheetContent
  } catch {
    throw new Error('Respuesta de Claude no es JSON válido')
  }
}
