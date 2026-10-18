import { useEffect } from 'react'
import { doc, getDoc } from 'firebase/firestore'
import { onAuthStateChanged } from 'firebase/auth'
import { Toaster } from 'react-hot-toast'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'

import { ProtectedRoute } from './components/ProtectedRoute'
import { auth, db } from './firebase'
import { EmployeePage } from './pages/EmployeePage'
import { DashboardPage } from './pages/hr/Dashboard'
import { LoginPage } from './pages/hr/Login'
import { ManagePage } from './pages/hr/Manage'
import { ReportsPage } from './pages/hr/Reports'
import { useAppStore } from './store/appStore'

function App() {
  const {
    selectedEmployeeId,
    setSelectedEmployeeId,
    adminLoggedIn,
    setAdminLoggedIn,
    startRealtimeSync,
    stopRealtimeSync,
  } = useAppStore()

  useEffect(() => {
    let isMounted = true

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!isMounted) {
        return
      }

      if (!user) {
        setAdminLoggedIn(false)
        startRealtimeSync()
        return
      }

      try {
        const adminDoc = await getDoc(doc(db, 'admins', user.uid))
        const isAdmin = adminDoc.exists()

        if (!isMounted) {
          return
        }

        setAdminLoggedIn(isAdmin)
        startRealtimeSync()
      } catch (error) {
        console.error('Failed to check admin authorization:', error)
        setAdminLoggedIn(false)
        startRealtimeSync()
      }
    })

    return () => {
      isMounted = false
      unsubscribe()
      stopRealtimeSync()
    }
  }, [setAdminLoggedIn, startRealtimeSync, stopRealtimeSync])

  return (
    <BrowserRouter>
      <Toaster position="top-right" />
      <Routes>
        <Route
          path="/"
          element={<EmployeePage selectedEmployeeId={selectedEmployeeId} onSelectEmployee={setSelectedEmployeeId} />}
        />
        <Route path="/hr/login" element={<LoginPage />} />
        <Route
          path="/hr"
          element={
            <ProtectedRoute isAdmin={adminLoggedIn}>
              <DashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/hr/manage"
          element={
            <ProtectedRoute isAdmin={adminLoggedIn}>
              <ManagePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/hr/reports"
          element={
            <ProtectedRoute isAdmin={adminLoggedIn}>
              <ReportsPage />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
