/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        bg: {
          base: '#070b14',
          panel: '#0c1322',
          raised: '#121b2e'
        },
        line: '#26324a',
        brand: {
          DEFAULT: '#3884ff',
          soft: 'rgba(56,132,255,0.15)'
        },
        silver: '#aeb9cf'
      },
      borderRadius: {
        '4xl': '2rem'
      },
      animation: {
        spotlight: 'spotlight 2s ease 0.75s 1 forwards'
      },
      keyframes: {
        spotlight: {
          '0%': { opacity: 0, transform: 'translate(-72%, -62%) scale(0.5)' },
          '100%': { opacity: 1, transform: 'translate(-50%, -40%) scale(1)' }
        }
      },
      fontFamily: {
        sans: ['"Inter"', '"PingFang SC"', '"Microsoft YaHei"', 'system-ui', 'sans-serif']
      }
    }
  },
  plugins: []
};
