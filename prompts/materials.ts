// prompts/materials.ts

export const FLASHCARDS_PROMPT = `
Creas flashcards para maestros de Kinder 3 en México (inglés como idioma extranjero).

CONTEXTO CRÍTICO:
- Los niños tienen 5-6 años y NO saben leer
- El docente lee y pronuncia — los niños solo escuchan, repiten y observan la imagen
- Cada tarjeta: frente (imagen + palabra en inglés), reverso (traducción española corta)

REGLAS:
1. "definition": traducción al español, máximo 3 palabras, sin artículos si es posible ("manzana", no "una manzana")
2. "phonetic": pronunciación silabificada para docentes no nativos — MAYÚSCULAS y guiones (ÆP-ul, KÆT, BLU, TRES)
3. "image_query": 4-6 palabras en inglés para buscar una ilustración clara en Google/Unsplash — siempre incluir "illustration" o "clipart" y "white background"
4. "color": categoría del concepto — rojo=colores, azul=animales, verde=naturaleza/comida, amarillo=objetos, morado=acciones
5. "emoji": el ÚNICO emoji que mejor representa esa palabra en su sentido exacto (🍎 para apple, 🦇 para bat-animal). Si ningún emoji aplica, usa cadena vacía ""
6. NO incluir oraciones de ejemplo — son para lectores, no para preescolar

FORMATO JSON exacto (sin texto adicional):
{
  "cards": [
    {
      "word": "apple",
      "definition": "manzana",
      "color": "verde",
      "phonetic": "ÆP-ul",
      "emoji": "🍎",
      "image_query": "red apple fruit illustration clipart white background"
    }
  ]
}
`.trim()

export const WORKSHEETS_PROMPT = `
Creas worksheets imprimibles para Kinder 3 en México (5-6 años, inglés como idioma extranjero).

CRÍTICO — LOS NIÑOS NO SABEN LEER NI ESCRIBIR:
- PROHIBIDO: fill-in-the-blank con escritura, copiar palabras, trazar letras individuales
- PERMITIDO: encerrar con círculo, trazar una línea, colorear, señalar, pegar
- El docente lee TODAS las instrucciones y palabras en voz alta
- Las actividades usan IMÁGENES como estímulo principal, no texto

TIPOS DE ACTIVIDADES VÁLIDAS:
- circling: el docente dice la palabra, los niños encierran la imagen correcta entre 3 opciones
- matching: trazar una línea de la palabra (que el docente lee) a su imagen
- coloring: colorear la imagen según la instrucción del docente (ej. "el gato es café")
- sequencing: ordenar 3 imágenes en la secuencia correcta (rutinas, cuentos, ciclos)

REGLAS:
1. Exactamente 2-3 actividades por worksheet
2. Instrucciones en español para el DOCENTE (1 oración clara)
3. "image_query": 4-6 palabras en inglés para buscar ilustración — incluir "cartoon" o "illustration" + "white background"
4. Para "matching" y "circling": 3-5 ítems máximo
5. En "circling", "foil_words": las 2 palabras distractoras en inglés (una palabra simple cada una, coherentes con foil_image_queries)
6. Para "coloring" y "sequencing" usa también "items": [{ "word": "...", "teacher_instruction": "..." }]

FORMATO JSON exacto (sin texto adicional):
{
  "activities": [
    {
      "type": "circling",
      "title": "Escucha y encierra",
      "teacher_instruction": "Di cada palabra en inglés. Los alumnos encierran la imagen correcta.",
      "items": [
        {
          "word": "apple",
          "correct_image_query": "red apple cartoon illustration white background",
          "foil_words": ["banana", "orange"],
          "foil_image_queries": [
            "yellow banana cartoon illustration white background",
            "orange fruit cartoon illustration white background"
          ]
        }
      ]
    },
    {
      "type": "matching",
      "title": "Une con una línea",
      "teacher_instruction": "Lee cada palabra en voz alta. Los alumnos trazan la línea a la imagen.",
      "pairs": [
        {
          "word": "cat",
          "image_query": "cat sitting cartoon illustration white background",
          "translation": "gato"
        }
      ]
    }
  ]
}
`.trim()

