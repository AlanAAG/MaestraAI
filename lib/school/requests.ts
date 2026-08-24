// Shared bits for school_requests (migration 083).
import { z } from 'zod'

export const CreateRequestSchema = z.object({
  kind: z.enum(['material', 'budget', 'other']),
  title: z.string().trim().min(1).max(200),
  body: z.string().trim().max(5000).optional(),
  amount: z.coerce.number().min(0).max(999999.99).optional(),
})

export const ResolveRequestSchema = z.object({
  status: z.enum(['approved', 'rejected']),
  admin_response: z.string().trim().max(2000).optional(),
})

export const KIND_LABELS: Record<string, string> = {
  material: 'Material',
  budget: 'Presupuesto',
  other: 'Otro',
}

export const STATUS_LABELS: Record<string, string> = {
  pending: 'Pendiente',
  approved: 'Aprobada',
  rejected: 'Rechazada',
}

/** Only pending requests can be resolved. Pure — unit-tested. */
export function canResolve(r: { status: string }): boolean {
  return r.status === 'pending'
}
