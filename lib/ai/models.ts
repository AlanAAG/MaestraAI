/** Model routing for application generation. Keep routine work on Luna; use Sol only as a planning fallback. */
export const OPENAI_MODELS = {
  routine: 'gpt-6-luna',
  planning: 'gpt-6.1-sol',
  compatibility: 'gpt-4o-mini',
  embedding: 'text-embedding-3-small',
} as const
