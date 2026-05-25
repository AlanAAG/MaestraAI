'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { z } from 'zod'

const FortnightSchema = z.object({
  number: z.number().min(1).max(12),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  project_name: z.string().min(1).max(200),
  monthly_value: z.string().min(1).max(100),
  letter_week1: z.string().length(1),
  letter_week2: z.string().length(1),
})

export default function NuevaPlaneacionPage() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    number: '',
    start_date: '',
    end_date: '',
    project_name: '',
    monthly_value: '',
    letter_week1: '',
    letter_week2: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const validated = FortnightSchema.parse({
        ...formData,
        number: parseInt(formData.number),
      })

      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: teacher } = await (supabase as any)
        .from('teachers')
        .select('id')
        .eq('auth_id', user.id)
        .single()

      if (!teacher) {
        setError('No se encontró tu perfil de maestra')
        setLoading(false)
        return
      }

      // Create fortnight
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: fortnight, error: fortnightError } = await (supabase as any)
        .from('fortnights')
        .insert({
          teacher_id: teacher.id,
          group_id: '91000000-0000-0000-0000-000000000001', // TODO: get from teacher's groups
          ...validated,
          status: 'draft',
        })
        .select()
        .single()

      if (fortnightError) throw fortnightError

      router.push(`/planeaciones/${fortnight.id}`)
    } catch (err) {
      if (err instanceof z.ZodError) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setError((err as any).errors[0].message)
      } else {
        setError('Error al crear la planeación')
      }
      setLoading(false)
    }
  }

  return (
    <div className="p-8 max-w-2xl">
      <h1 className="text-2xl font-semibold text-text-primary mb-6">Nueva Planeación</h1>

      <Card className="p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">
                Quincena #
              </label>
              <Input
                type="number"
                min="1"
                max="12"
                value={formData.number}
                onChange={(e) => setFormData({ ...formData, number: e.target.value })}
                required
                className="min-h-[44px]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">
                Valor del mes
              </label>
              <Input
                value={formData.monthly_value}
                onChange={(e) => setFormData({ ...formData, monthly_value: e.target.value })}
                placeholder="Ej: Respeto"
                required
                className="min-h-[44px]"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">
                Fecha inicio
              </label>
              <Input
                type="date"
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                required
                className="min-h-[44px]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">
                Fecha fin
              </label>
              <Input
                type="date"
                value={formData.end_date}
                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                required
                className="min-h-[44px]"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">
              Proyecto mensual
            </label>
            <Input
              value={formData.project_name}
              onChange={(e) => setFormData({ ...formData, project_name: e.target.value })}
              placeholder="Ej: Los animales de la granja"
              required
              className="min-h-[44px]"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">
                Letra semana 1
              </label>
              <Input
                maxLength={1}
                value={formData.letter_week1}
                onChange={(e) =>
                  setFormData({ ...formData, letter_week1: e.target.value.toUpperCase() })
                }
                placeholder="A"
                required
                className="min-h-[44px]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">
                Letra semana 2
              </label>
              <Input
                maxLength={1}
                value={formData.letter_week2}
                onChange={(e) =>
                  setFormData({ ...formData, letter_week2: e.target.value.toUpperCase() })
                }
                placeholder="B"
                required
                className="min-h-[44px]"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              type="submit"
              disabled={loading}
              className="flex-1 min-h-[44px] bg-primary hover:bg-primary-dark"
            >
              {loading ? 'Generando...' : 'Generar Planeación'}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
              className="min-h-[44px]"
            >
              Cancelar
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}
