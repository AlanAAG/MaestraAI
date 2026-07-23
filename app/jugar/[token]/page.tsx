import { notFound } from 'next/navigation'
import { GameShell } from '@/components/games/GameShell'
import { createServiceClient } from '@/lib/supabase/service'
import { appFontStyle } from '@/lib/design/fonts'

interface Props {
  params: { token: string }
}

export default async function JugarPage({ params }: Props) {
  const supabase = createServiceClient()

  // One round-trip: the material + its owner's design (teachers embedded via the FK) —
  // shared games follow the teacher's app font (best-effort).
  const { data: material } = await supabase
    .from('materials')
    .select('type, content, vocabulary, teachers(design_settings)')
    .eq('play_token', params.token)
    .single()

  if (!material) notFound()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const design = (material as any).teachers?.design_settings
  const fontStyle = appFontStyle(design?.app_font)

  return (
    <div className="min-h-screen bg-gray-50" style={fontStyle}>
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-center">
        <span className="text-sm font-semibold text-indigo-600">MaestraIA</span>
      </header>
      <main className="max-w-3xl mx-auto py-6 px-4 sm:px-6">
        <GameShell
          type={material.type as string}
          content={material.content as Record<string, unknown>}
          vocabulary={(material.vocabulary as string[]) ?? []}
        />
      </main>
    </div>
  )
}
