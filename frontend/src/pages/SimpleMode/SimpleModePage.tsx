import { Navigate } from 'react-router-dom'

/** Keep old bookmarks on the same mode-aware home. */
export function SimpleModePage() { return <Navigate to="/dashboard" replace /> }
