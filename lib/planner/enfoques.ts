/**
 * Enfoques pedagógicos — the classroom philosophy a plan is written through.
 *
 * This is deliberately ORTHOGONAL to `metodologia` (METHODOLOGY_STRUCTURE):
 *   - metodología = the didactic STRUCTURE, i.e. which fases/headings the plan uses.
 *     Those come from SEP and are enforced; they don't change here.
 *   - enfoque = HOW the activities inside that structure are conceived — what the
 *     adult's role is, how the environment is set up, what counts as evidence of
 *     learning.
 *
 * Why not simply mirror a generic lesson-planner's list: several common entries
 * (Gagné's 9 Events, Madeline Hunter/ITIP) are direct-instruction models built for
 * older students and sit against what NEM asks of preescolar — play, projects,
 * exploration. Dropping a teacher-led "present → model → guided practice" template
 * onto a 4-year-old's plan would produce a document that reads as pedagogically
 * wrong to a Mexican supervisor, whatever the model's merits elsewhere. "SPARK"
 * is not a standardised framework (at least three unrelated things use the name),
 * and "student-centered" describes all of NEM rather than distinguishing anything.
 *
 * What's here instead: the two frameworks SEP itself endorses, plus the alternative
 * models actually found in Mexican private preschools, plus science inquiry.
 *
 * Every block is a LENS. It never overrides the NEM hard rules — contenidos/PDA
 * verbatim from the official bank, qualitative evaluation only, the modalidad's
 * fases as headings.
 */

export type Enfoque = {
  slug: string
  label: string
  /** One line for the picker. */
  summary: string
  /** Shown under the label — why a teacher would pick this. */
  detail: string
  /** Marks the SEP-endorsed options so the picker can surface them. */
  official?: boolean
  /** Injected into the generation prompt. Empty for the NEM-base default. */
  prompt: string
}

export const ENFOQUE_DEFAULT = 'nem'

