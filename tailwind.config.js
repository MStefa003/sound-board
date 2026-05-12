/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        sp: {
          base:          '#111111',
          surface:       '#181818',
          card:          '#1c1c1c',
          'card-hover':  '#222222',
          overlay:       'rgba(0,0,0,0.7)',
          border:        'rgba(255,255,255,0.08)',
          'border-hover':'rgba(255,255,255,0.15)',
          text:          '#e8e8e8',
          'text-sec':    '#888888',
          'text-muted':  '#505050',
          success:       '#22c55e',
          danger:        '#ef4444',
          'danger-dim':  'rgba(239,68,68,0.12)',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
