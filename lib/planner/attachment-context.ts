// <archivos_de_la_maestra>: extracted text of files attached at creation (migration 075).
// Keep complete accepted files; oversized bundles fail explicitly instead of losing instructions.
export function attachmentsBlock(fn: { attachment_context?: unknown }): string {
  const list = Array.isArray(fn?.attachment_context) ? fn.attachment_context : []
  const valid = list.filter(
    (a: { name?: unknown; text?: unknown }) => a?.name && typeof a?.text === 'string'
  ) as { name: string; text: string }[]
  if (valid.length > 10 || valid.reduce((n, a) => n + a.text.length, 0) > 120000) {
    throw new Error(
      'Los archivos adjuntos son demasiado extensos para seguir todas sus instrucciones. Usa hasta 10 archivos con un total de 120,000 caracteres o divide la planeación.'
    )
  }
  // Keep every instruction, including rules at the end. Retrieval supplements the sources;
  // an embedding outage must never silently remove part of the teacher's documents.
  const items = valid.map((a) => `--- ${String(a.name).slice(0, 120)} ---\n${a.text}`)
  if (!items.length) return ''
  return `<archivos_de_la_maestra>\nLa maestra adjuntó estos documentos para ESTA planeación y quedarán ANEXADOS al documento final. OBLIGATORIO:\n- USA su contenido: temas, FECHAS y PÁGINAS verbatim, vocabulario e indicaciones, integrados en las actividades de los días correctos.\n- Si un archivo es una hoja de trabajo o material, INCLÚYELO como actividad concreta en el momento apropiado, nombrándolo así: 'Hoja de trabajo anexa: <nombre del archivo>' (con lo que el alumno hará en ella).\n- No copies documentos íntegros; intégralos.\n${items.join('\n\n')}\n</archivos_de_la_maestra>`
}
