import { useState } from 'react'
import { doc, getDoc } from 'firebase/firestore'
import { signInWithEmailAndPassword, signOut } from 'firebase/auth'
import { useNavigate } from 'react-router-dom'

import { auth, db } from '../../firebase'
import { useAppStore } from '../../store/appStore'

export function LoginPage() {
  const navigate = useNavigate()
  const { setAdminLoggedIn } = useAppStore()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    setError('')

    try {
      const result = await signInWithEmailAndPassword(auth, email, password)
      const adminDoc = await getDoc(doc(db, 'admins', result.user.uid))

      if (!adminDoc.exists()) {
        await signOut(auth)
        setAdminLoggedIn(false)
        throw new Error('This account is not authorized for the HR portal.')
      }

      setAdminLoggedIn(true)
      navigate('/hr')
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Unable to sign in.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#FFFDF5] p-4 dark:bg-[#121214]">
      <div className="w-full max-w-md rounded-3xl border border-yellow-200 bg-white p-6 shadow-sm dark:border-yellow-800 dark:bg-stone-900">
        <div className="mb-6 text-center">
          <p className="text-xs uppercase tracking-[0.2em] text-yellow-700 dark:text-yellow-300">HR Portal</p>
          <h1 className="mt-2 text-3xl font-black text-stone-900 dark:text-white">Login</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-stone-700 dark:text-stone-200">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-xl border border-yellow-200 bg-yellow-50 px-4 py-3 outline-none focus:border-yellow-400 dark:border-yellow-700 dark:bg-stone-800 dark:text-white"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-stone-700 dark:text-stone-200">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-xl border border-yellow-200 bg-yellow-50 px-4 py-3 outline-none focus:border-yellow-400 dark:border-yellow-700 dark:bg-stone-800 dark:text-white"
            />
          </div>

          {error ? (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-200">
              {error}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-yellow-400 px-4 py-3 text-base font-bold text-stone-900 transition hover:bg-yellow-300 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  )
}