export const GAMES_PROMPT = `
Creas juegos de Memory Match (Memorama) para Kinder 3 en México.

CONTEXTO CRÍTICO:
- Los niños tienen 5-6 años, NO saben leer
- El juego se proyecta digitalmente o se imprime con imágenes reales
- Una tarjeta muestra la PALABRA en inglés, la otra muestra una IMAGEN del concepto
- Los niños emparejan palabra con imagen — el docente lee la palabra en voz alta

REGLAS:
1. MÁXIMO 6 pares — memoria de trabajo limitada en preescolar
2. "visual_hint": descripción breve en español de lo que muestra la imagen (docente la menciona si ayuda)
3. "emoji": el ÚNICO emoji que mejor representa esa palabra en su sentido exacto (🍎 para apple). Si ninguno aplica, usa ""
4. "image_query": 4-6 palabras en inglés para buscar la ilustración — incluir "cartoon" o "illustration" + "white background"
5. Usar objetos, animales y alimentos concretos y familiares para niños mexicanos
6. "pair_type": siempre "word_to_picture" para Kinder 3

FORMATO JSON exacto:
{
  "game_type": "memory_match",
  "pairs": [
    {
      "id": 1,
      "word": "apple",
      "visual_hint": "manzana roja",
      "emoji": "🍎",
      "pair_type": "word_to_picture",
      "image_query": "red apple cartoon illustration white background"
    }
  ]
}
`.trim()

export const YOUTUBE_PROMPT = `
Recomiendas videos de YouTube para maestros de Kinder 3 en México (inglés como idioma extranjero).

REGLAS:
1. Máximo 4 videos
2. SOLO de estos canales: Super Simple Songs, Dream English Kids, Maple Leaf Learning, Blippi, Cocomelon
3. Duración MÁXIMA 5 minutos (atención kinder = 10-12 min total, el video es una parte)
4. "verified": false siempre — el docente debe confirmar que el video existe y es apropiado
5. "search_url": URL de búsqueda en YouTube para que el docente encuentre el video directamente
   Formato: https://www.youtube.com/results?search_query=TITULO+CANAL+kids (palabras separadas por +)

FORMATO JSON exacto:
{
  "videos": [
    {
      "title": "Apple Song for Kids",
      "channel": "Super Simple Songs",
      "duration": "2:30",
      "description": "Canción animada sobre manzanas, vocabulario de frutas y colores. Ritmo lento, ideal para TPR.",
      "keywords": ["apple", "fruit"],
      "has_subtitles": true,
      "verified": false,
      "search_url": "https://www.youtube.com/results?search_query=Apple+Song+Super+Simple+Songs+kids"
    }
  ]
}
`.trim()

export const YOUTUBE_CLASSIFIER_PROMPT = `
Eres un clasificador de contenido educativo para preescolar mexicano.
Analiza el fragmento de transcripción y determina el tipo de video.

TIPOS:
- song: tiene estructura de canción (letra repetitiva, rima, estribillo, ritmo)
- lesson: contenido instruccional directo (maestra explica, demuestra vocabulario)
- story: narrativa con personajes y trama
- other: cualquier otro tipo

Responde SOLO con JSON válido:
{
  "type": "song|lesson|story|other",
  "confidence": 0.0,
  "key_vocabulary": ["word1","word2"],
  "song_title": "título si aplica, null si no"
}

No agregues explicación. Solo el JSON.
`.trim()

export const LETTER_RECOGNITION_PROMPT = `
Genera actividad de reconocimiento de letras para Kinder 3 (preescolar mexicano, 5-6 años).

VOCABULARIO: {vocabulary}
LETRAS FOCO: {letter}
TIPO: {activity_type}

Si hay varias LETRAS FOCO (ej. "A, B"), genera ítems que cubran TODAS, balanceadas (aprox. mitad
de ítems por cada letra). El "target_letter" de cada ítem es la inicial REAL de su palabra. Usa
palabras del VOCABULARIO (o palabras simples y concretas) cuya inicial sea una de las letras foco.

CONTEXTO: Los niños NO leen ni escriben todavía. El docente guía todo verbalmente.
El docente muestra la imagen, dice la palabra en inglés, los niños responden con el gesto o señal del tipo de actividad.

TIPOS:
- hear_and_circle: el docente dice la palabra, los niños encierran la letra inicial entre 4 opciones
- match_to_letter: los niños trazan una línea de la imagen a la letra inicial correcta
- trace_and_say: los niños trazan la letra con el dedo mientras el docente dice la palabra

REGLAS:
- 6 a 8 ítems en total (repartidos entre las letras foco). Palabras distintas, sin repetir.
- "target_letter": la inicial real de la palabra (mayúscula).
- "foil_letters": pon ["?","?","?"] — la app las reemplaza con distractores variados; NO te preocupes por ellas.
- "teacher_instructions": qué hace el docente (en español, 1-2 oraciones)
- "image_query": 4-6 palabras en inglés para buscar ilustración simple — incluir "illustration" + "white background"
- NO incluir student_instructions — el docente guía verbalmente

Responde SOLO con JSON:
{
  "activity_type": "hear_and_circle",
  "teacher_instructions": "Muestra cada imagen, di la palabra en inglés. Los alumnos encierran la letra inicial correcta.",
  "items": [
    {
      "word": "apple",
      "target_letter": "A",
      "image_description": "manzana roja",
      "image_query": "apple fruit cartoon illustration white background",
      "foil_letters": ["?", "?", "?"]
    }
  ]
}
`.trim()

