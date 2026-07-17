import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import LandingContent from '@/components/landing/LandingContent'
import Analytics from '@/components/landing/Analytics'

export default async function RootPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>
}) {
  // Supabase redirects OAuth errors to the site URL (root) with ?error= params
  const params = await searchParams
  if (params.error || params.error_code) {
    const desc = params.error_description ?? params.error_code ?? params.error ?? 'oauth_failed'
    redirect(`/login?error=${encodeURIComponent(desc)}`)
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (user) redirect('/dashboard')

  return (
    <>
      <Analytics />
      <LandingContent />
    </>
  )
}
