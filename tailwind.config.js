/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        cream: '#FFFDF5',
        yellowBrand: '#FFC400',
        yellowSoft: '#FFE066',
      },
    },
  },
  plugins: [],
}

