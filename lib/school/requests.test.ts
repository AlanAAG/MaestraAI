import { describe, expect, it } from 'vitest'
import { CreateRequestSchema, ResolveRequestSchema, canResolve, STATUS_LABELS } from './requests'

describe('CreateRequestSchema', () => {
  it('accepts a valid material request', () => {
    const r = CreateRequestSchema.safeParse({ kind: 'material', title: '  Crayones  ' })
    expect(r.success).toBe(true)
    if (r.success) expect(r.data.title).toBe('Crayones')
  })
  it('coerces amount and rejects negatives', () => {
    const ok = CreateRequestSchema.safeParse({ kind: 'budget', title: 'Feria', amount: '350.50' })
    expect(ok.success).toBe(true)
    if (ok.success) expect(ok.data.amount).toBe(350.5)
    expect(
      CreateRequestSchema.safeParse({ kind: 'budget', title: 'Feria', amount: -1 }).success
    ).toBe(false)
  })
  it('rejects unknown kind and empty title', () => {
    expect(CreateRequestSchema.safeParse({ kind: 'party', title: 'x' }).success).toBe(false)
    expect(CreateRequestSchema.safeParse({ kind: 'other', title: '   ' }).success).toBe(false)
  })
})

describe('ResolveRequestSchema', () => {
  it('only allows approved/rejected', () => {
    expect(ResolveRequestSchema.safeParse({ status: 'approved' }).success).toBe(true)
    expect(ResolveRequestSchema.safeParse({ status: 'pending' }).success).toBe(false)
  })
})

describe('canResolve', () => {
  it('pending only', () => {
    expect(canResolve({ status: 'pending' })).toBe(true)
    expect(canResolve({ status: 'approved' })).toBe(false)
    expect(canResolve({ status: 'rejected' })).toBe(false)
  })
})

describe('STATUS_LABELS', () => {
  it('covers every status', () => {
    expect(STATUS_LABELS.pending).toBeTruthy()
    expect(STATUS_LABELS.approved).toBeTruthy()
    expect(STATUS_LABELS.rejected).toBeTruthy()
  })
})
