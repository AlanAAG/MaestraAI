// Run after setting OPENAI_API_KEY locally or in a deployment shell.
// Sends two tiny requests to confirm both configured model tiers are accessible.
import { loadEnvConfig } from '@next/env'
import OpenAI from 'openai'

loadEnvConfig(process.cwd())
if (!process.env.OPENAI_API_KEY) {
  console.error('OPENAI_API_KEY is missing')
  process.exit(1)
}

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY, timeout: 15000, maxRetries: 0 })
for (const [model, effort] of [['gpt-6-luna', 'none'], ['gpt-6.1-sol', 'low']]) {
  try {
    const response = await client.responses.create({
      model,
      instructions: 'Respond with a JSON object containing only {"ok":true}.',
      input: 'Confirm access.',
      text: { format: { type: 'json_object' } },
      reasoning: { effort },
      max_output_tokens: 256,
      store: false,
    })
    if (response.status !== 'completed' || JSON.parse(response.output_text).ok !== true) {
      throw new Error(`Unexpected response status: ${response.status}`)
    }
    console.log(`${model}: OK (${response.usage?.input_tokens ?? 0} input, ${response.usage?.output_tokens ?? 0} output tokens)`)
  } catch (error) {
    console.error(`${model}: ${error.status ?? 'error'} ${error.code ?? ''} ${error.message}`)
    process.exitCode = 1
  }
}
