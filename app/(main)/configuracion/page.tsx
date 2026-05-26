'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'

export default function ConfiguracionPage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [teacher, setTeacher] = useState<any>(null)
  const [fullName, setFullName] = useState('')
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    loadTeacher()
  }, [])

  async function loadTeacher() {
    try {
      const supabase = createClient()
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser()

      if (authError) {
        console.error('Auth error:', authError)
        return
      }

      if (!user) {
        console.error('No user found')
        return
      }

      const { data, error } = await supabase
        .from('teachers')
        .select('*')
        .eq('auth_id', user.id)
        .single()

      if (error) {
        console.error('Teacher query error:', error)
        return
      }

      if (data) {
        setTeacher(data)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setFullName((data as any).full_name || '')
      }
    } catch (err) {
      console.error('Unexpected error loading teacher:', err)
    }
  }

  async function handleSave() {
    setLoading(true)
    setSaved(false)

    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return

    if (teacher) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any).from('teachers').update({ full_name: fullName }).eq('id', teacher.id)
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any).from('teachers').insert({
        auth_id: user.id,
        email: user.email!,
        full_name: fullName,
        role: 'titular',
      })
    }

    setLoading(false)
    setSaved(true)
    await loadTeacher()

    setTimeout(() => setSaved(false), 3000)
  }

  return (
    <div className="p-8 max-w-2xl">
      <h1 className="text-2xl font-semibold text-text-primary mb-6">Configuración</h1>

      <Card className="p-6">
        <h2 className="text-lg font-semibold text-text-primary mb-4">Perfil</h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">
              Nombre completo
            </label>
            <Input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Tu nombre completo"
              className="min-h-[44px]"
            />
          </div>

          <Button
            onClick={handleSave}
            disabled={loading || !fullName}
            className="min-h-[44px] bg-primary hover:bg-primary-dark"
          >
            {loading ? 'Guardando...' : 'Guardar cambios'}
          </Button>

          {saved && <p className="text-sm text-success">✓ Cambios guardados correctamente</p>}
        </div>
      </Card>

      <Card className="p-6 mt-6">
        <h2 className="text-lg font-semibold text-text-primary mb-2">Richmond Sync</h2>
        <p className="text-sm text-text-secondary mb-4">
          Configura la sincronización automática con Richmond LP instalando la extensión de Chrome.
        </p>
        <Button
          variant="outline"
          onClick={() => window.open('/extension/README.md', '_blank')}
          className="min-h-[44px]"
        >
          Ver instrucciones
        </Button>
      </Card>
    </div>
  )
}
