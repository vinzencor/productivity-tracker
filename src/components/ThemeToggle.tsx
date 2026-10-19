import { Moon, Sun } from 'lucide-react'

import { useTheme } from '../hooks/useTheme'

export function ThemeToggle({ className = 'btn btn-secondary btn-icon' }: { className?: string }) {
  const { theme, toggleTheme } = useTheme()
  const label = theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'

  return (
    <button type="button" onClick={toggleTheme} className={className} aria-label={label} title={label}>
      {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
    </button>
  )
}
