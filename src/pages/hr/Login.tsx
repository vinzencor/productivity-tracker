import { useState } from 'react'
import { doc, getDoc } from 'firebase/firestore'
import { signInWithEmailAndPassword, signOut } from 'firebase/auth'
import { ArrowLeft, CircleAlert, Eye, EyeOff } from 'lucide-react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'

import { BrandMark } from '../../components/BrandMark'
import { FullScreenLoader, Spinner } from '../../components/Loader'
import { ThemeToggle } from '../../components/ThemeToggle'
import { auth, db } from '../../firebase'
import { authErrorMessage } from '../../lib/errors'
import { useAppStore } from '../../store/appStore'

export function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const authStatus = useAppStore((state) => state.authStatus)
  const isAdmin = useAppStore((state) => state.adminLoggedIn)
  const setAuthState = useAppStore((state) => state.setAuthState)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const from = (location.state as { from?: string } | null)?.from
  const redirectTo = from && from.startsWith('/hr') && from !== '/hr/login' ? from : '/hr'

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    setError('')

    try {
      const result = await signInWithEmailAndPassword(auth, email.trim(), password)
      const adminDoc = await getDoc(doc(db, 'admins', result.user.uid))

      if (!adminDoc.exists()) {
        await signOut(auth)
        setAuthState({ isAdmin: false, email: null })
        throw new Error('This account is not authorized for the HR portal.')
      }

      setAuthState({ isAdmin: true, email: result.user.email })
      navigate(redirectTo, { replace: true })
    } catch (submitError) {
      setError(authErrorMessage(submitError))
    } finally {
      setLoading(false)
    }
  }

  if (authStatus === 'loading') {
    return <FullScreenLoader label="Checking your session…" />
  }

  // Already signed in (e.g. after a refresh): skip the form.
  if (isAdmin && !loading) {
    return <Navigate to={redirectTo} replace />
  }

  return (
    <div className="relative flex min-h-screen min-h-[100dvh] flex-col items-center justify-center bg-stone-50 px-4 py-12 dark:bg-stone-950">
      <div className="absolute right-4 top-4 sm:right-6 sm:top-6">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <BrandMark size="lg" />
          <h1 className="mt-5 text-2xl font-bold tracking-tight text-stone-900 dark:text-white">Sign in to HR Portal</h1>
          <p className="mt-1.5 text-sm text-stone-500 dark:text-stone-400">Manage teams, tasks and productivity reports.</p>
        </div>

        <form onSubmit={handleSubmit} className="card space-y-5 p-6 sm:p-7" noValidate>
          <div>
            <label htmlFor="email" className="label">
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              inputMode="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@company.com"
              className="field h-11"
            />
          </div>

          <div>
            <label htmlFor="password" className="label">
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="••••••••"
                className="field h-11 pr-11"
              />
              <button
                type="button"
                onClick={() => setShowPassword((current) => !current)}
                className="btn btn-ghost btn-icon absolute right-1 top-1"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {error ? (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300"
            >
              <CircleAlert size={16} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          ) : null}

          <button type="submit" disabled={loading || !email || !password} className="btn btn-primary h-11 w-full">
            {loading ? <Spinner size={16} /> : null}
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-stone-500 transition-colors hover:text-stone-900 dark:text-stone-400 dark:hover:text-white"
          >
            <ArrowLeft size={14} />
            Back to employee workspace
          </Link>
        </div>
      </div>
    </div>
  )
}
