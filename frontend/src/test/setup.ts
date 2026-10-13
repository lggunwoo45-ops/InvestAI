import { afterEach } from 'vitest'
import { cleanup, configure } from '@testing-library/react'

// CI runners can be slower than local Windows runs when rendering the full app shell.
// Keep Testing Library's retry window long enough for async route and catalog UI to settle.
configure({ asyncUtilTimeout: 20000 })

afterEach(() => cleanup())
