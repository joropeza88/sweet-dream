import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{vue,ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Avenir Next"', '"SF Pro Display"', '"Segoe UI"', 'sans-serif'],
        display: ['"Iowan Old Style"', '"Palatino Linotype"', 'serif'],
      },
      colors: {
        mist: {
          50: '#f5f7fb',
          100: '#e8eef7',
          200: '#c9d8e8',
          300: '#abc2da',
          400: '#6d96b6',
          500: '#406f96',
          600: '#2f5679',
          700: '#25445f',
          800: '#1d354a',
          900: '#172a3c',
        },
      },
      boxShadow: {
        glow: '0 22px 60px rgba(17, 40, 61, 0.22)',
        card: '0 18px 40px rgba(14, 29, 44, 0.16)',
      },
      backgroundImage: {
        'hero-gradient':
          'radial-gradient(circle at top, rgba(255,255,255,0.25), rgba(255,255,255,0) 30%), linear-gradient(180deg, #edf5ff 0%, #c5d8e6 36%, #95b6c6 100%)',
      },
      animation: {
        float: 'float 6s ease-in-out infinite',
        shimmer: 'shimmer 2.4s ease-in-out infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        shimmer: {
          '0%, 100%': { opacity: '0.72' },
          '50%': { opacity: '1' },
        },
      },
    },
  },
  plugins: [],
} satisfies Config
