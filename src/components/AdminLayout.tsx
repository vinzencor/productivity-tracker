import { signOut } from 'firebase/auth'
import { ChartColumn, ExternalLink, LayoutDashboard, ListChecks, LogOut, Wallet } from 'lucide-react'
import { useEffect } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'

import { auth } from '../firebase'
import { useAppStore } from '../store/appStore'
import { BrandMark } from './BrandMark'
import { NotificationListener } from './notifications/NotificationListener'
import { ThemeToggle } from './ThemeToggle'
import { TulipButton } from './tulip/TulipButton'

const navItems = [
  { to: '/hr', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/hr/manage', label: 'Manage', icon: ListChecks, end: false },
  { to: '/hr/reports', label: 'Reports', icon: ChartColumn, end: false },
]

const EXPENSE_TRACKER_URL = 'https://sample-accounts.vercel.app/'

function handleLogout() {
  void signOut(auth)
}

export function AdminLayout() {
  const adminEmail = useAppStore((state) => state.adminEmail)
  const { pathname } = useLocation()

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])

  return (
    <div className="min-h-screen min-h-[100dvh] bg-stone-50 text-stone-900 dark:bg-stone-950 dark:text-stone-100">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-stone-200 bg-white lg:flex dark:border-stone-800 dark:bg-stone-900">
        <div className="flex h-16 items-center gap-3 border-b border-stone-100 px-5 dark:border-stone-800">
          <BrandMark />
          <div className="min-w-0 leading-tight">
            <p className="truncate text-sm font-bold text-stone-900 dark:text-white">Productivity Quest</p>
            <p className="text-xs font-medium text-stone-500 dark:text-stone-400">HR Portal</p>
          </div>
        </div>

        <div className="px-3 pt-3">
          <a href={EXPENSE_TRACKER_URL} target="_blank" rel="noopener noreferrer" className="btn btn-primary w-full">
            <Wallet size={16} />
            Expense Tracker
            <ExternalLink size={14} />
          </a>
        </div>

        <nav className="flex-1 space-y-1 p-3" aria-label="HR navigation">
          {navItems.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex h-10 items-center gap-3 rounded-xl px-3 text-sm font-semibold transition-colors ${
                  isActive
                    ? 'bg-yellow-100 text-stone-900 dark:bg-yellow-400/10 dark:text-yellow-300'
                    : 'text-stone-600 hover:bg-stone-100 hover:text-stone-900 dark:text-stone-400 dark:hover:bg-stone-800 dark:hover:text-white'
                }`
              }
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-stone-100 p-3 dark:border-stone-800">
          <div className="flex items-center gap-2 rounded-xl px-2 py-1.5">
            <div className="min-w-0 flex-1">
              <p className="text-xs text-stone-500 dark:text-stone-400">Signed in as</p>
              <p className="truncate text-sm font-semibold text-stone-900 dark:text-white" title={adminEmail ?? undefined}>
                {adminEmail ?? 'HR admin'}
              </p>
            </div>
            <ThemeToggle className="btn btn-ghost btn-icon" />
          </div>
          <button type="button" onClick={handleLogout} className="btn btn-secondary mt-2 w-full">
            <LogOut size={16} />
            Log out
          </button>
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-30 border-b border-stone-200 bg-white/90 backdrop-blur lg:hidden dark:border-stone-800 dark:bg-stone-900/90">
        <div className="flex h-14 items-center justify-between gap-3 px-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-2.5">
            <BrandMark />
            <div className="min-w-0 leading-tight">
              <p className="truncate text-sm font-bold text-stone-900 dark:text-white">Productivity Quest</p>
              <p className="text-xs font-medium text-stone-500 dark:text-stone-400">HR Portal</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <a
              href={EXPENSE_TRACKER_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-primary btn-sm"
              aria-label="Expense Tracker (opens in new tab)"
              title="Expense Tracker"
            >
              <Wallet size={16} />
              <span className="hidden sm:inline">Expense Tracker</span>
            </a>
            <ThemeToggle className="btn btn-ghost btn-icon" />
            <button type="button" onClick={handleLogout} className="btn btn-ghost btn-icon" aria-label="Log out" title="Log out">
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </header>

      <main className="lg:pl-64">
        {/* Bottom padding leaves room for the mobile nav and the floating tulip button. */}
        <div className="mx-auto w-full max-w-7xl px-4 pb-40 pt-6 sm:px-6 lg:px-8 lg:pb-24 lg:pt-8">
          <Outlet />
        </div>
      </main>

      <TulipButton />
      <NotificationListener />

      {/* Mobile bottom navigation */}
      <nav
        className="pb-safe fixed inset-x-0 bottom-0 z-30 border-t border-stone-200 bg-white/95 backdrop-blur lg:hidden dark:border-stone-800 dark:bg-stone-900/95"
        aria-label="HR navigation"
      >
        <div className="mx-auto grid h-16 max-w-md grid-cols-3">
          {navItems.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center gap-1 text-[11px] font-semibold transition-colors ${
                  isActive ? 'text-stone-900 dark:text-yellow-300' : 'text-stone-500 dark:text-stone-400'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <span
                    className={`grid h-7 w-12 place-items-center rounded-full transition-colors ${
                      isActive ? 'bg-yellow-100 dark:bg-yellow-400/10' : ''
                    }`}
                  >
                    <Icon size={18} />
                  </span>
                  {label}
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}
