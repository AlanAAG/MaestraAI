import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { VocabularySections } from './VocabularySections'
import type { SelectedRichmondContent } from '@/lib/richmond/types'

const richmond: SelectedRichmondContent = {
  book_code: 'TG5A',
  unit_number: 3,
  unit_title: 'My Busy Week',
  lesson_ranges: ['1-4'],
  vocabulary: ['Monday', 'Tuesday'],
  language_models: [],
  learning_goals: [],
}

describe('VocabularySections', () => {
  it('renders BOTH sections when richmond content is present', () => {
    render(<VocabularySections richmondContent={richmond} letters={['S']} teacherWords={['sun']} />)
    expect(screen.getByTestId('richmond-vocab-section')).toBeInTheDocument()
    expect(screen.getByTestId('teacher-vocab-section')).toBeInTheDocument()
    expect(screen.getByText('Monday')).toBeInTheDocument()
  })

  it('shows the teacher words derived from the quincena letters', () => {
    render(<VocabularySections richmondContent={null} letters={['S']} teacherWords={['sun']} />)
    expect(screen.queryByTestId('richmond-vocab-section')).not.toBeInTheDocument()
    expect(screen.getByTestId('teacher-vocab-section')).toBeInTheDocument()
    expect(screen.getByText('sun')).toBeInTheDocument()
  })

  it('renders nothing when there is no richmond content and no letters chosen', () => {
    const { container } = render(
      <VocabularySections richmondContent={null} letters={[]} teacherWords={[]} />
    )
    expect(container).toBeEmptyDOMElement()
  })
})
