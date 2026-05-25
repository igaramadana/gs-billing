/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: '#8aff66',
        panel: '#0b0f0a',
        panelSoft: '#10170f',
        stroke: 'rgba(138, 255, 102, 0.18)'
      },
      fontFamily: {
        oswald: ['Oswald', 'sans-serif'],
        geist: ['Geist', 'Inter', 'system-ui', 'sans-serif']
      },
      boxShadow: {
        glow: '0 0 35px rgba(138, 255, 102, 0.12)'
      }
    }
  },
  plugins: []
}