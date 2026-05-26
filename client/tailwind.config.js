/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{vue,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          navy: '#1e3a5f',
          'navy-light': '#2d5a8e',
          orange: '#f5a623',
          'orange-light': '#fef3e0',
          sky: '#4a90e2',
          green: '#7ed321',
          gray: '#6b7280',
          cream: '#faf8f5',
        },
      },
      fontFamily: {
        title: ['Cormorant Garamond', 'serif'],
        body: ['Inter', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        btn: '12px',
      },
    },
  },
  plugins: [],
}