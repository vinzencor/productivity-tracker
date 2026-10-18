import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'

type ProtectedRouteProps = {
  isAdmin: boolean
  children: ReactNode
}

export function ProtectedRoute({ isAdmin, children }: ProtectedRouteProps) {
  if (!isAdmin) {
    return <Navigate to="/hr/login" replace />
  }

  return <>{children}</>
}
