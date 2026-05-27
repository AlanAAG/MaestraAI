// lib/materials/worksheets.ts
import Anthropic from '@anthropic-ai/sdk'
import { WORKSHEETS_PROMPT } from '@/prompts/materials'

export type WorksheetActivity = {
  type: 'tracing' | 'matching' | 'coloring' | 'circling' | 'sequencing'
  title: string
  instructions: string
  items?: string[]
  pairs?: Array<{ word: string; description: string }>
}

export type WorksheetContent = {
  activities: WorksheetActivity[]
}

export async function buildWorksheetContent(vocabulary: string[]): Promise<WorksheetContent> {
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  const userMessage = `
Vocabulario para las actividades:
${vocabulary.map((word) => `- ${word}`).join('\n')}

Genera actividades de worksheet apropiadas para este vocabulario.
`.trim()

  const response = await anthropic.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 2048,
    temperature: 0.7,
    system: WORKSHEETS_PROMPT,
    messages: [{ role: 'user', content: userMessage }],
  })

  const content = response.content[0]
  if (content.type !== 'text') {
    throw new Error('Unexpected response type from Claude')
  }

  try {
    const jsonMatch = content.text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error('No JSON found in response')
    }
    return JSON.parse(jsonMatch[0]) as WorksheetContent
  } catch {
    console.error('Failed to parse worksheet response:', content.text)
    throw new Error('Failed to parse worksheet content')
  }
}
