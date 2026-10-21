/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: {
          50: '#f2fbf6',
          100: '#ddf3e8',
          200: '#bce8d6',
          300: '#8dd7bd',
          400: '#57bf9f',
          500: '#319f82',
          600: '#218269',
          700: '#1b6856',
          800: '#185346',
          900: '#0d3b32',
          950: '#062820',
        },
        brand: {
          50: '#f0fdf7',
          100: '#dcfce9',
          200: '#bbf7d4',
          300: '#86efb0',
          400: '#4ade87',
          500: '#20c46a',
          600: '#14a557',
          700: '#128247',
          800: '#14663c',
          900: '#135334',
          950: '#052e1b',
        },
        gold: {
          50: '#fdf9ed',
          100: '#faf0cf',
          200: '#f4df9d',
          300: '#ecc865',
          400: '#e3b340',
          500: '#cc9424',
          600: '#aa731d',
          700: '#88571b',
          800: '#71461d',
          900: '#603c1d',
        },
      },
      fontFamily: {
        sans: ['Inter', 'Segoe UI', 'system-ui', '-apple-system', 'sans-serif'],
        serif: ['Georgia', 'Cambria', 'Times New Roman', 'serif'],
      },
      boxShadow: {
        card: '0 1px 0 rgba(255,255,255,0.55) inset, 0 20px 50px -30px rgba(6,78,59,0.32)',
        glass: '0 1px 0 rgba(255,255,255,0.72) inset, 0 24px 60px -34px rgba(6,78,59,0.38)',
        'glass-lg': '0 1px 0 rgba(255,255,255,0.8) inset, 0 36px 90px -38px rgba(6,78,59,0.45)',
        drawer: '-24px 0 80px rgba(4,47,36,0.28)',
      },
      keyframes: {
        'slide-in': {
          '0%': { transform: 'translateX(100%)' },
          '100%': { transform: 'translateX(0)' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
      animation: {
        'slide-in': 'slide-in 0.22s ease-out',
        'fade-in': 'fade-in 0.18s ease-out',
      },
    },
  },
  plugins: [],
}
