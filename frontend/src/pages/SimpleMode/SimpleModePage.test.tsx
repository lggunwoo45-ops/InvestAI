import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { expect, it } from 'vitest'
import { SimpleModePage } from './SimpleModePage'
it('keeps the legacy bookmark on the unified home instead of a separate obsolete experience', () => {
  render(<MemoryRouter initialEntries={['/simple']}><Routes><Route path="/simple" element={<SimpleModePage />} /><Route path="/dashboard" element={<h1>Unified home</h1>} /></Routes></MemoryRouter>)
  expect(screen.getByRole('heading', { name: 'Unified home' })).toBeTruthy()
})