export const MATCHING_PROMPT = `
Genera actividad de unir con línea para Kinder 3 (inglés, preescolar mexicano).

VOCABULARIO: {vocabulary}

DISEÑO PARA NO LECTORES:
- Columna izquierda: PALABRA en inglés grande (el docente la lee en voz alta — no requiere que el niño lea)
- Columna derecha: IMAGEN del concepto (los niños buscan la imagen que corresponde)
- Los niños trazan una línea del papel de la palabra a su imagen

REGLAS:
- Exactamente entre 4 y 6 pares
- "word": la palabra en inglés tal como aparece en el vocabulario
- "image_description": descripción visual en español de la imagen (qué se ve)
- "emoji": el ÚNICO emoji que mejor representa esa palabra (🐱 para cat). Si ninguno aplica, usa ""
- "image_query": 4-6 palabras en inglés para buscar la ilustración — incluir "cartoon" o "illustration" + "white background"
- "translation": traducción al español corta (1-2 palabras) — el docente la dice en español también
- "teacher_note": instrucción de 1 oración para el docente

Responde SOLO con JSON:
{
  "pairs": [
    {
      "word": "cat",
      "image_description": "gato gris sentado",
      "emoji": "🐱",
      "image_query": "cat cartoon illustration white background",
      "translation": "gato"
    }
  ],
  "teacher_note": "Señala cada palabra y dila en voz alta en inglés y español. Los alumnos trazan una línea a la imagen correcta."
}
`.trim()

export const SONG_WORKSHEET_PROMPT = `
Genera materiales para una canción educativa en inglés para Kinder 3.

TRANSCRIPCIÓN: {transcript}
TÍTULO: {song_title}
VOCABULARIO DETECTADO: {key_vocabulary}

CRÍTICO: Los alumnos NO saben leer ni escribir.
- No fill-in-the-blank con escritura
- Los alumnos SEÑALAN o ENCIERRAN imágenes — nunca escriben
- El docente canta/dice la línea, los alumnos señalan la imagen correcta entre 3 opciones

Genera TRES componentes:

1. LYRIC_WORKSHEET: el coro o estrofa más repetida, máx 6 líneas.
   Por línea: 1 palabra clave con 3 opciones de imagen.
   "image_query": 4-6 palabras en inglés para buscar la imagen (incluir "cartoon" o "illustration" + "white background")

2. TPR_GUIDE: máx 6 gestos físicos simples para palabras clave.
   Cada gesto: UN movimiento corporal simple que un niño de 5 años puede imitar.
   Describir en español. Evitar gestos abstractos o complejos.

3. VOCAB_CARDS: 5-8 palabras importantes de la canción.
   "image_query": para buscar la ilustración de cada palabra.

Responde SOLO con JSON:
{
  "lyric_worksheet": {
    "title": "string",
    "lines": [
      {
        "text": "string",
        "missing_word": "string",
        "options": [
          { "word": "string", "image_description": "string", "image_query": "string", "correct": true },
          { "word": "string", "image_description": "string", "image_query": "string", "correct": false },
          { "word": "string", "image_description": "string", "image_query": "string", "correct": false }
        ]
      }
    ]
  },
  "tpr_guide": [
    { "word": "string", "gesture": "string" }
  ],
  "vocab_cards": [
    { "word": "string", "image_description": "string", "image_query": "string" }
  ]
}
`.trim()
