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
    render(
      <VocabularySections
        richmondContent={richmond}
        allVocab={[{ id: '1', word: 'sun', letter: 'S' }]}
        selectedVocab={[]}
        onToggle={() => {}}
      />
    )
    expect(screen.getByTestId('richmond-vocab-section')).toBeInTheDocument()
    expect(screen.getByTestId('teacher-vocab-section')).toBeInTheDocument()
    expect(screen.getByText('Monday')).toBeInTheDocument()
  })

  it('renders ONLY the teacher section when there is no richmond content', () => {
    render(
      <VocabularySections
        richmondContent={null}
        allVocab={[{ id: '1', word: 'sun', letter: 'S' }]}
        selectedVocab={[]}
        onToggle={() => {}}
      />
    )
    expect(screen.queryByTestId('richmond-vocab-section')).not.toBeInTheDocument()
    expect(screen.getByTestId('teacher-vocab-section')).toBeInTheDocument()
  })
})
