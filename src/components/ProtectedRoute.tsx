import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'

import { useAppStore } from '../store/appStore'
import { FullScreenLoader } from './Loader'

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const authStatus = useAppStore((state) => state.authStatus)
  const isAdmin = useAppStore((state) => state.adminLoggedIn)
  const location = useLocation()

  // Firebase restores the saved session asynchronously; redirecting before it resolves logged HR out on refresh.
  if (authStatus === 'loading') {
    return <FullScreenLoader label="Checking your session…" />
  }

  if (!isAdmin) {
    return <Navigate to="/hr/login" replace state={{ from: `${location.pathname}${location.search}` }} />
  }

  return <>{children}</>
}
