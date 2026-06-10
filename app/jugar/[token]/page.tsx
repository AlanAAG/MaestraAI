import { createClient as createServiceClient } from '@supabase/supabase-js'
import { notFound } from 'next/navigation'
import { GameShell } from '@/components/games/GameShell'

interface Props {
  params: { token: string }
}

export default async function JugarPage({ params }: Props) {
  const supabase = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: material } = await supabase
    .from('materials')
    .select('type, content, vocabulary')
    .eq('play_token', params.token)
    .single()

  if (!material) notFound()

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-center">
        <span className="text-sm font-semibold text-indigo-600">MaestraAI</span>
      </header>
      <main className="max-w-lg mx-auto py-6 px-4">
        <GameShell
          type={material.type as string}
          content={material.content as Record<string, unknown>}
          vocabulary={(material.vocabulary as string[]) ?? []}
        />
      </main>
    </div>
  )
}
