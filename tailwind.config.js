/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      keyframes: {
        'tulip-sway': {
          '0%, 100%': { transform: 'rotate(-8deg)' },
          '50%': { transform: 'rotate(8deg)' },
        },
        'soft-pulse': {
          '0%, 100%': { transform: 'scale(1)', opacity: '0.55' },
          '50%': { transform: 'scale(1.35)', opacity: '0' },
        },
        'float-drift': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        'bubble-rise': {
          from: { transform: 'translateY(0)' },
          to: { transform: 'translateY(-480px)' },
        },
        'bubble-sway': {
          '0%, 100%': { transform: 'translateX(-8px)' },
          '50%': { transform: 'translateX(8px)' },
        },
        'note-pop': {
          '0%': { transform: 'translate(-50%, 0) scale(0.6)', opacity: '0' },
          '15%': { transform: 'translate(-50%, -8px) scale(1)', opacity: '1' },
          '100%': { transform: 'translate(-50%, -60px) scale(1)', opacity: '0' },
        },
        'fade-up': {
          from: { transform: 'translateY(8px)', opacity: '0' },
          to: { transform: 'translateY(0)', opacity: '1' },
        },
        'pop-in': {
          '0%': { transform: 'scale(0.4)', opacity: '0' },
          '70%': { transform: 'scale(1.1)', opacity: '1' },
          '100%': { transform: 'scale(1)' },
        },
        // Each tile sets --drop to how many rows it falls in from above the board.
        'tile-drop': {
          from: { transform: 'translateY(calc(var(--drop, 0) * -100%))' },
          to: { transform: 'translateY(0)' },
        },
        'hint-wiggle': {
          '0%, 100%': { transform: 'rotate(0) scale(1)' },
          '25%': { transform: 'rotate(-10deg) scale(1.12)' },
          '75%': { transform: 'rotate(10deg) scale(1.12)' },
        },
        praise: {
          '0%': { transform: 'scale(0.6)', opacity: '0' },
          '12%': { transform: 'scale(1.08)', opacity: '1' },
          '20%': { transform: 'scale(1)' },
          '80%': { transform: 'translateY(0)', opacity: '1' },
          '100%': { transform: 'translateY(-12px)', opacity: '0' },
        },
      },
      animation: {
        'tulip-sway': 'tulip-sway 3s ease-in-out infinite',
        'soft-pulse': 'soft-pulse 2.4s ease-out infinite',
        'float-drift': 'float-drift 4s ease-in-out infinite',
        // Bubbles override the duration inline so each one rises at its own pace.
        'bubble-rise': 'bubble-rise 7s linear forwards',
        'bubble-sway': 'bubble-sway 2.6s ease-in-out infinite',
        'note-pop': 'note-pop 1.6s ease-out forwards',
        'fade-up': 'fade-up 0.4s ease-out both',
        'pop-in': 'pop-in 0.25s ease-out both',
        'tile-drop': 'tile-drop 0.24s ease-in backwards',
        'hint-wiggle': 'hint-wiggle 0.9s ease-in-out infinite',
        praise: 'praise 1.6s ease-out forwards',
      },
    },
  },
  plugins: [],
}
