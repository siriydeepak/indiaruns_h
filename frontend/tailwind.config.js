/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        slate: {
          950: '#07080e',
          900: '#0a0b10',
          800: '#121420',
          700: '#191c2c',
        }
      }
    },
  },
  plugins: [],
}

