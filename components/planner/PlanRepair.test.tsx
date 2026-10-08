import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { FormatIssuesBanner } from './PlanDocumentViewer'
import { PlanFeedbackProvider } from './PlanFeedback'

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('plan completeness warning recovery', () => {
  it('shows a readable label and repairs the missing section directly from the warning', async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({ feedback: [], ok: true }),
    }))
    vi.stubGlobal('fetch', fetchMock)
    const reload = vi.fn()
    render(
      <PlanFeedbackProvider fortnightId="plan-id" onReload={reload}>
        <FormatIssuesBanner
          issues={[
            {
              section: 'actividades_iniciales',
              issue: 'faltante o demasiado corta (<80 chars)',
              severity: 'error',
            },
          ]}
        />
      </PlanFeedbackProvider>
    )
    expect(screen.getByText('Actividades Iniciales')).toBeInTheDocument()
    expect(screen.queryByText(/80 chars/)).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Completar esta sección' }))
    await waitFor(() => expect(reload).toHaveBeenCalledOnce())
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/planner/regenerate-section',
      expect.objectContaining({
        body: expect.stringContaining('"mode":"complete"'),
      })
    )
  })

  it('shows a retryable error without claiming completion when repair fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => ({
        ok: !url.includes('regenerate-section'),
        json: async () => ({ feedback: [], error: 'No se pudo completar. Intenta de nuevo.' }),
      }))
    )
    const reload = vi.fn()
    render(
      <PlanFeedbackProvider fortnightId="plan-id" onReload={reload}>
        <FormatIssuesBanner
          issues={[{ section: 'actividades_rutina', issue: 'faltante', severity: 'error' }]}
        />
      </PlanFeedbackProvider>
    )
    fireEvent.click(screen.getByRole('button', { name: 'Completar esta sección' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Intenta de nuevo')
    expect(reload).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'Completar esta sección' })).toBeEnabled()
  })
})
