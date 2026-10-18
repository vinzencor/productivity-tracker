import { Moon, Sun } from 'lucide-react'

type ThemeToggleProps = {
  theme: 'light' | 'dark'
  onToggle: () => void
}

export function ThemeToggle({ theme, onToggle }: ThemeToggleProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="inline-flex items-center gap-2 rounded-full border border-yellow-300 bg-white/80 px-4 py-2 text-sm font-semibold text-stone-800 shadow-sm transition hover:bg-yellow-50 dark:border-yellow-700 dark:bg-stone-900/80 dark:text-yellow-50"
      aria-label="Toggle theme"
    >
      {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
      {theme === 'dark' ? 'Light' : 'Dark'}
    </button>
  )
}
