/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#8BE52B',
        'primary-60': '#6FC122',
        'primary-70': '#5BA31C',
        accent: '#8BE52B',
        tertiary: '#D7FF5A',
        neutral: '#11151B',
        surface: '#272B33',
        'surface-2': '#1A1F27',
        fg: '#FFFFFF',
        muted: '#A9B0BA',
        border: '#374151',
        'border-soft': '#FFFFFF14',
        overlay: '#0B0E13CC',
        error: '#FF5A5F'
      },
      fontFamily: {
        heading: ['Quantico', 'Inter', 'system-ui', 'sans-serif'],
        body: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace']
      }
    }
  },
  plugins: []
}
