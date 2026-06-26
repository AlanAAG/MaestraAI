import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { UnitSelector } from './UnitSelector'
import type { RichmondUnit, RichmondUnitWithGroups } from '@/lib/richmond/types'

const units: RichmondUnit[] = [
  { id: 'u1', book_code: 'TG5A', unit_number: 1, unit_title: 'One' },
  { id: 'u2', book_code: 'TG5A', unit_number: 2, unit_title: 'Two' },
]
const withGroups = (id: string): RichmondUnitWithGroups => ({
  ...units.find((u) => u.id === id)!,
  lesson_groups: [
    {
      id: `${id}-g1`,
      unit_id: id,
      lesson_range: '1-4',
      lesson_start: 1,
      lesson_end: 4,
      learning_goals: [],
      vocabulary: ['cat'],
      language_models: [],
      sort_order: 1,
    },
    {
      id: `${id}-g2`,
      unit_id: id,
      lesson_range: '5-8',
      lesson_start: 5,
      lesson_end: 8,
      learning_goals: [],
      vocabulary: ['dog'],
      language_models: [],
      sort_order: 2,
    },
  ],
})

describe('UnitSelector', () => {
  it('resets lesson_group_ids when the unit changes', async () => {
    const onChange = vi.fn()
    render(
      <UnitSelector
        onChange={onChange}
        loadUnits={async () => units}
        loadUnit={async (id) => withGroups(id)}
      />
    )

    // Select unit 1, wait for its lesson groups, check one.
    fireEvent.change(await screen.findByLabelText('Unidad'), { target: { value: 'u1' } })
    const checkboxes = await screen.findAllByRole('checkbox')
    fireEvent.click(checkboxes[0])
    await waitFor(() =>
      expect(onChange).toHaveBeenLastCalledWith(
        expect.objectContaining({ unit_id: 'u1', lesson_group_ids: ['u1-g1'] })
      )
    )

    // Change the unit → selection must reset to [].
    fireEvent.change(screen.getByLabelText('Unidad'), { target: { value: 'u2' } })
    await waitFor(() =>
      expect(onChange).toHaveBeenLastCalledWith(
        expect.objectContaining({ unit_id: 'u2', lesson_group_ids: [] })
      )
    )
    // And the freshly loaded unit-2 checkboxes are all unchecked.
    const after = await screen.findAllByRole('checkbox')
    expect(after.every((c) => !(c as HTMLInputElement).checked)).toBe(true)
  })
})
