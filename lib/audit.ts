/**
 * Audit Logging for Sensitive Actions
 *
 * Logs all sensitive operations for security monitoring and compliance:
 * - API key operations
 * - Data exports
 * - Resource deletions
 * - Admin actions
 * - File uploads
 */

import { createClient } from '@/lib/supabase/server'

export interface AuditLogParams {
  teacher_id: string
  action: string
  resource_type?: string
  resource_id?: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  metadata?: Record<string, any>
  req: Request
}

/**
 * Log an audit event
 *
 * Usage in API routes:
 * ```typescript
 * await logAudit({
 *   teacher_id: teacher.id,
 *   action: 'fortnight.create',
 *   resource_type: 'fortnight',
 *   resource_id: fortnight.id,
 *   metadata: { grade: 'Kinder 3', project: 'Animals' },
 *   req,
 * })
 * ```
 */
export async function logAudit(params: AuditLogParams): Promise<void> {
  try {
    const supabase = createClient()

    // Extract request metadata
    const ip = params.req.headers.get('x-forwarded-for') || params.req.headers.get('x-real-ip')
    const userAgent = params.req.headers.get('user-agent')

    // Insert audit log
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from('audit_logs').insert({
      teacher_id: params.teacher_id,
      action: params.action,
      resource_type: params.resource_type,
      resource_id: params.resource_id,
      metadata: params.metadata,
      ip_address: ip,
      user_agent: userAgent,
    })
  } catch (error) {
    // Don't throw - audit logging should never break the main flow
    console.error('Audit log failed:', error)
  }
}

/**
 * Log a failed authentication attempt
 *
 * Usage in login/register routes:
 * ```typescript
 * await logFailedAuth({
 *   email: 'user@example.com',
 *   reason: 'invalid_credentials',
 *   req,
 * })
 * ```
 */
export async function logFailedAuth(params: {
  email: string
  reason: string
  req: Request
}): Promise<void> {
  try {
    const supabase = createClient()

    const ip = params.req.headers.get('x-forwarded-for') || params.req.headers.get('x-real-ip')
    const userAgent = params.req.headers.get('user-agent')

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from('failed_auth_attempts').insert({
      email: params.email,
      ip_address: ip,
      user_agent: userAgent,
      reason: params.reason,
    })
  } catch (error) {
    console.error('Failed auth log failed:', error)
  }
}

/**
 * Standard audit actions
 *
 * Use these constants for consistency across the codebase
 */
export const AUDIT_ACTIONS = {
  // API Keys
  API_KEY_CREATE: 'api_key.create',
  API_KEY_REVOKE: 'api_key.revoke',
  API_KEY_USED: 'api_key.used',

  // Fortnights & Lesson Plans
  FORTNIGHT_CREATE: 'fortnight.create',
  FORTNIGHT_DELETE: 'fortnight.delete',
  LESSON_PLAN_EDIT: 'lesson_plan.edit',

  // Materials
  MATERIAL_GENERATE: 'material.generate',
  MATERIAL_EXPORT: 'material.export',

  // Diary
  DIARY_CREATE: 'diary.create',
  DIARY_SHARE: 'diary.share',
  DIARY_DELETE: 'diary.delete',

  // Resources
  RESOURCE_UPLOAD: 'resource.upload',
  RESOURCE_DOWNLOAD: 'resource.download',
  RESOURCE_DELETE: 'resource.delete',

  // Richmond Sync
  RICHMOND_SYNC: 'richmond.sync',
  RICHMOND_CSV_IMPORT: 'richmond.csv_import',

  // Groups & Students
  GROUP_CREATE: 'group.create',
  GROUP_DELETE: 'group.delete',
  STUDENT_DATA_EXPORT: 'student.data_export',

  // Account lifecycle
  ACCOUNT_DELETE: 'account.delete',

  // Admin Actions
  ANNOUNCEMENT_CREATE: 'announcement.create',
  ANNOUNCEMENT_DELETE: 'announcement.delete',
  TEACHER_ROLE_CHANGE: 'teacher.role_change',

  // Richmond credentials
  RICHMOND_CREDENTIALS_REVOKE: 'richmond.credentials_revoke',
} as const

/**
 * Failed auth reasons
 */
export const AUTH_FAILURE_REASONS = {
  INVALID_CREDENTIALS: 'invalid_credentials',
  EMAIL_NOT_CONFIRMED: 'email_not_confirmed',
  ACCOUNT_LOCKED: 'account_locked',
  RATE_LIMITED: 'rate_limited',
  INVALID_TOKEN: 'invalid_token',
} as const
