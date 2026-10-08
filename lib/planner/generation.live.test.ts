// @vitest-environment node
// Explicit opt-in: exercises real providers with synthetic content, never a teacher's records.
// Run with PLANNER_LIVE_SMOKE=1 npx vitest run lib/planner/generation.live.test.ts
import { describe, expect, it } from 'vitest'
import { generateMainDocument } from './generate-parts'
import { generateSubplan, buildEstructuraProyectoBlock } from './subplan'
import { checkPlanHealth } from './plan-health'
import { QUINCENA_SYSTEM, QUINCENA_OUTPUT_SCHEMA } from '@/prompts/planner-quincena'
import { nemGroundingBlock } from '@/lib/nem/grounding'
import { CONTENIDOS_FASE2_3 } from '@/lib/nem/contenidos-fase2'
import { enforceCamposFormativos } from '@/lib/nem/enforce-contenidos'

describe.skipIf(process.env.PLANNER_LIVE_SMOKE !== '1')('live synthetic plan generation', () => {
  it('creates a complete main plan plus both sub-plans within the request deadline', async () => {
    // Next intentionally skips .env.local under NODE_ENV=test; this explicit live check needs it.
    process.loadEnvFile('.env.local')
    const started = Date.now()
    const signal = AbortSignal.timeout(235_000)
    const schedule = Object.fromEntries(
      ['lunes', 'martes', 'miercoles', 'jueves', 'viernes'].map((day) => [
        day,
        ['Saludo', 'Clima y fecha', 'Proyecto', 'Lectura', 'Despedida'],
      ])
    )
    const fn = {
      project_name: 'Celebraciones de Halloween y Día de Muertos',
      monthly_value: 'Respeto',
      _grade: 'Kinder 3',
      start_date: '2026-10-12',
      end_date: '2026-10-23',
      letter_week1: 'Mm',
      letter_week2: 'Pp',
      number_week1: '1-10',
      number_week2: '11-20',
    }
    const cachePrefix = nemGroundingBlock(false, undefined, 'Kinder 3')
    const main = await generateMainDocument({
      system: QUINCENA_SYSTEM,
      context: `${QUINCENA_OUTPUT_SCHEMA}\n${buildEstructuraProyectoBlock('Centro de Interés')}\nProyecto: ${fn.project_name}. Grado: Kinder 3. Periodo: 12 al 23 de octubre de 2026. Valor: Respeto. Letters martes (Mm, Pp); Números jueves (1-10, 11-20), se generan aparte. Sin alumnos con NEE identificadas. Formato: viñetas con etiquetas en negritas en las actividades, cinco categorías ## en ajustes. Sin fichas asignadas: propón una actividad de convivencia. Horario: ${JSON.stringify(schedule)}. Evaluación cualitativa.`,
      planType: 'quincena',
      schedule,
      customTitles: [],
      cachePrefix,
      signal,
    })
    const subs = await Promise.all(
      (['letter_number', 'numeros'] as const).map((type) =>
        generateSubplan(fn, type, {
          vocabList: '',
          letterDay: 'martes',
          numDay: 'jueves',
          includeProni: false,
          cachePrefix,
          signal,
        })
      )
    )
    const fields = enforceCamposFormativos(
      [
        {
          campo: CONTENIDOS_FASE2_3[0].campo,
          contenidos: [{ contenido: CONTENIDOS_FASE2_3[0].contenido }],
        },
      ],
      { grade: 'Kinder 3' }
    )
    const errors = checkPlanHealth(
      { ...main, campos_formativos: fields, sub_planes: subs },
      { planType: 'quincena' }
    ).filter((issue) => issue.severity === 'error')
    expect(errors).toEqual([])
    expect(subs).toHaveLength(2)
    expect(main.actividades_iniciales).toEqual(expect.any(String))
    console.log(
      '[planner-live-smoke]',
      JSON.stringify({
        success: true,
        seconds: Math.round((Date.now() - started) / 1000),
        mainSections: Object.keys(main).length,
        subplans: subs.map((sub) => sub.tipo),
        errors: errors.length,
      })
    )
  }, 260_000)
})
