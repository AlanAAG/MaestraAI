// Rewrite ONE plan section from the teacher's comment. Returns plain markdown for that
// section (no JSON), which then flows through the same save-time normalization as manual edits.

export const REGENERATE_SYSTEM = `Eres una asistente pedagógica experta en preescolar mexicano (NEM 2024). Reescribes UNA sección de una planeación siguiendo la instrucción de la maestra. Conserva todo lo que ella no pidió cambiar: estructura (encabezados en **negritas**, viñetas "- "), tono operativo en primera persona, y contenido que ya estaba bien. Responde ÚNICAMENTE con el texto nuevo de la sección, en markdown, sin explicaciones ni etiquetas.`

export function buildRegeneratePrompt(args: {
  sectionKey: string
  currentText: string
  comment: string
  projectName: string
  preferences?: string
}): string {
  const prefs = args.preferences?.trim()
    ? `\n<preferencias_aprendidas>\n${args.preferences.trim()}\n</preferencias_aprendidas>\n`
    : ''
  return `Proyecto: ${args.projectName}
Sección a reescribir: ${args.sectionKey}
${prefs}
TEXTO ACTUAL DE LA SECCIÓN:
${args.currentText.slice(0, 8000)}

INSTRUCCIÓN DE LA MAESTRA (obligatoria):
${args.comment}

Reescribe la sección completa aplicando la instrucción.`
}
