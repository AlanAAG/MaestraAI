'use client'
import { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import { Loader2, BookOpen, Hash, Pencil, Check, X } from 'lucide-react'
import { Button } from '@/components/ui/button'

type CampoFormativo = {
  campo: string
  contenidos: { contenido: string; procesos: string[] }[]
}

type SubPlan = {
  tipo: 'letter_number' | 'numeros' | string
  metodologia?: string
  nombre?: string
  campos_formativos?: CampoFormativo[]
  estructura_didactica?: Record<string, string>
  evaluacion?: { aspecto: string }[]
}

type PlanDoc = {
  tipo?: string
  nombre_proyecto?: string
  metodologia?: string
  actividades_iniciales?: string
  actividades_rutina?: string
  estrategia_comunitaria?: string
  pausas_activas?: string
  ajustes_razonables?: string
  ejes_articuladores?: string
  proyecto?: string
  desarrollo_taller?: string
  cronograma?: Record<string, string[]>
  campos_formativos?: CampoFormativo[]
  evaluacion_items?: { aspecto: string }[]
  evaluation_columns?: string[]
  sub_planes?: SubPlan[]
}

type GroupSchedule = {
  letter_number_day?: string
  numeros_day?: string
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

// A document section: title as a heading with a bottom rule, content ALWAYS visible.
// Inline edit (when onSave provided) swaps the content for a textarea.
function DocSection({
  title,
  children,
  editValue,
  onSave,
}: {
  title: string
  children: React.ReactNode
  editValue?: string
  onSave?: (v: string) => Promise<void>
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(editValue ?? '')
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    if (!onSave) return
    setSaving(true)
    try {
      await onSave(draft)
      setEditing(false)
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="mt-7 first:mt-0">
      <div className="flex items-center justify-between border-b border-gray-300 pb-1.5 mb-3">
        <h2 className="text-[13px] font-bold uppercase tracking-wide text-gray-800">{title}</h2>
        {onSave && !editing && (
          <button
            type="button"
            onClick={() => {
              setDraft(editValue ?? '')
              setEditing(true)
            }}
            className="flex items-center gap-1 text-xs text-primary hover:underline print:hidden"
          >
            <Pencil size={12} /> Editar
          </button>
        )}
      </div>
      {editing ? (
        <div className="space-y-2">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={10}
            className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary resize-y font-mono"
          />
          <div className="flex gap-2">
            <Button size="sm" onClick={handleSave} disabled={saving} className="h-8">
              {saving ? (
                <Loader2 size={13} className="animate-spin mr-1" />
              ) : (
                <Check size={13} className="mr-1" />
              )}
              Guardar
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setEditing(false)}
              disabled={saving}
              className="h-8"
            >
              <X size={13} className="mr-1" />
              Cancelar
            </Button>
          </div>
        </div>
      ) : (
        children
      )}
    </section>
  )
}

function MdContent({ text }: { text: string }) {
  return (
    <div className="prose prose-sm max-w-none text-gray-800 prose-p:my-1.5 prose-ul:my-1.5 prose-li:my-0.5 prose-strong:text-gray-900 prose-headings:text-gray-900">
      <ReactMarkdown>{text}</ReactMarkdown>
    </div>
  )
}

function CronogramaGrid({ cronograma }: { cronograma: Record<string, string[]> }) {
  const days = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes']
  const labels = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes']
  const maxLen = Math.max(0, ...days.map((d) => (cronograma[d] ?? []).length))

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs border-collapse">
        <thead>
          <tr>
            {labels.map((l) => (
              <th
                key={l}
                className="px-2 py-1.5 bg-gray-100 border border-gray-300 text-center font-semibold text-gray-700"
              >
                {l}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: maxLen }, (_, i) => (
            <tr key={i}>
              {days.map((d) => (
                <td
                  key={d}
                  className="px-2 py-1 border border-gray-300 text-center text-gray-700 align-top"
                >
                  {cronograma[d]?.[i] ?? ''}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function CamposFormativosView({ campos }: { campos: CampoFormativo[] }) {
  return (
    <div className="space-y-4">
      {campos.map((cf, i) => (
        <div key={i}>
          <p className="font-semibold text-sm text-gray-900 mb-1.5">Campo formativo: {cf.campo}</p>
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr>
                <th className="px-3 py-2 bg-gray-100 border border-gray-300 text-left w-2/5 font-semibold text-gray-700">
                  Contenidos
                </th>
                <th className="px-3 py-2 bg-gray-100 border border-gray-300 text-left w-3/5 font-semibold text-gray-700">
                  Procesos de Desarrollo de Aprendizaje
                </th>
              </tr>
            </thead>
            <tbody>
              {cf.contenidos.map((c, j) => (
                <tr key={j}>
                  <td className="px-3 py-2 border border-gray-300 align-top text-gray-800">
                    {c.contenido}
                  </td>
                  <td className="px-3 py-2 border border-gray-300 align-top">
                    <ul className="space-y-1">
                      {c.procesos.map((p, k) => (
                        <li key={k} className="text-gray-700">
                          • {p}
                        </li>
                      ))}
                    </ul>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  )
}

function EvaluacionGrid({ items, columns }: { items: { aspecto: string }[]; columns?: string[] }) {
  const [checked, setChecked] = useState<Record<number, string>>({})
  const opts = columns?.length ? columns : ['Logrado', 'En proceso', 'Requiere apoyo']

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs border-collapse">
        <thead>
          <tr>
            <th className="px-3 py-2 bg-gray-100 border border-gray-300 text-left w-1/2 font-semibold text-gray-700">
              Aspecto
            </th>
            {opts.map((o) => (
              <th
                key={o}
                className="px-2 py-2 bg-gray-100 border border-gray-300 text-center font-semibold text-gray-700"
              >
                {o}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {items.map((item, i) => (
            <tr key={i}>
              <td className="px-3 py-2 border border-gray-300 text-gray-800">• {item.aspecto}</td>
              {opts.map((o) => (
                <td key={o} className="px-2 py-2 border border-gray-300 text-center">
                  <input
                    type="radio"
                    name={`eval-${i}`}
                    checked={checked[i] === o}
                    onChange={() => setChecked((prev) => ({ ...prev, [i]: o }))}
                    className="accent-primary"
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

const MOMENTO_LABELS: Record<string, string> = {
  '1': '1° Momento: En contacto con la realidad',
  '2': '2° Momento: Identificación e integración',
  '3': '3° Momento: Expresión',
}

function SubPlanBlock({
  subPlan,
  fortnightId,
  subType,
  dayLabel,
  onGenerated,
  evalColumns,
}: {
  subPlan?: SubPlan
  fortnightId: string
  subType: 'letter_number' | 'numeros'
  dayLabel: string
  onGenerated: () => void
  evalColumns?: string[]
}) {
  const [loading, setLoading] = useState(false)
  const label =
    subType === 'letter_number' ? `Letter & Number (${dayLabel})` : `Números (${dayLabel})`
  const icon = subType === 'letter_number' ? <BookOpen size={15} /> : <Hash size={15} />

  async function generate() {
    setLoading(true)
    try {
      const res = await fetch('/api/planner/generate-subplan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fortnight_id: fortnightId, sub_type: subType }),
      })
      if (res.ok) onGenerated()
    } finally {
      setLoading(false)
    }
  }

  if (!subPlan) {
    return (
      <div className="mt-7 border border-dashed border-gray-300 rounded-lg p-4 flex items-center justify-between print:hidden">
        <div className="flex items-center gap-2 text-gray-500 text-sm">
          {icon}
          <span>{label} — aún no generado</span>
        </div>
        <Button size="sm" variant="outline" onClick={generate} disabled={loading}>
          {loading ? (
            <>
              <Loader2 size={14} className="animate-spin mr-1" />
              Generando...
            </>
          ) : (
            'Generar'
          )}
        </Button>
      </div>
    )
  }

  return (
    <section className="mt-7">
      <div className="flex items-center justify-between border-b border-gray-300 pb-1.5 mb-3">
        <h2 className="flex items-center gap-2 text-[13px] font-bold uppercase tracking-wide text-gray-800">
          {icon}
          {label}
          {subPlan.nombre ? (
            <span className="normal-case font-normal text-gray-500">— {subPlan.nombre}</span>
          ) : null}
        </h2>
        <button
          type="button"
          onClick={generate}
          disabled={loading}
          className="flex items-center gap-1 text-xs text-primary hover:underline disabled:opacity-50 print:hidden"
        >
          {loading ? <Loader2 size={12} className="animate-spin" /> : null}
          Regenerar
        </button>
      </div>
      <div className="space-y-3">
        {subPlan.metodologia && (
          <p className="text-xs text-gray-500 italic">Metodología: {subPlan.metodologia}</p>
        )}
        {subPlan.campos_formativos?.length ? (
          <CamposFormativosView campos={subPlan.campos_formativos} />
        ) : null}
        {subPlan.estructura_didactica && (
          <div className="space-y-2">
            <p className="font-semibold text-sm text-gray-900">Estructura Didáctica</p>
            {Object.entries(subPlan.estructura_didactica).map(([key, val]) => {
              const n = key.replace('momento_', '')
              return (
                <div key={key}>
                  <p className="font-medium text-xs text-gray-600 mb-1">
                    {MOMENTO_LABELS[n] ?? `${n}° Momento`}
                  </p>
                  <MdContent text={val} />
                </div>
              )
            })}
          </div>
        )}
        {subPlan.evaluacion?.length ? (
          <>
            <p className="font-semibold text-sm text-gray-900">Evaluación de Aprendizajes</p>
            <EvaluacionGrid items={subPlan.evaluacion} columns={evalColumns} />
          </>
        ) : null}
      </div>
    </section>
  )
}

function ObservationCalendarSection({ cal }: { cal: Record<string, string[]> }) {
  const days = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes']
  const labels = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes']
  const maxLen = Math.max(0, ...days.map((d) => (cal[d] ?? []).length))
  if (maxLen === 0) return null
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs border-collapse">
        <thead>
          <tr>
            {labels.map((l) => (
              <th
                key={l}
                className="px-2 py-1.5 bg-gray-100 border border-gray-300 text-center font-semibold text-gray-700"
              >
                {l}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: maxLen }, (_, i) => (
            <tr key={i}>
              {days.map((d) => (
                <td key={d} className="px-2 py-1 border border-gray-300 text-center text-gray-700">
                  {cal[d]?.[i] ?? ''}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

interface PlanDocumentViewerProps {
  planDocument: PlanDoc
  fortnightId: string
  observationCalendar?: Record<string, string[]> | null
  schedule?: GroupSchedule | null
  startDate?: string
  endDate?: string
  groupName?: string
  teacherName?: string
  onReload: () => void
}

export function PlanDocumentViewer({
  planDocument: pd,
  fortnightId,
  observationCalendar,
  schedule,
  startDate,
  endDate,
  groupName,
  teacherName,
  onReload,
}: PlanDocumentViewerProps) {
  const isQuincena = pd.tipo !== 'taller'
  const letterDay = capitalize(schedule?.letter_number_day ?? 'martes')
  const numDay = capitalize(schedule?.numeros_day ?? 'jueves')

  const letterSub = pd.sub_planes?.find((s) => s.tipo === 'letter_number')
  const numSub = pd.sub_planes?.find((s) => s.tipo === 'numeros')

  async function handleEdit(section: string, value: string) {
    const res = await fetch('/api/planner/update-document', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fortnight_id: fortnightId, section, value }),
    })
    if (!res.ok) throw new Error('No se pudo guardar')
    onReload()
  }

  const fmt = (d?: string) =>
    d
      ? new Date(d).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })
      : ''
  const dateLine = startDate && endDate ? `Del ${fmt(startDate)} al ${fmt(endDate)}` : ''
  const metaParts = [
    dateLine,
    groupName ? `Grupo: ${groupName}` : '',
    teacherName ? `Profesora: ${teacherName}` : '',
  ].filter(Boolean)

  return (
    <div className="mx-auto max-w-3xl bg-white text-gray-900 ring-1 ring-gray-200 rounded-lg shadow-sm px-6 sm:px-10 py-8 sm:py-10 print:shadow-none print:ring-0 print:px-0 print:py-0">
      {/* Document header */}
      <header className="text-center border-b-2 border-gray-800 pb-4 mb-2">
        <p className="text-[11px] uppercase tracking-widest text-gray-500">
          {pd.tipo === 'taller' ? 'Planeación de Taller' : 'Planeación Quincenal'}
        </p>
        <h1 className="text-xl font-bold text-gray-900 mt-1">{pd.nombre_proyecto}</h1>
        {pd.metodologia && (
          <p className="text-sm text-gray-600 mt-0.5">Metodología: {pd.metodologia}</p>
        )}
        {metaParts.length > 0 && (
          <p className="text-xs text-gray-500 mt-2">{metaParts.join('  ·  ')}</p>
        )}
      </header>

      {isQuincena && (
        <>
          {pd.actividades_iniciales && (
            <DocSection
              title="Actividades Iniciales"
              editValue={pd.actividades_iniciales}
              onSave={(v) => handleEdit('actividades_iniciales', v)}
            >
              <MdContent text={pd.actividades_iniciales} />
            </DocSection>
          )}
          {pd.actividades_rutina && (
            <DocSection
              title="Actividades de Rutina y Permanentes"
              editValue={pd.actividades_rutina}
              onSave={(v) => handleEdit('actividades_rutina', v)}
            >
              <MdContent text={pd.actividades_rutina} />
            </DocSection>
          )}
          {pd.estrategia_comunitaria && (
            <DocSection
              title="Estrategias Comunitarias para Espacios Libres de Violencia"
              editValue={pd.estrategia_comunitaria}
              onSave={(v) => handleEdit('estrategia_comunitaria', v)}
            >
              <MdContent text={pd.estrategia_comunitaria} />
            </DocSection>
          )}
          {pd.pausas_activas && (
            <DocSection
              title="Pausas Activas"
              editValue={pd.pausas_activas}
              onSave={(v) => handleEdit('pausas_activas', v)}
            >
              <MdContent text={pd.pausas_activas} />
            </DocSection>
          )}
          {pd.ajustes_razonables && (
            <DocSection
              title="Ajustes Razonables"
              editValue={pd.ajustes_razonables}
              onSave={(v) => handleEdit('ajustes_razonables', v)}
            >
              <MdContent text={pd.ajustes_razonables} />
            </DocSection>
          )}
        </>
      )}

      {pd.cronograma && (
        <DocSection title="Cronograma de Actividades Diarias">
          <CronogramaGrid cronograma={pd.cronograma} />
        </DocSection>
      )}

      {observationCalendar && Object.values(observationCalendar).some((v) => v?.length) && (
        <DocSection title="Calendario de Observación de Alumnos">
          <ObservationCalendarSection cal={observationCalendar} />
        </DocSection>
      )}

      {pd.ejes_articuladores && (
        <DocSection
          title="Ejes Articuladores"
          editValue={pd.ejes_articuladores}
          onSave={(v) => handleEdit('ejes_articuladores', v)}
        >
          <MdContent text={pd.ejes_articuladores} />
        </DocSection>
      )}

      {pd.campos_formativos?.length ? (
        <DocSection title="Campos Formativos">
          <CamposFormativosView campos={pd.campos_formativos} />
        </DocSection>
      ) : null}

      {isQuincena && pd.proyecto && (
        <DocSection
          title="Del Proyecto"
          editValue={pd.proyecto}
          onSave={(v) => handleEdit('proyecto', v)}
        >
          <MdContent text={pd.proyecto} />
        </DocSection>
      )}

      {!isQuincena && (
        <>
          {pd.ajustes_razonables && (
            <DocSection
              title="Ajustes Razonables"
              editValue={pd.ajustes_razonables}
              onSave={(v) => handleEdit('ajustes_razonables', v)}
            >
              <MdContent text={pd.ajustes_razonables} />
            </DocSection>
          )}
          {pd.desarrollo_taller && (
            <DocSection
              title="Desarrollo del Taller"
              editValue={pd.desarrollo_taller}
              onSave={(v) => handleEdit('desarrollo_taller', v)}
            >
              <MdContent text={pd.desarrollo_taller} />
            </DocSection>
          )}
          {pd.actividades_iniciales && (
            <DocSection
              title="Actividades Iniciales"
              editValue={pd.actividades_iniciales}
              onSave={(v) => handleEdit('actividades_iniciales', v)}
            >
              <MdContent text={pd.actividades_iniciales} />
            </DocSection>
          )}
          {pd.actividades_rutina && (
            <DocSection
              title="Actividades de Rutina y Permanentes"
              editValue={pd.actividades_rutina}
              onSave={(v) => handleEdit('actividades_rutina', v)}
            >
              <MdContent text={pd.actividades_rutina} />
            </DocSection>
          )}
          {pd.pausas_activas && (
            <DocSection
              title="Pausas Activas"
              editValue={pd.pausas_activas}
              onSave={(v) => handleEdit('pausas_activas', v)}
            >
              <MdContent text={pd.pausas_activas} />
            </DocSection>
          )}
        </>
      )}

      {pd.evaluacion_items?.length ? (
        <DocSection title="Evaluación de Aprendizajes">
          <EvaluacionGrid items={pd.evaluacion_items} columns={pd.evaluation_columns} />
        </DocSection>
      ) : null}

      {/* Sub-plans (quincena only) — rendered as continuation document sections */}
      {isQuincena && (
        <>
          <SubPlanBlock
            subPlan={letterSub}
            fortnightId={fortnightId}
            subType="letter_number"
            dayLabel={letterDay}
            onGenerated={onReload}
            evalColumns={pd.evaluation_columns}
          />
          <SubPlanBlock
            subPlan={numSub}
            fortnightId={fortnightId}
            subType="numeros"
            dayLabel={numDay}
            onGenerated={onReload}
            evalColumns={pd.evaluation_columns}
          />
        </>
      )}

      <p className="text-[11px] text-gray-400 italic pt-8 text-center">
        Programa de Estudio para la Educación Preescolar, Fase 2. SEP, 2024
      </p>
    </div>
  )
}
