import { createClient } from '@supabase/supabase-js'

// Service-role client — bypasses RLS. Server-side only. Every query MUST scope by an
// explicitly-verified id (token, auth.uid()-checked link, etc.).
// ponytail: existing inline service clients not migrated here; use this for new code.
export function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
}
