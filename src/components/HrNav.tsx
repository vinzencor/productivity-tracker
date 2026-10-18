import { LogOut, LayoutDashboard, ListChecks, TrendingUp } from 'lucide-react'
import { NavLink } from 'react-router-dom'

import { auth } from '../firebase'

const navItems = [
  { to: '/hr', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/hr/manage', label: 'Manage', icon: ListChecks },
  { to: '/hr/reports', label: 'Reports', icon: TrendingUp },
]

export function HrNav() {
  return (
    <header className="sticky top-0 z-20 border-b border-yellow-200 bg-[#FFFDF5]/90 backdrop-blur dark:border-yellow-800 dark:bg-[#121214]/90">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <div className="shrink-0 rounded-xl bg-yellow-400 px-2.5 py-1.5 text-sm font-black text-stone-900">HR</div>
          <nav className="flex min-w-0 flex-wrap items-center gap-2">
            {navItems.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm font-semibold transition ${
                    isActive
                      ? 'bg-yellow-400 text-stone-900'
                      : 'bg-stone-100 text-stone-700 hover:bg-stone-200 dark:bg-stone-800 dark:text-stone-200 dark:hover:bg-stone-700'
                  }`
                }
              >
                <Icon size={15} />
                {label}
              </NavLink>
            ))}
          </nav>
        </div>

        <button
          type="button"
          onClick={() => void auth.signOut()}
          className="inline-flex shrink-0 items-center gap-2 rounded-full border border-yellow-300 bg-white px-3 py-2 text-sm font-semibold text-stone-700 transition hover:bg-yellow-50 dark:border-yellow-700 dark:bg-stone-900 dark:text-stone-200"
        >
          <LogOut size={15} />
          Logout
        </button>
      </div>
    </header>
  )
}
