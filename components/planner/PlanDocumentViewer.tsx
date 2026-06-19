'use client'
import { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import { ChevronDown, ChevronRight, Loader2, BookOpen, Hash, Pencil, Check, X } from 'lucide-react'
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
  sub_planes?: SubPlan[]
}

type GroupSchedule = {
  letter_number_day?: string
  numeros_day?: string
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

function Section({
  title,
  children,
  defaultOpen = false,
  editValue,
  onSave,
}: {
  title: string
  children: React.ReactNode
  defaultOpen?: boolean
  editValue?: string
  onSave?: (v: string) => Promise<void>
}) {
  const [open, setOpen] = useState(defaultOpen)
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
    <div className="border border-border rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={() => !editing && setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 bg-surface hover:bg-muted transition-colors text-left"
      >
        <span className="font-medium text-sm text-text-primary">{title}</span>
        <div className="flex items-center gap-2">
          {onSave && !editing && (
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => {
                e.stopPropagation()
                setDraft(editValue ?? '')
                setOpen(true)
                setEditing(true)
              }}
              onKeyDown={(e) =>
                e.key === 'Enter' &&
                (e.stopPropagation(), setDraft(editValue ?? ''), setOpen(true), setEditing(true))
              }
              className="p-1 rounded hover:bg-muted text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
              aria-label="Editar sección"
            >
              <Pencil size={13} />
            </span>
          )}
          {open ? (
            <ChevronDown size={16} className="text-text-secondary" />
          ) : (
            <ChevronRight size={16} className="text-text-secondary" />
          )}
        </div>
      </button>
      {open && (
        <div className="px-4 py-3 border-t border-border">
          {editing ? (
            <div className="space-y-2">
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                rows={8}
                className="w-full text-sm border border-border rounded-lg px-3 py-2 bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-primary resize-y font-mono"
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
        </div>
      )}
    </div>
  )
}

function MdContent({ text }: { text: string }) {
  return (
    <div className="prose prose-sm max-w-none text-text-primary">
      <ReactMarkdown>{text}</ReactMarkdown>
    </div>
  )
}

function CronogramaGrid({ cronograma }: { cronograma: Record<string, string[]> }) {
  const days = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes']
  const labels = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes']
  const maxLen = Math.max(...days.map((d) => (cronograma[d] ?? []).length))

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs border-collapse">
        <thead>
          <tr>
            {labels.map((l) => (
              <th
                key={l}
                className="px-2 py-1 bg-muted border border-border text-center font-medium"
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
                  className="px-2 py-1 border border-border text-center text-text-secondary"
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
          <p className="font-semibold text-sm text-text-primary mb-2">{cf.campo}</p>
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr>
                <th className="px-3 py-2 bg-muted border border-border text-left w-2/5">
                  Contenidos
                </th>
                <th className="px-3 py-2 bg-muted border border-border text-left w-3/5">
                  Procesos de Desarrollo de Aprendizaje
                </th>
              </tr>
            </thead>
            <tbody>
              {cf.contenidos.map((c, j) => (
                <tr key={j}>
                  <td className="px-3 py-2 border border-border align-top text-text-primary">
                    {c.contenido}
                  </td>
                  <td className="px-3 py-2 border border-border align-top">
                    <ul className="space-y-1">
                      {c.procesos.map((p, k) => (
                        <li key={k} className="text-text-secondary">
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

function EvaluacionGrid({ items }: { items: { aspecto: string }[] }) {
  const [checked, setChecked] = useState<Record<number, string>>({})
  const opts = ['Logrado', 'En proceso', 'Requiere apoyo']

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs border-collapse">
        <thead>
          <tr>
            <th className="px-3 py-2 bg-muted border border-border text-left w-1/2">Aspecto</th>
            {opts.map((o) => (
              <th key={o} className="px-2 py-2 bg-muted border border-border text-center">
                {o}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {items.map((item, i) => (
            <tr key={i}>
              <td className="px-3 py-2 border border-border text-text-primary">• {item.aspecto}</td>
              {opts.map((o) => (
                <td key={o} className="px-2 py-2 border border-border text-center">
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

function SubPlanCard({
  subPlan,
  fortnightId,
  subType,
  dayLabel,
  onGenerated,
}: {
  subPlan?: SubPlan
  fortnightId: string
  subType: 'letter_number' | 'numeros'
  dayLabel: string
  onGenerated: () => void
}) {
  const [loading, setLoading] = useState(false)
  const label =
    subType === 'letter_number' ? `Letter & Number (${dayLabel})` : `Números (${dayLabel})`
  const icon = subType === 'letter_number' ? <BookOpen size={16} /> : <Hash size={16} />

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
      <div className="border border-dashed border-border rounded-lg p-4 flex items-center justify-between">
        <div className="flex items-center gap-2 text-text-secondary text-sm">
          {icon}
          <span>{label}</span>
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
    <Section title={`${label} — ${subPlan.nombre ?? ''}`}>
      <div className="space-y-3">
        <p className="text-xs text-text-secondary italic">{subPlan.metodologia}</p>
        {subPlan.campos_formativos?.length ? (
          <CamposFormativosView campos={subPlan.campos_formativos} />
        ) : null}
        {subPlan.estructura_didactica &&
          Object.entries(subPlan.estructura_didactica).map(([key, val]) => {
            const n = key.replace('momento_', '')
            const label3 =
              n === '1'
                ? '1° Momento: En contacto con la realidad'
                : n === '2'
                  ? '2° Momento: Identificación e integración'
                  : '3° Momento: Expresión'
            return (
              <div key={key}>
                <p className="font-medium text-xs text-text-secondary mb-1">{label3}</p>
                <MdContent text={val} />
              </div>
            )
          })}
        {subPlan.evaluacion?.length ? (
          <>
            <p className="font-medium text-sm">Evaluación</p>
            <EvaluacionGrid items={subPlan.evaluacion} />
          </>
        ) : null}
        <Button size="sm" variant="ghost" onClick={generate} disabled={loading} className="text-xs">
          {loading ? <Loader2 size={12} className="animate-spin mr-1" /> : null}
          Regenerar
        </Button>
      </div>
    </Section>
  )
}

function ObservationCalendarSection({ cal }: { cal: Record<string, string[]> }) {
  const days = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes']
  const labels = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes']
  const maxLen = Math.max(...days.map((d) => (cal[d] ?? []).length))
  if (maxLen === 0) return null
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs border-collapse">
        <thead>
          <tr>
            {labels.map((l) => (
              <th
                key={l}
                className="px-2 py-1 bg-muted border border-border text-center font-medium"
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
                  className="px-2 py-1 border border-border text-center text-text-secondary"
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

interface PlanDocumentViewerProps {
  planDocument: PlanDoc
  fortnightId: string
  observationCalendar?: Record<string, string[]> | null
  schedule?: GroupSchedule | null
  onReload: () => void
}

export function PlanDocumentViewer({
  planDocument: pd,
  fortnightId,
  observationCalendar,
  schedule,
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

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="rounded-lg bg-primary/5 border border-primary/20 px-4 py-3">
        <p className="text-xs text-text-secondary uppercase tracking-wide">
          {pd.tipo === 'taller' ? 'Taller' : 'Quincena'} · {pd.metodologia}
        </p>
        <p className="font-semibold text-text-primary">{pd.nombre_proyecto}</p>
      </div>

      {isQuincena && (
        <>
          {pd.actividades_iniciales && (
            <Section
              title="Actividades Iniciales"
              defaultOpen
              editValue={pd.actividades_iniciales}
              onSave={(v) => handleEdit('actividades_iniciales', v)}
            >
              <MdContent text={pd.actividades_iniciales} />
            </Section>
          )}
          {pd.actividades_rutina && (
            <Section
              title="Actividades de Rutina y Permanentes"
              editValue={pd.actividades_rutina}
              onSave={(v) => handleEdit('actividades_rutina', v)}
            >
              <MdContent text={pd.actividades_rutina} />
            </Section>
          )}
          {pd.estrategia_comunitaria && (
            <Section
              title="Estrategia Comunitaria"
              editValue={pd.estrategia_comunitaria}
              onSave={(v) => handleEdit('estrategia_comunitaria', v)}
            >
              <MdContent text={pd.estrategia_comunitaria} />
            </Section>
          )}
          {pd.pausas_activas && (
            <Section
              title="Pausas Activas"
              editValue={pd.pausas_activas}
              onSave={(v) => handleEdit('pausas_activas', v)}
            >
              <MdContent text={pd.pausas_activas} />
            </Section>
          )}
          {pd.ajustes_razonables && (
            <Section
              title="Ajustes Razonables"
              editValue={pd.ajustes_razonables}
              onSave={(v) => handleEdit('ajustes_razonables', v)}
            >
              <MdContent text={pd.ajustes_razonables} />
            </Section>
          )}
        </>
      )}

      {!isQuincena && pd.ajustes_razonables && (
        <Section
          title="Ajustes Razonables"
          editValue={pd.ajustes_razonables}
          onSave={(v) => handleEdit('ajustes_razonables', v)}
        >
          <MdContent text={pd.ajustes_razonables} />
        </Section>
      )}

      {pd.cronograma && (
        <Section title="Cronograma de Actividades Diarias">
          <CronogramaGrid cronograma={pd.cronograma} />
        </Section>
      )}

      {observationCalendar && Object.values(observationCalendar).some((v) => v?.length) && (
        <Section title="Calendario de Observación de Alumnos">
          <ObservationCalendarSection cal={observationCalendar} />
        </Section>
      )}

      {pd.ejes_articuladores && (
        <Section
          title="Ejes Articuladores"
          editValue={pd.ejes_articuladores}
          onSave={(v) => handleEdit('ejes_articuladores', v)}
        >
          <MdContent text={pd.ejes_articuladores} />
        </Section>
      )}

      {pd.campos_formativos?.length ? (
        <Section title="Campos Formativos" defaultOpen={false}>
          <CamposFormativosView campos={pd.campos_formativos} />
        </Section>
      ) : null}

      {isQuincena && pd.proyecto && (
        <Section
          title="Del Proyecto"
          defaultOpen
          editValue={pd.proyecto}
          onSave={(v) => handleEdit('proyecto', v)}
        >
          <MdContent text={pd.proyecto} />
        </Section>
      )}
      {!isQuincena && pd.desarrollo_taller && (
        <Section
          title="Desarrollo del Taller"
          defaultOpen
          editValue={pd.desarrollo_taller}
          onSave={(v) => handleEdit('desarrollo_taller', v)}
        >
          <MdContent text={pd.desarrollo_taller} />
        </Section>
      )}

      {!isQuincena && (
        <>
          {pd.actividades_iniciales && (
            <Section
              title="Actividades Iniciales"
              editValue={pd.actividades_iniciales}
              onSave={(v) => handleEdit('actividades_iniciales', v)}
            >
              <MdContent text={pd.actividades_iniciales} />
            </Section>
          )}
          {pd.actividades_rutina && (
            <Section
              title="Actividades de Rutina y Permanentes"
              editValue={pd.actividades_rutina}
              onSave={(v) => handleEdit('actividades_rutina', v)}
            >
              <MdContent text={pd.actividades_rutina} />
            </Section>
          )}
          {pd.pausas_activas && (
            <Section
              title="Pausas Activas"
              editValue={pd.pausas_activas}
              onSave={(v) => handleEdit('pausas_activas', v)}
            >
              <MdContent text={pd.pausas_activas} />
            </Section>
          )}
        </>
      )}

      {pd.evaluacion_items?.length ? (
        <Section title="Evaluación de Aprendizajes">
          <EvaluacionGrid items={pd.evaluacion_items} />
        </Section>
      ) : null}

      {/* Sub-plans (quincena only) */}
      {isQuincena && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-text-secondary uppercase tracking-wide pt-2">
            Sub-planeaciones
          </p>
          <SubPlanCard
            subPlan={letterSub}
            fortnightId={fortnightId}
            subType="letter_number"
            dayLabel={letterDay}
            onGenerated={onReload}
          />
          <SubPlanCard
            subPlan={numSub}
            fortnightId={fortnightId}
            subType="numeros"
            dayLabel={numDay}
            onGenerated={onReload}
          />
        </div>
      )}

      <p className="text-xs text-text-disabled italic pt-2 text-center">
        Programa de Estudio para la Educación Preescolar, Fase 2. SEP, 2024
      </p>
    </div>
  )
}
