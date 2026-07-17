// Pure data: each NEM methodology's didactic structure (keys + human labels).
// Leaf module (no imports) so both lib/planner (subplan) and lib/nem (grounding) can use it
// without an import cycle. The 6 modalidades oficiales come from
// context/campos-formativos-modalidades.md (school ground truth).
export const METHODOLOGY_STRUCTURE: Record<string, { key: string; label: string }[]> = {
  'Centro de Interés': [
    { key: 'momento_1', label: '1° Momento: En contacto con la realidad' },
    { key: 'momento_2', label: '2° Momento: Identificación e integración' },
    { key: 'momento_3', label: '3° Momento: Expresión' },
  ],
  'Aprendizaje Basado en el Juego': [
    { key: 'momento_1', label: '1° Momento: Planteamiento del juego' },
    { key: 'momento_2', label: '2° Momento: Desarrollo de las actividades' },
    { key: 'momento_3', label: '3° Momento: Compartimos la experiencia' },
    { key: 'momento_4', label: '4° Momento: Comunidad de juego' },
  ],
  'Taller Crítico': [
    { key: 'situacion_inicial', label: 'Situación Inicial' },
    { key: 'organizacion', label: 'Organización de las Acciones (mesas/equipos, reglas)' },
    { key: 'puesta_en_marcha', label: 'Puesta en Marcha (días con fechas)' },
    { key: 'valoramos', label: 'Valoramos lo Aprendido' },
  ],
  'Rincones de Aprendizaje': [
    { key: 'saberes_previos', label: 'Saberes previos' },
    { key: 'asamblea_inicial', label: 'Asamblea inicial y planeación' },
    { key: 'exploracion', label: 'Exploración de los rincones' },
    { key: 'compartimos', label: 'Compartimos lo aprendido' },
    { key: 'reflexion', label: 'Reflexión sobre el aprendizaje' },
  ],
  'Unidad Didáctica': [
    { key: 'lectura_realidad', label: 'Lectura de la realidad' },
    { key: 'identificacion_trama', label: 'Identificación de la trama y complejidad' },
    { key: 'planificacion', label: 'Planificación y organización del trabajo' },
    { key: 'exploracion', label: 'Exploración y descubrimiento' },
    { key: 'participacion', label: 'Participación activa y horizontal' },
    { key: 'valoracion', label: 'Valoración de la experiencia' },
  ],
  Proyecto: [
    { key: 'punto_de_partida', label: 'Punto de Partida' },
    { key: 'planeacion', label: 'Planeación (incluye el friso)' },
    { key: 'a_trabajar', label: 'A trabajar (libros Richmond con páginas si aplica)' },
    { key: 'comunicamos', label: 'Comunicamos Nuestros Logros' },
    { key: 'reflexion', label: 'Reflexión sobre el aprendizaje' },
  ],
  'Situación Didáctica': [
    { key: 'inicio', label: 'Inicio' },
    { key: 'desarrollo', label: 'Desarrollo' },
    { key: 'cierre', label: 'Cierre' },
  ],
  Asamblea: [
    { key: 'inicio', label: 'Inicio' },
    { key: 'desarrollo', label: 'Desarrollo' },
    { key: 'cierre', label: 'Cierre' },
  ],
  // The 4 NEM metodologías globalizadoras (fases oficiales).
  'Aprendizaje Basado en Proyectos Comunitarios': [
    { key: 'planeacion', label: 'Planeación' },
    { key: 'accion', label: 'Acción' },
    { key: 'intervencion', label: 'Intervención' },
  ],
  'Aprendizaje Basado en Indagación (STEAM)': [
    { key: 'introduccion', label: 'Introducción al tema' },
    { key: 'diseno', label: 'Diseño de la indagación' },
    { key: 'organizacion', label: 'Organización de respuestas' },
    { key: 'metacognicion', label: 'Metacognición' },
  ],
  'Aprendizaje Basado en Problemas': [
    { key: 'presentacion', label: 'Presentación del problema' },
    { key: 'recoleccion', label: 'Recolección de datos' },
    { key: 'hipotesis', label: 'Hipótesis' },
    { key: 'experimentacion', label: 'Experimentación' },
    { key: 'analisis', label: 'Análisis y conclusiones' },
  ],
  'Aprendizaje-Servicio': [
    { key: 'punto_de_partida', label: 'Punto de partida' },
    { key: 'lo_que_se', label: 'Lo que sé y quiero saber' },
    { key: 'organizamos', label: 'Organicemos las actividades' },
    { key: 'creatividad', label: 'Creatividad en marcha' },
    { key: 'compartimos', label: 'Compartimos y evaluamos' },
  ],
}

// Render a methodology's didactic structure as an <estructura_proyecto> prompt block for the MAIN
// unit (top-level proyecto). Lets Unit 1 be a Taller / Centro de Interés, not always a Proyecto.
// Empty string when the methodology is unknown → the prompt keeps its default Proyecto structure.
export function buildEstructuraProyectoBlock(metodologia?: string | null): string {
  if (!metodologia) return ''
  const struct = METHODOLOGY_STRUCTURE[metodologia]
  if (!struct) return ''
  const headings = struct.map((s) => `  **${s.label}**`).join('\n')
  return `\n<estructura_proyecto>\nEl campo "proyecto" corresponde a una unidad de metodología "${metodologia}". Asigna el campo "metodologia": "${metodologia}". El campo "proyecto" DEBE usar EXACTAMENTE estos sub-encabezados en negritas, en este orden, desarrollando cada uno a profundidad:\n${headings}\n</estructura_proyecto>`
}
