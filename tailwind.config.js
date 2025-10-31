
/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'primary': '#0078D4',
        'secondary': '#2B88D8',
        'light': '#F3F2F1',
        'dark': '#1E1E1E',
        'accent': '#00B7C3',
      },
    },
  },
  plugins: [],
}