import { lazy, Suspense, useEffect } from 'react'
import { doc, getDoc } from 'firebase/firestore'
import { onAuthStateChanged } from 'firebase/auth'
import { Toaster } from 'react-hot-toast'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'

import { AdminLayout } from './components/AdminLayout'
import { SectionLoader } from './components/Loader'
import { ProtectedRoute } from './components/ProtectedRoute'
import { auth, db } from './firebase'
import { EmployeePage } from './pages/EmployeePage'
import { LoginPage } from './pages/hr/Login'
import { useAppStore } from './store/appStore'

// HR pages pull in charts and PDF export; load them only when an admin opens them.
const DashboardPage = lazy(() => import('./pages/hr/Dashboard').then((module) => ({ default: module.DashboardPage })))
const ManagePage = lazy(() => import('./pages/hr/Manage').then((module) => ({ default: module.ManagePage })))
const ReportsPage = lazy(() => import('./pages/hr/Reports').then((module) => ({ default: module.ReportsPage })))

function App() {
  const setAuthState = useAppStore((state) => state.setAuthState)
  const startRealtimeSync = useAppStore((state) => state.startRealtimeSync)
  const stopRealtimeSync = useAppStore((state) => state.stopRealtimeSync)

  useEffect(() => {
    // All collections are publicly readable, so data sync does not depend on who is signed in.
    startRealtimeSync()

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setAuthState({ isAdmin: false, email: null })
        return
      }

      try {
        const adminDoc = await getDoc(doc(db, 'admins', user.uid))
        // Ignore results for a user who signed out while the check was in flight.
        if (auth.currentUser?.uid !== user.uid) return
        setAuthState({ isAdmin: adminDoc.exists(), email: user.email })
      } catch (error) {
        console.error('Failed to check admin authorization:', error)
        if (auth.currentUser?.uid !== user.uid) return
        setAuthState({ isAdmin: false, email: user.email })
      }
    })

    return () => {
      unsubscribe()
      stopRealtimeSync()
    }
  }, [setAuthState, startRealtimeSync, stopRealtimeSync])

  return (
    <BrowserRouter>
      <Toaster
        position="top-center"
        toastOptions={{
          className:
            '!rounded-xl !border !border-stone-200 !bg-white !px-4 !py-3 !text-sm !font-medium !text-stone-900 !shadow-lg dark:!border-stone-700 dark:!bg-stone-800 dark:!text-stone-100',
        }}
      />
      <Routes>
        <Route path="/" element={<EmployeePage />} />
        <Route path="/hr/login" element={<LoginPage />} />
        <Route
          path="/hr"
          element={
            <ProtectedRoute>
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          <Route
            index
            element={
              <Suspense fallback={<SectionLoader label="Loading…" />}>
                <DashboardPage />
              </Suspense>
            }
          />
          <Route
            path="manage"
            element={
              <Suspense fallback={<SectionLoader label="Loading…" />}>
                <ManagePage />
              </Suspense>
            }
          />
          <Route
            path="reports"
            element={
              <Suspense fallback={<SectionLoader label="Loading…" />}>
                <ReportsPage />
              </Suspense>
            }
          />
          <Route path="*" element={<Navigate to="/hr" replace />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
