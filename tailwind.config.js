/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      borderRadius: {
        'none': '0px',
        'sm': '2px',
        DEFAULT: '3px',
        'md': '4px',
        'lg': '5px',
        'xl': '5px',
        '2xl': '5px',
        '3xl': '5px',
        'full': '5px',
      },
      colors: {
        cream: {
          50: '#FAF8F4',
          100: '#F5F0E8',
          200: '#EDE4D3',
          300: '#DDD0B8',
        },
        walnut: {
          50: '#F5EFE8',
          100: '#E8D9C4',
          200: '#C4A882',
          300: '#9E7B50',
          400: '#7A5B35',
          500: '#5C3D1E',
          600: '#3E2723',
          700: '#2D1B16',
          800: '#1E1208',
          900: '#0F0804',
        },
        bronze: {
          100: '#D4B896',
          200: '#B8956A',
          300: '#9B7245',
          400: '#8D6E63',
          500: '#6D4C41',
        },
        gold: {
          100: '#FFF9E3',
          200: '#FFE99A',
          300: '#F0CC60',
          400: '#D4AF37',
          500: '#A8860F',
          600: '#7C6209',
        },
      },
      fontFamily: {
        serif: ['"Playfair Display"', 'Georgia', 'serif'],
        sans: ['"Inter"', 'system-ui', 'sans-serif'],
      },
      animation: {
        'fade-in-up': 'fadeInUp 0.6s ease-out forwards',
        'fade-in': 'fadeIn 0.8s ease-out forwards',
        'slide-in-left': 'slideInLeft 0.6s ease-out forwards',
        'pulse-slow': 'pulse 3s infinite',
      },
      keyframes: {
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(30px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideInLeft: {
          '0%': { opacity: '0', transform: 'translateX(-30px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
      },
      boxShadow: {
        'warm': '0 4px 20px rgba(62, 39, 35, 0.12)',
        'warm-lg': '0 8px 40px rgba(62, 39, 35, 0.18)',
        'gold': '0 2px 12px rgba(212, 175, 55, 0.25)',
      },
    },
  },
  plugins: [],
}
