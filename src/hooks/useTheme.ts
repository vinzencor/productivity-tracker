import { create } from 'zustand'

export type ThemeMode = 'light' | 'dark'

const THEME_KEY = 'productivity-quest-theme'

// index.html applies the saved theme class before React mounts, so the DOM is the source of truth here.
function readInitialTheme(): ThemeMode {
  return document.documentElement.classList.contains('dark') ? 'dark' : 'light'
}

function applyTheme(theme: ThemeMode) {
  document.documentElement.classList.toggle('dark', theme === 'dark')
  try {
    localStorage.setItem(THEME_KEY, theme)
  } catch {
    // Storage can be unavailable (private mode); the theme still applies for this session.
  }
}

type ThemeState = {
  theme: ThemeMode
  toggleTheme: () => void
}

export const useTheme = create<ThemeState>()((set, get) => ({
  theme: readInitialTheme(),
  toggleTheme: () => {
    const next = get().theme === 'dark' ? 'light' : 'dark'
    applyTheme(next)
    set({ theme: next })
  },
}))
