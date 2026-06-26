'use client'
import React, { useEffect, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import { Loader2, BookOpen, Hash, Pencil, Check, X, Palette } from 'lucide-react'
import { Button } from '@/components/ui/button'

type Design = {
  font: 'sans' | 'serif' | 'rounded'
  size: number
  accent: string
  lineIntensity: 'light' | 'medium' | 'strong'
}
const DEFAULT_DESIGN: Design = {
  font: 'sans',
  size: 16,
  accent: '#1f2937',
  lineIntensity: 'medium',
}
const FONT_MAP: Record<Design['font'], string> = {
  sans: 'ui-sans-serif, system-ui, sans-serif',
  serif: 'Georgia, "Times New Roman", serif',
  rounded: '"Baloo 2", "Comic Sans MS", ui-rounded, sans-serif',
}
const INTENSITY_MAP: Record<Design['lineIntensity'], string> = {
  light: '#e5e7eb',
  medium: '#d1d5db',
  strong: '#9ca3af',
}
const ACCENT_SWATCHES = [
  '#1f2937',
  '#7c3aed',
  '#dc2626',
  '#0891b2',
  '#16a34a',
  '#ea580c',
  '#db2777',
]

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
  observaciones?: string
}

const SUBPLAN_METHODOLOGIES = [
  'Proyecto',
  'Taller Crítico',
  'Centro de Interés',
  'Aprendizaje Basado en el Juego',
  'Situación Didáctica',
  'Asamblea',
]

