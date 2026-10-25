import { OPENAI_MODELS } from '@/lib/ai/models'
// lib/materials/worksheets.ts
import OpenAIProvider from '@/lib/ai/openai-provider'
import { WORKSHEETS_PROMPT } from '@/prompts/materials'
import { classContextBlock, type FortnightContext } from './types'

export type { WorksheetActivity, WorksheetContent, WorksheetItem } from './worksheet-content'
import type { WorksheetContent } from './worksheet-content'

export async function buildWorksheetContent(
  vocabulary: string[],
  context?: FortnightContext
): Promise<WorksheetContent> {
  const provider = new OpenAIProvider({ apiKey: process.env.OPENAI_API_KEY })

  const contextBlock = classContextBlock(context)

  const userMessage = `${contextBlock}Vocabulario para las actividades:
${vocabulary.map((word) => `- ${word}`).join('\n')}

Genera actividades de worksheet apropiadas para este vocabulario.`

  const response = await provider.messages.create({
    jsonMode: true,
    model: OPENAI_MODELS.routine,
    max_tokens: 2048,
    system: WORKSHEETS_PROMPT,
    messages: [{ role: 'user', content: userMessage }],
  })

  const content = response.content[0]
  if (content.type !== 'text') {
    throw new Error('Unexpected response type from OpenAI')
  }

  const jsonMatch =
    content.text.match(/```json\n([\s\S]*?)\n```/) || content.text.match(/\{[\s\S]*\}/)
  const raw = jsonMatch?.[1] ?? jsonMatch?.[0]
  if (!raw) throw new Error('La IA no devolvió JSON válido')
  try {
    return JSON.parse(raw) as WorksheetContent
  } catch {
    throw new Error('La respuesta de la IA no es JSON válido')
  }
}
