/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{vue,js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          blue: '#0032a0',
          deep: '#001e60',
          red: '#ff0044',
          orange: '#ff8200',
          gray: '#e3e3e6',
        },
      },
      fontFamily: {
        sans: [
          'Inter',
          '"Noto Sans SC"',
          '-apple-system',
          'BlinkMacSystemFont',
          '"PingFang SC"',
          '"Microsoft YaHei"',
          'sans-serif',
        ],
      },
      boxShadow: {
        soft: '0 4px 24px rgba(0, 30, 96, 0.06)',
        glow: '0 10px 40px rgba(0, 50, 160, 0.18)',
      },
      backgroundImage: {
        'grid-pattern':
          'linear-gradient(rgba(255,255,255,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.06) 1px, transparent 1px)',
      },
    },
  },
  plugins: [],
};
