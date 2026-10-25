// Run after setting OPENAI_API_KEY locally or in a deployment shell.
// Sends two tiny requests to confirm both configured model tiers are accessible.
import nextEnv from '@next/env'
import OpenAI from 'openai'
import { spawnSync } from 'node:child_process'

// Node's fetch uses the local HTTPS proxy only when this flag is set at startup.
if (
  process.env.HTTPS_PROXY &&
  process.env.NODE_USE_ENV_PROXY !== '1' &&
  Number(process.versions.node.split('.')[0]) >= 24
) {
  const child = spawnSync(process.execPath, [process.argv[1]], {
    env: { ...process.env, NODE_USE_ENV_PROXY: '1' },
    stdio: 'inherit',
  })
  process.exit(child.status ?? 1)
}

const { loadEnvConfig } = nextEnv
loadEnvConfig(process.cwd())
if (!process.env.OPENAI_API_KEY) {
  console.error('OPENAI_API_KEY is missing')
  process.exit(1)
}

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY, timeout: 15000, maxRetries: 0 })
for (const [model, effort] of [
  ['gpt-6-luna', 'none'],
  ['gpt-6.1-sol', 'low'],
]) {
  try {
    const response = await client.responses.create({
      model,
      instructions: 'Respond with a JSON object containing only {"ok":true}.',
      input: 'Confirm access and return JSON.',
      text: { format: { type: 'json_object' } },
      reasoning: { effort },
      max_output_tokens: 256,
      store: false,
    })
    if (response.status !== 'completed' || JSON.parse(response.output_text).ok !== true) {
      throw new Error(`Unexpected response status: ${response.status}`)
    }
    console.log(
      `${model}: OK (${response.usage?.input_tokens ?? 0} input, ${response.usage?.output_tokens ?? 0} output tokens)`
    )
  } catch (error) {
    console.error(`${model}: ${error.status ?? 'error'} ${error.code ?? ''} ${error.message}`)
    process.exitCode = 1
  }
}