type PlanDoc = {
  tipo?: string
  nombre_proyecto?: string
  metodologia?: string
  actividades_iniciales?: string
  actividades_rutina?: string
  aventura_lectora?: string
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
  custom_sections?: Array<{ title: string; content: string }>
  sub_planes?: SubPlan[]
  // Embedded at generation time from teacher's profile — drives dynamic section order + titles.
  _section_order?: string[]
  _section_titles?: Record<string, string>
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
      <div className="flex items-center justify-between border-b border-[color:var(--doc-border,#d1d5db)] pb-1.5 mb-3">
        <h2 className="text-[0.8125em] font-bold uppercase tracking-wide text-gray-800">{title}</h2>
        {onSave && !editing && (
          <button
            type="button"
            onClick={() => {
              setDraft(editValue ?? '')
              setEditing(true)
            }}
            className="flex items-center gap-1 text-[0.75em] text-primary hover:underline print:hidden py-1 px-2 -my-1 -mr-2 rounded hover:bg-primary/5"
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
            className="w-full text-[0.875em] border border-[color:var(--doc-border,#d1d5db)] rounded-lg px-3 py-2 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary resize-y font-mono"
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
      <table className="w-full text-[0.75em] border-collapse">
        <thead>
          <tr>
            {labels.map((l) => (
              <th
                key={l}
                className="px-2 py-1.5 bg-gray-100 border border-[color:var(--doc-border,#d1d5db)] text-center font-semibold text-gray-700"
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
                  className="px-2 py-1 border border-[color:var(--doc-border,#d1d5db)] text-center text-gray-700 align-top"
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
          <p className="font-semibold text-[0.875em] text-gray-900 mb-1.5">
            Campo formativo: {cf.campo}
          </p>
          <table className="w-full text-[0.75em] border-collapse">
            <thead>
              <tr>
                <th className="px-3 py-2 bg-gray-100 border border-[color:var(--doc-border,#d1d5db)] text-left w-2/5 font-semibold text-gray-700">
                  Contenidos
                </th>
                <th className="px-3 py-2 bg-gray-100 border border-[color:var(--doc-border,#d1d5db)] text-left w-3/5 font-semibold text-gray-700">
                  Procesos de Desarrollo de Aprendizaje
                </th>
              </tr>
            </thead>
            <tbody>
              {cf.contenidos.map((c, j) => (
                <tr key={j}>
                  <td className="px-3 py-2 border border-[color:var(--doc-border,#d1d5db)] align-top text-gray-800">
                    {c.contenido}
                  </td>
                  <td className="px-3 py-2 border border-[color:var(--doc-border,#d1d5db)] align-top">
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
      <table className="w-full text-[0.75em] border-collapse">
        <thead>
          <tr>
            <th className="px-3 py-2 bg-gray-100 border border-[color:var(--doc-border,#d1d5db)] text-left w-1/2 font-semibold text-gray-700">
              Aspecto
            </th>
            {opts.map((o) => (
              <th
                key={o}
                className="px-2 py-2 bg-gray-100 border border-[color:var(--doc-border,#d1d5db)] text-center font-semibold text-gray-700"
              >
                {o}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {items.map((item, i) => (
            <tr key={i}>
              <td className="px-3 py-2 border border-[color:var(--doc-border,#d1d5db)] text-gray-800">
                • {item.aspecto}
              </td>
              {opts.map((o) => (
                <td
                  key={o}
                  className="border border-[color:var(--doc-border,#d1d5db)] text-center p-0"
                >
                  {/* whole cell is clickable — the tiny native radio alone was hard to hit */}
                  <label className="flex items-center justify-center cursor-pointer py-2.5 px-2">
                    <input
                      type="radio"
                      name={`eval-${i}`}
                      checked={checked[i] === o}
                      onChange={() => setChecked((prev) => ({ ...prev, [i]: o }))}
                      className="h-4 w-4 accent-primary cursor-pointer"
                    />
                  </label>
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

// Humanize an estructura_didactica key: "momento_2" → its label; "situacion_inicial" → "Situación inicial".
function estructuraLabel(key: string): string {
  const m = key.match(/^momento_(\d+)$/)
  if (m) return MOMENTO_LABELS[m[1]] ?? `${m[1]}° Momento`
  const words = key.replace(/_/g, ' ').trim()
  return words.charAt(0).toUpperCase() + words.slice(1)
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
      <div className="mt-7 border border-dashed border-[color:var(--doc-border,#d1d5db)] rounded-lg p-4 flex items-center justify-between print:hidden">
        <div className="flex items-center gap-2 text-gray-500 text-[0.875em]">
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
      <div className="flex items-center justify-between border-b border-[color:var(--doc-border,#d1d5db)] pb-1.5 mb-3">
        <h2 className="flex items-center gap-2 text-[0.8125em] font-bold uppercase tracking-wide text-gray-800">
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
          className="flex items-center gap-1 text-[0.75em] text-primary hover:underline disabled:opacity-50 print:hidden"
        >
          {loading ? <Loader2 size={12} className="animate-spin" /> : null}
          Regenerar
        </button>
      </div>
      <div className="space-y-3">
        {subPlan.metodologia && (
          <p className="text-[0.75em] text-gray-500 italic">Metodología: {subPlan.metodologia}</p>
        )}
        {subPlan.campos_formativos?.length ? (
          <CamposFormativosView campos={subPlan.campos_formativos} />
        ) : null}
        {subPlan.estructura_didactica && (
          <div className="space-y-2">
            <p className="font-semibold text-[0.875em] text-gray-900">Estructura Didáctica</p>
            {Object.entries(subPlan.estructura_didactica).map(([key, val]) => (
              <div key={key}>
                <p className="font-medium text-[0.75em] text-gray-600 mb-1">
                  {estructuraLabel(key)}
                </p>
                <MdContent text={val} />
              </div>
            ))}
          </div>
        )}
        {subPlan.evaluacion?.length ? (
          <>
            <p className="font-semibold text-[0.875em] text-gray-900">Evaluación de Aprendizajes</p>
            <EvaluacionGrid items={subPlan.evaluacion} columns={evalColumns} />
          </>
        ) : null}
        <div>
          <p className="font-semibold text-[0.875em] text-gray-900">Observaciones y ajustes</p>
          <div className="mt-1 min-h-[2.5rem] border border-dashed border-[color:var(--doc-border,#d1d5db)] rounded px-2 py-1 text-[0.875em] text-gray-700">
            {subPlan.observaciones || ''}
          </div>
        </div>
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
      <table className="w-full text-[0.75em] border-collapse">
        <thead>
          <tr>
            {labels.map((l) => (
              <th
                key={l}
                className="px-2 py-1.5 bg-gray-100 border border-[color:var(--doc-border,#d1d5db)] text-center font-semibold text-gray-700"
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
                  className="px-2 py-1 border border-[color:var(--doc-border,#d1d5db)] text-center text-gray-700"
                >
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

// Teacher-added sub-planeaciones of any NEM methodology (Taller, ABJ, etc.) + the add form.
function CustomSubPlansSection({
  subPlanes,
  fortnightId,
  evalColumns,
  onReload,
}: {
  subPlanes?: SubPlan[]
  fortnightId: string
  evalColumns?: string[]
  onReload: () => void
}) {
  const customs = (subPlanes ?? []).filter((s) => !['letter_number', 'numeros'].includes(s.tipo))
  const [open, setOpen] = useState(false)
  const [methodology, setMethodology] = useState(SUBPLAN_METHODOLOGIES[0])
  const [name, setName] = useState('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)

  async function generate() {
    if (!name.trim()) return
    setLoading(true)
    try {
      const res = await fetch('/api/planner/generate-subplan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fortnight_id: fortnightId,
          custom: { methodology, name: name.trim(), notes: notes.trim() || undefined },
        }),
      })
      if (res.ok) {
        setOpen(false)
        setName('')
        setNotes('')
        onReload()
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      {customs.map((sp, i) => (
        <section key={i} className="mt-7">
          <div className="border-b border-[color:var(--doc-border,#d1d5db)] pb-1.5 mb-3">
            <h2 className="text-[0.8125em] font-bold uppercase tracking-wide text-gray-800">
              {sp.metodologia}
              {sp.nombre ? (
                <span className="normal-case font-normal text-gray-500"> — {sp.nombre}</span>
              ) : null}
            </h2>
          </div>
          <div className="space-y-3">
            {sp.campos_formativos?.length ? (
              <CamposFormativosView campos={sp.campos_formativos} />
            ) : null}
            {sp.estructura_didactica && (
              <div className="space-y-2">
                <p className="font-semibold text-[0.875em] text-gray-900">Estructura Didáctica</p>
                {Object.entries(sp.estructura_didactica).map(([k, v]) => (
                  <div key={k}>
                    <p className="font-medium text-[0.75em] text-gray-600 mb-1">
                      {estructuraLabel(k)}
                    </p>
                    <MdContent text={v} />
                  </div>
                ))}
              </div>
            )}
            {sp.evaluacion?.length ? (
              <>
                <p className="font-semibold text-[0.875em] text-gray-900">
                  Evaluación de Aprendizajes
                </p>
                <EvaluacionGrid items={sp.evaluacion} columns={evalColumns} />
              </>
            ) : null}
          </div>
        </section>
      ))}

      <div className="mt-6 print:hidden">
        <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
          + Agregar sub-planeación
        </Button>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center print:hidden">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => !loading && setOpen(false)}
          />
          <div className="relative bg-white rounded-xl shadow-xl p-6 w-full max-w-sm mx-4 space-y-3">
            <h3 className="font-semibold text-text-primary">Agregar sub-planeación</h3>
            <div>
              <label className="block text-[0.75em] font-medium text-text-secondary mb-1">
                Metodología
              </label>
              <select
                value={methodology}
                onChange={(e) => setMethodology(e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-border bg-surface text-[0.875em] focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {SUBPLAN_METHODOLOGIES.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nombre (ej. Transformemos la basura)"
              className="w-full h-10 px-3 rounded-lg border border-border bg-surface text-[0.875em] focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Detalles o ideas (opcional)"
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-[0.875em] focus:outline-none focus:ring-2 focus:ring-primary resize-y"
            />
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setOpen(false)}
                disabled={loading}
              >
                Cancelar
              </Button>
              <Button className="flex-1" onClick={generate} disabled={loading || !name.trim()}>
                {loading ? <Loader2 size={15} className="mr-2 animate-spin" /> : null}
                {loading ? 'Generando…' : 'Generar'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

function DesignPanel({ design, onChange }: { design: Design; onChange: (d: Design) => void }) {
  const chip = (active: boolean) =>
    `flex-1 px-2 py-1 rounded-md text-xs font-medium transition-colors ${
      active ? 'bg-primary text-white' : 'bg-muted text-text-secondary hover:bg-muted/70'
    }`
  return (
    <div className="absolute right-0 z-50 mt-1 w-64 rounded-lg border border-border bg-surface shadow-lg p-3 space-y-3">
      <div>
        <label className="text-xs font-medium text-text-secondary">Tipografía</label>
        <div className="flex gap-1 mt-1">
          {(['sans', 'serif', 'rounded'] as const).map((f) => (
            <button
              key={f}
              onClick={() => onChange({ ...design, font: f })}
              className={chip(design.font === f)}
            >
              {f === 'sans' ? 'Sans' : f === 'serif' ? 'Serif' : 'Redonda'}
            </button>
          ))}
        </div>
      </div>
      <div>
        <label className="text-xs font-medium text-text-secondary">
          Tamaño de letra ({design.size}px)
        </label>
        <input
          type="range"
          min={13}
          max={20}
          value={design.size}
          onChange={(e) => onChange({ ...design, size: Number(e.target.value) })}
          className="w-full accent-primary"
        />
      </div>
      <div>
        <label className="text-xs font-medium text-text-secondary">Color de acento</label>
        <div className="flex gap-1.5 mt-1 flex-wrap">
          {ACCENT_SWATCHES.map((c) => (
            <button
              key={c}
              onClick={() => onChange({ ...design, accent: c })}
              style={{ background: c }}
              aria-label={`Acento ${c}`}
              className={`h-6 w-6 rounded-full ${design.accent === c ? 'ring-2 ring-offset-1 ring-primary' : ''}`}
            />
          ))}
        </div>
      </div>
      <div>
        <label className="text-xs font-medium text-text-secondary">Intensidad de líneas</label>
        <div className="flex gap-1 mt-1">
          {(['light', 'medium', 'strong'] as const).map((l) => (
            <button
              key={l}
              onClick={() => onChange({ ...design, lineIntensity: l })}
              className={chip(design.lineIntensity === l)}
            >
              {l === 'light' ? 'Tenue' : l === 'medium' ? 'Media' : 'Fuerte'}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

// Default titles used when the teacher hasn't supplied their own.
const DEFAULT_TITLES: Record<string, string> = {
  actividades_iniciales: 'Actividades Iniciales',
  actividades_rutina: 'Actividades de Rutina y Permanentes',
  aventura_lectora: 'Aventura Lectora',
  estrategia_comunitaria: 'Estrategias Comunitarias para Espacios Libres de Violencia',
  pausas_activas: 'Pausas Activas',
  ajustes_razonables: 'Ajustes Razonables',
  ejes_articuladores: 'Ejes Articuladores',
  campos_formativos: 'Campos Formativos',
  proyecto: 'Del Proyecto',
  cronograma: 'Cronograma de Actividades Diarias',
  evaluacion_items: 'Evaluación de Aprendizajes',
}

// ponytail: intentionally re-declared to avoid client-bundle shipping section-map (server util)
const DEFAULT_QUINCENA_ORDER = [
  'actividades_iniciales',
  'actividades_rutina',
  'aventura_lectora',
  'estrategia_comunitaria',
  'pausas_activas',
  'ajustes_razonables',
  'cronograma',
  'ejes_articuladores',
  'campos_formativos',
  'proyecto',
  'evaluacion_items',
]

function QuincenaSections({
  pd,
  observationCalendar,
  handleEdit,
}: {
  pd: PlanDoc
  observationCalendar?: Record<string, string[]> | null
  handleEdit: (section: string, value: string) => Promise<void>
}) {
  const titles = pd._section_titles ?? {}
  const t = (key: string) => titles[key] ?? DEFAULT_TITLES[key] ?? key

  // Build full order: teacher's order (if stored), or the canonical default.
  // Always copy — never mutate pd._section_order (it's a shared prop reference).
  const order: string[] = [...(pd._section_order ?? DEFAULT_QUINCENA_ORDER)]

  // Ensure every standard key with content appears at least once (safety net for old plans).
  const covered = new Set(order)
  for (const key of DEFAULT_QUINCENA_ORDER) {
    if (!covered.has(key)) order.push(key)
  }

  const renderKey = (key: string): React.ReactNode => {
    if (key.startsWith('custom:')) {
      const idx = parseInt(key.slice(7), 10)
      if (isNaN(idx)) return null
      const cs = pd.custom_sections?.[idx]
      if (!cs?.title || !cs?.content) return null
      return (
        <DocSection
          key={key}
          title={cs.title}
          editValue={cs.content}
          onSave={async (v) => {
            const updated = [...(pd.custom_sections ?? [])]
            updated[idx] = { ...updated[idx], content: v }
            // update-document expects a JSON-encoded string for structured fields
            await handleEdit('custom_sections', JSON.stringify(updated))
          }}
        >
          <MdContent text={cs.content} />
        </DocSection>
      )
    }

    switch (key) {
      case 'actividades_iniciales':
        return pd.actividades_iniciales ? (
          <DocSection
            key={key}
            title={t(key)}
            editValue={pd.actividades_iniciales}
            onSave={(v) => handleEdit(key, v)}
          >
            <MdContent text={pd.actividades_iniciales} />
          </DocSection>
        ) : null
      case 'actividades_rutina':
        return pd.actividades_rutina ? (
          <DocSection
            key={key}
            title={t(key)}
            editValue={pd.actividades_rutina}
            onSave={(v) => handleEdit(key, v)}
          >
            <MdContent text={pd.actividades_rutina} />
          </DocSection>
        ) : null
      case 'aventura_lectora':
        return pd.aventura_lectora ? (
          <DocSection
            key={key}
            title={t(key)}
            editValue={pd.aventura_lectora}
            onSave={(v) => handleEdit(key, v)}
          >
            <MdContent text={pd.aventura_lectora} />
          </DocSection>
        ) : null
      case 'estrategia_comunitaria':
        return pd.estrategia_comunitaria ? (
          <DocSection
            key={key}
            title={t(key)}
            editValue={pd.estrategia_comunitaria}
            onSave={(v) => handleEdit(key, v)}
          >
            <MdContent text={pd.estrategia_comunitaria} />
          </DocSection>
        ) : null
      case 'pausas_activas':
        return pd.pausas_activas ? (
          <DocSection
            key={key}
            title={t(key)}
            editValue={pd.pausas_activas}
            onSave={(v) => handleEdit(key, v)}
          >
            <MdContent text={pd.pausas_activas} />
          </DocSection>
        ) : null
      case 'ajustes_razonables':
        return pd.ajustes_razonables ? (
          <DocSection
            key={key}
            title={t(key)}
            editValue={pd.ajustes_razonables}
            onSave={(v) => handleEdit(key, v)}
          >
            <MdContent text={pd.ajustes_razonables} />
          </DocSection>
        ) : null
      case 'ejes_articuladores':
        return pd.ejes_articuladores ? (
          <DocSection
            key={key}
            title={t(key)}
            editValue={pd.ejes_articuladores}
            onSave={(v) => handleEdit(key, v)}
          >
            <MdContent text={pd.ejes_articuladores} />
          </DocSection>
        ) : null
      case 'campos_formativos':
        return pd.campos_formativos?.length ? (
          <DocSection key={key} title={t(key)}>
            <CamposFormativosView campos={pd.campos_formativos} />
          </DocSection>
        ) : null
      case 'proyecto':
        return pd.proyecto ? (
          <DocSection
            key={key}
            title={t(key)}
            editValue={pd.proyecto}
            onSave={(v) => handleEdit(key, v)}
          >
            <MdContent text={pd.proyecto} />
          </DocSection>
        ) : null
      case 'cronograma':
        return (
          <React.Fragment key={key}>
            {pd.cronograma && (
              <DocSection title={t(key)}>
                <CronogramaGrid cronograma={pd.cronograma} />
              </DocSection>
            )}
            {observationCalendar && Object.values(observationCalendar).some((v) => v?.length) && (
              <DocSection title="Calendario de Observación de Alumnos">
                <ObservationCalendarSection cal={observationCalendar} />
              </DocSection>
            )}
          </React.Fragment>
        )
      case 'evaluacion_items':
        return pd.evaluacion_items?.length ? (
          <DocSection key={key} title={t(key)}>
            <EvaluacionGrid items={pd.evaluacion_items} columns={pd.evaluation_columns} />
          </DocSection>
        ) : null
      default:
        return null
    }
  }

  return <>{order.map((key) => renderKey(key))}</>
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
  orientation?: 'vertical' | 'horizontal'
  logoUrl?: string | null
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
  orientation = 'vertical',
  logoUrl,
  onReload,
}: PlanDocumentViewerProps) {
  const isQuincena = pd.tipo !== 'taller'
  const letterDay = capitalize(schedule?.letter_number_day ?? 'martes')
  const numDay = capitalize(schedule?.numeros_day ?? 'jueves')

  // Per-teacher document design (font, size, accent, line intensity).
  const [design, setDesign] = useState<Design>(DEFAULT_DESIGN)
  const [showDesign, setShowDesign] = useState(false)
  useEffect(() => {
    fetch('/api/teachers/me')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.design_settings) setDesign({ ...DEFAULT_DESIGN, ...d.design_settings })
      })
      .catch(() => {})
  }, [])
  function saveDesign(next: Design) {
    setDesign(next)
    fetch('/api/teachers/me', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ design_settings: next }),
    }).catch(() => {})
  }

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
    <div>
      {/* Design toolbar (screen only) */}
      <div
        className={`mx-auto mb-2 flex justify-end print:hidden ${orientation === 'horizontal' ? 'max-w-5xl' : 'max-w-3xl'}`}
      >
        <div className="relative">
          <Button variant="outline" size="sm" onClick={() => setShowDesign((v) => !v)}>
            <Palette size={14} className="mr-2" />
            Diseño
          </Button>
          {showDesign && <DesignPanel design={design} onChange={saveDesign} />}
        </div>
      </div>

      <div
        className={`mx-auto bg-white text-gray-900 ring-1 ring-gray-200 rounded-lg shadow-sm px-6 sm:px-10 py-8 sm:py-10 print:shadow-none print:ring-0 print:px-0 print:py-0 ${
          orientation === 'horizontal' ? 'max-w-5xl' : 'max-w-3xl'
        }`}
        style={{
          fontSize: `${design.size}px`,
          fontFamily: FONT_MAP[design.font],
          ['--doc-accent' as string]: design.accent,
          ['--doc-border' as string]: INTENSITY_MAP[design.lineIntensity],
        }}
      >
        {/* Document header */}
        <header className="text-center border-b-2 border-[color:var(--doc-accent,#1f2937)] pb-4 mb-2">
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={logoUrl}
              alt="Logo de la escuela"
              className="h-16 mx-auto mb-2 object-contain"
            />
          ) : null}
          <p className="text-[0.6875em] uppercase tracking-widest text-gray-500">
            {pd.tipo === 'taller' ? 'Planeación de Taller' : 'Planeación Quincenal'}
          </p>
          <h1 className="text-[1.25em] font-bold text-gray-900 mt-1">{pd.nombre_proyecto}</h1>
          {pd.metodologia && (
            <p className="text-[0.875em] text-gray-600 mt-0.5">Metodología: {pd.metodologia}</p>
          )}
          {metaParts.length > 0 && (
            <p className="text-[0.75em] text-gray-500 mt-2">{metaParts.join('  ·  ')}</p>
          )}
        </header>

        {/* ── Dynamic section rendering ─────────────────────────────────────────────
             Quincena: sections render in the teacher's order (_section_order),
             with the teacher's exact titles (_section_titles). Falls back to the
             canonical order when no profile was used (older plans / system template).
             Taller: fixed order (simpler format, fewer sections).
        ─────────────────────────────────────────────────────────────────────────── */}
        {isQuincena ? (
          <QuincenaSections
            pd={pd}
            observationCalendar={observationCalendar}
            handleEdit={handleEdit}
          />
        ) : (
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
            {pd.aventura_lectora && (
              <DocSection
                title="Aventura Lectora"
                editValue={pd.aventura_lectora}
                onSave={(v) => handleEdit('aventura_lectora', v)}
              >
                <MdContent text={pd.aventura_lectora} />
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
            {pd.cronograma && (
              <DocSection title="Cronograma de Actividades Diarias">
                <CronogramaGrid cronograma={pd.cronograma} />
              </DocSection>
            )}
            {pd.evaluacion_items?.length ? (
              <DocSection title="Evaluación de Aprendizajes">
                <EvaluacionGrid items={pd.evaluacion_items} columns={pd.evaluation_columns} />
              </DocSection>
            ) : null}
          </>
        )}

        {/* Custom sections for taller (quincena custom sections handled inside QuincenaSections) */}
        {!isQuincena &&
          pd.custom_sections
            ?.filter((s) => s.title && s.content)
            .map((s, i) => (
              <DocSection
                key={`custom-${i}`}
                title={s.title}
                editValue={s.content}
                onSave={async (v) => {
                  const updated = [...(pd.custom_sections ?? [])]
                  updated[i] = { ...updated[i], content: v }
                  await handleEdit('custom_sections', JSON.stringify(updated))
                }}
              >
                <MdContent text={s.content} />
              </DocSection>
            ))}

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

        {/* Teacher-added sub-planeaciones of any methodology (Taller, ABJ, Día del Niño…) */}
        <CustomSubPlansSection
          subPlanes={pd.sub_planes}
          fortnightId={fortnightId}
          evalColumns={pd.evaluation_columns}
          onReload={onReload}
        />

        <p className="text-[0.6875em] text-gray-400 italic pt-8 text-center">
          Programa de Estudio para la Educación Preescolar, Fase 2. SEP, 2024
        </p>
      </div>
    </div>
  )
}
