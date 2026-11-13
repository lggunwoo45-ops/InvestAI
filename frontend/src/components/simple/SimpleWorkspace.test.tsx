import { useEffect, useState } from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { SimpleTasks } from './SimpleWorkspace'

it('loads only an opened tool and retains drafts after task and mode changes', () => {
  const load = vi.fn()
  function Form({ id }: { id: string }) {
    const [value, setValue] = useState('')
    useEffect(() => { load(id) }, [id])
    return <input aria-label={id} value={value} onChange={event => setValue(event.target.value)} />
  }
  const tasks = ['price', 'cost', 'history'].map(id => ({ id, title: id, content: <Form id={id} /> }))
  const view = render(<SimpleTasks label="Tasks" tasks={tasks} />)
  expect(load.mock.calls).toEqual([['price']])
  fireEvent.change(screen.getByLabelText('price'), { target: { value: '123' } })
  fireEvent.click(screen.getByRole('button', { name: 'cost' }))
  fireEvent.change(screen.getByLabelText('cost'), { target: { value: '0.05' } })
  expect(load.mock.calls).toEqual([['price'], ['cost']])
  view.rerender(<SimpleTasks label="Tasks" tasks={tasks} all />)
  fireEvent.change(screen.getByLabelText('history'), { target: { value: '7' } })
  view.rerender(<SimpleTasks label="Tasks" tasks={tasks} />)
  fireEvent.click(screen.getByRole('button', { name: 'history' }))
  expect((screen.getByLabelText('history') as HTMLInputElement).value).toBe('7')
  fireEvent.click(screen.getByRole('button', { name: 'price' }))
  expect((screen.getByLabelText('price') as HTMLInputElement).value).toBe('123')
  expect(load.mock.calls).toEqual([['price'], ['cost'], ['history']])
})
