import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { FailurePage } from './FailurePage'

describe('FailurePage', () => {
  it('lists the failure, issue, and recovery action', () => {
    render(
      <MemoryRouter initialEntries={['/failure/device']}>
        <Routes>
          <Route path="/failure/:code" element={<FailurePage />} />
        </Routes>
      </MemoryRouter>,
    )
    expect(screen.getByRole('heading', { name: 'Player device is unavailable' })).toHaveFocus()
    expect(screen.getByText(/could not activate this browser/u)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Try player again' })).toBeInTheDocument()
  })

  it('does not display raw error query text', () => {
    render(
      <MemoryRouter initialEntries={['/failure/auth?error=private-token-value']}>
        <Routes>
          <Route path="/failure/:code" element={<FailurePage />} />
        </Routes>
      </MemoryRouter>,
    )
    expect(screen.queryByText('private-token-value')).not.toBeInTheDocument()
  })
})