export const ENFOQUES: Enfoque[] = [
  {
    slug: 'nem',
    label: 'NEM (sin enfoque adicional)',
    summary: 'La planeación estándar de la Nueva Escuela Mexicana.',
    detail:
      'Usa solo el marco oficial: campos formativos, ejes articuladores y la metodología que elegiste. Elige esto si tu escuela no sigue un enfoque particular.',
    official: true,
    prompt: '',
  },

  {
    slug: 'dua',
    label: 'DUA — Diseño Universal para el Aprendizaje',
    summary: 'Diseña desde el inicio para todos, sin adaptar después.',
    detail:
      'Marco que la propia SEP impulsa para la atención a la diversidad. Cada actividad ofrece varias formas de participar, de recibir la información y de demostrar lo aprendido.',
    official: true,
    prompt: `<enfoque_pedagogico nombre="DUA (Diseño Universal para el Aprendizaje)">
La maestra trabaja con DUA, el marco que la SEP impulsa para la atención a la diversidad. La idea central: NO diseñes una actividad estándar y luego la adaptes — diseña desde el principio pensando en la variabilidad del grupo.

Aplica los 3 principios en CADA actividad que escribas:
• PARTICIPACIÓN (el porqué): ofrece opciones que enganchen a distintos niños — elegir con quién trabajar, elegir el material, distintos niveles de reto. Cuida la pertenencia: que cada niño se vea reflejado. Nombra cómo vas a sostener la atención y la persistencia de quien se frustra rápido.
• REPRESENTACIÓN (el qué): presenta la misma información por más de un canal — visual (imágenes, objetos reales), auditivo (canción, relato), táctil o corporal. Nunca una sola vía.
• ACCIÓN Y EXPRESIÓN (el cómo): deja que el niño demuestre lo que sabe de varias maneras — diciéndolo, dibujándolo, actuándolo, construyéndolo, señalándolo. No exijas una sola forma de respuesta.

Escribe las opciones como parte natural de la actividad ("pueden contarlo, dibujarlo o armarlo con bloques"), no como una lista de adaptaciones aparte.

La sección de ajustes razonables debe quedar coherente con esto: si ya diseñaste con múltiples vías, los ajustes son los apoyos ADICIONALES y específicos que aún hace falta nombrar, no una repetición.
</enfoque_pedagogico>`,
  },

  {
    slug: 'socioemocional',
    label: 'Aprendizaje Socioemocional (CASEL)',
    summary: 'Cada actividad cultiva una competencia socioemocional.',
    detail:
      'Integra las 5 competencias CASEL en el trabajo diario. Conecta de forma natural con el campo De lo Humano y lo Comunitario y con los ejes de Inclusión y Vida saludable.',
    official: true,
    prompt: `<enfoque_pedagogico nombre="Aprendizaje Socioemocional (CASEL)">
La maestra teje lo socioemocional en todo el trabajo, no como una clase aparte. Las 5 competencias CASEL, en lenguaje de preescolar:
• Autoconciencia: reconocer y nombrar lo que siento ("estoy enojado", "me da miedo").
• Autorregulación: esperar mi turno, calmarme, volver a intentar después de un error.
• Conciencia social: notar cómo se siente el otro, reconocer que hay casas y familias distintas a la mía.
• Habilidades de relación: pedir ayuda, compartir, resolver un pleito con palabras.
• Toma de decisiones responsable: elegir y hacerse cargo de lo elegido, cuidar el material y a los demás.

En cada momento de la planeación, nombra explícitamente qué competencia se está trabajando y CÓMO — con qué frase, qué rutina, qué pregunta. Ejemplo del nivel de concreción esperado: "antes de repartir el material les pregunto cómo creen que se siente quien se queda sin turno".

Incluye vocabulario emocional concreto que los niños van a escuchar y usar. Considera rutinas de regulación (rincón de la calma, respiración, semáforo de emociones) donde encajen.

La evaluación de esto sigue siendo cualitativa y observable — describe la conducta, nunca califiques al niño como persona.
</enfoque_pedagogico>`,
  },

  {
    slug: 'montessori',
    label: 'Montessori',
    summary: 'Ambiente preparado, materiales autocorrectivos, trabajo auto-dirigido.',
    detail:
      'Para aulas Montessori. La edad 3-6 es justo la Casa dei Bambini: elección libre, ciclos de trabajo largos y la guía observando más que dirigiendo.',
    prompt: `<enfoque_pedagogico nombre="Montessori">
La maestra trabaja con enfoque Montessori. El grupo de 3 a 6 años corresponde a la Casa dei Bambini. Principios que deben notarse en cada actividad:

• AMBIENTE PREPARADO: describe cómo queda dispuesto el material ANTES de que lleguen los niños — en charolas completas, a su altura, ordenado, un material por concepto. El ambiente enseña; la maestra lo prepara.
• LIBRE ELECCIÓN Y CICLO DE TRABAJO: el niño escoge su trabajo y lo repite cuanto quiera. Protege la concentración: no interrumpas a un niño concentrado. Nombra bloques de trabajo largos, no actividades de 10 minutos en cadena.
• MATERIAL AUTOCORRECTIVO: el material mismo muestra el error, sin que la maestra corrija. Al proponer material, di cuál es el control de error.
• LECCIÓN DE TRES TIEMPOS para vocabulario y conceptos nuevos: (1) "esto es…", (2) "muéstrame…", (3) "¿qué es esto?". Úsala donde se presente lenguaje nuevo.
• LA GUÍA OBSERVA: el rol adulto es presentar el material y retirarse a observar y registrar. Escribe las actividades desde ahí, no como instrucción dirigida al grupo entero.
• "Ayúdame a hacerlo por mí mismo": autonomía real — servir su agua, abrochar, limpiar lo que derramó.

Ubica el trabajo en las áreas Montessori cuando aplique: Vida Práctica, Sensorial, Lenguaje, Matemáticas y Cultural.

Evita: premios y castigos, trabajo en fila para todo el grupo al mismo tiempo, fantasía presentada como realidad a los más pequeños.
</enfoque_pedagogico>`,
  },

  {
    slug: 'reggio',
    label: 'Reggio Emilia',
    summary: 'Los cien lenguajes, el ambiente como tercer maestro, documentación.',
    detail:
      'Para escuelas de inspiración reggiana. Proyectos que emergen del interés de los niños, con documentación visible del proceso.',
    prompt: `<enfoque_pedagogico nombre="Reggio Emilia">
La maestra trabaja con inspiración Reggio Emilia. Principios que deben verse en las actividades:

• LOS CIEN LENGUAJES: el niño se expresa por muchas vías — barro, dibujo, luz y sombra, movimiento, palabra, construcción, sonido. Ofrece más de un lenguaje en cada indagación; no reduzcas todo a hablar y colorear.
• EL AMBIENTE COMO TERCER MAESTRO: describe cómo se dispone el espacio y los materiales para provocar preguntas. Materiales abiertos y no estructurados (naturales, reciclados, transparentes, luz) por encima de fichas cerradas.
• NIÑO PROTAGONISTA Y CAPAZ: el proyecto sigue las preguntas REALES de los niños. Escribe qué vas a escuchar y cómo vas a recoger sus hipótesis antes de decidir el siguiente paso.
• ESCUCHA Y DOCUMENTACIÓN: registra lo que dicen y hacen — frases textuales, fotos, dibujos — y devuélveselo (panel, libro del proyecto). La documentación es para que el niño se vea pensando, y para hacer visible el aprendizaje a las familias. Inclúyela como parte del trabajo, no como trámite.
• PROGETTAZIONE: el proyecto se va construyendo; deja puntos abiertos donde el rumbo dependerá de lo que surja, en vez de un guion cerrado día por día.
• ATELIER: incluye momentos de taller expresivo con materiales de calidad.

El adulto pregunta más de lo que explica. Prefiere preguntas genuinas, sin respuesta única.
</enfoque_pedagogico>`,
  },

  {
    slug: 'waldorf',
    label: 'Waldorf',
    summary: 'Ritmo, imitación, juego libre y materiales naturales.',
    detail:
      'Para jardines Waldorf. El aprendizaje ocurre por imitación y en un ritmo predecible; la fantasía y el arte atraviesan todo.',
    prompt: `<enfoque_pedagogico nombre="Waldorf">
La maestra trabaja con pedagogía Waldorf en jardín de infancia. Principios que deben verse:

• RITMO: el día, la semana y el año tienen un pulso predecible que sostiene al niño — momentos de expansión y de recogimiento alternados. Nombra el ritmo (qué día toca pan, acuarela, jardín, cuento) y respétalo por repetición, no por novedad constante.
• IMITACIÓN: a esta edad el niño aprende haciendo lo que ve hacer al adulto con dedicación. Escribe las actividades como trabajo real que la maestra hace y los niños acompañan (amasar, remendar, barrer, cuidar plantas), no como instrucciones verbales.
• JUEGO LIBRE: bloques largos de juego no dirigido, con materiales naturales y poco estructurados (telas, madera, conos, lana) que la imaginación completa.
• ARTE E IMAGEN: cuento narrado de memoria (no leído), verso y canto, acuarela húmedo-sobre-húmedo, euritmia y juegos de dedos. Habla en imágenes, no en explicaciones abstractas.
• AMBIENTE CÁLIDO Y SENCILLO: pocos materiales, bellos y naturales; colores suaves.

Evita a esta edad: instrucción académica formal temprana, pantallas, exceso de estímulo, y evaluación que el niño perciba.
</enfoque_pedagogico>`,
  },

  {
    slug: 'high-scope',
    label: 'High Scope (Planear–Hacer–Recordar)',
    summary: 'El niño planea su trabajo, lo realiza y lo recuerda.',
    detail:
      'Rutina diaria consistente con el ciclo planear-hacer-recordar. Encaja muy bien con la asamblea y los rincones.',
    prompt: `<enfoque_pedagogico nombre="High Scope">
La maestra trabaja con High Scope. El corazón del enfoque es el ciclo PLANEAR – HACER – RECORDAR, que debe aparecer explícito en la rutina:

• PLANEAR: antes de trabajar, cada niño dice o representa qué va a hacer, dónde y con qué. Describe CÓMO vas a recoger ese plan a esta edad (señalando el área, con una tarjeta, dibujándolo, diciéndolo al oído).
• HACER: tiempo de trabajo sostenido donde el niño lleva a cabo su plan. El adulto se sienta a su altura, juega junto a él, comenta lo que observa y hace preguntas auténticas — no dirige ni corrige el juego.
• RECORDAR: después, el niño cuenta qué hizo, qué le salió, qué cambió respecto a su plan. Usa apoyos concretos (el objeto que construyó, una foto).

Otros rasgos que deben notarse:
• APRENDIZAJE ACTIVO: aprender haciendo con materiales reales, elección propia, lenguaje del niño y apoyo del adulto.
• RUTINA DIARIA CONSISTENTE: el niño sabe qué sigue; eso le da seguridad para decidir.
• INTERACCIÓN ADULTO-NIÑO EN PARTICIPACIÓN: comparte el control, reconoce el esfuerzo de forma descriptiva ("veo que probaste tres formas de que no se cayera") en lugar de elogio vacío ("muy bien").
• RESOLUCIÓN DE CONFLICTOS paso a paso, con el adulto acompañando y los niños proponiendo la solución.
</enfoque_pedagogico>`,
  },

  {
    slug: 'indagacion-5e',
    label: 'Indagación científica (5E)',
    summary: 'Involucrar, Explorar, Explicar, Elaborar, Evaluar.',
    detail:
      'Para trabajar Saberes y Pensamiento Científico partiendo de un fenómeno real que despierte preguntas.',
    prompt: `<enfoque_pedagogico nombre="Indagación científica (5E)">
La maestra construye el trabajo como una indagación anclada en un FENÓMENO concreto y observable que los niños puedan presenciar (algo que flota y algo que se hunde, una sombra que cambia, una semilla que germina, hielo que se derrite). El fenómeno va primero; el concepto se nombra después.

Recorre los 5 momentos, adaptados a preescolar:
• INVOLUCRAR: presenta el fenómeno y recoge lo que los niños ya piensan. Anota sus hipótesis TAL COMO las dicen, aunque estén equivocadas — son el punto de partida, no un error que corregir de inmediato.
• EXPLORAR: manipulación directa antes de cualquier explicación. Los niños prueban, comparan, repiten. La maestra pregunta "¿qué notas?", "¿qué pasaría si…?".
• EXPLICAR: recién ahora se construye la explicación con las palabras de los niños, y la maestra introduce el vocabulario preciso.
• ELABORAR: aplicar la idea a una situación nueva para ver si se sostiene.
• EVALUAR: atraviesa todo — observa qué preguntan, qué predicen, cómo cambió lo que pensaban al inicio.

Cuida: registro gráfico de lo observado (dibujo, tabla de conteo con marcas), predicción antes de probar, y comparar el "antes pensaba / ahora pienso". No adelantes la respuesta correcta; sostén la pregunta abierta.
</enfoque_pedagogico>`,
  },
]

const BY_SLUG = new Map(ENFOQUES.map((e) => [e.slug, e]))

export function getEnfoque(slug?: string | null): Enfoque | null {
  return slug ? (BY_SLUG.get(slug) ?? null) : null
}

/** Prompt block for a plan's enfoque. Empty for the NEM default or an unknown slug. */
export function enfoqueBlock(slug?: string | null): string {
  return getEnfoque(slug)?.prompt ?? ''
}

/** Label for display (viewer, chat context, exports). */
export function enfoqueLabel(slug?: string | null): string {
  return getEnfoque(slug)?.label ?? ''
}
