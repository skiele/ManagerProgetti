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
        // Colori del tema: variabili CSS definite in src/index.css (:root = chiaro, .dark = scuro).
        // Cambiano da sole con il tema, quindi non servono più le varianti dark:.
        'primary': 'hsl(var(--primary) / <alpha-value>)',
        'primary-hover': 'hsl(var(--primary-hover) / <alpha-value>)',
        'primary-foreground': 'hsl(var(--primary-foreground) / <alpha-value>)',
        'secondary': 'hsl(var(--secondary) / <alpha-value>)',
        'secondary-foreground': 'hsl(var(--secondary-foreground) / <alpha-value>)',
        'background': 'hsl(var(--background) / <alpha-value>)',
        'foreground': 'hsl(var(--foreground) / <alpha-value>)',
        'card': 'hsl(var(--card) / <alpha-value>)',
        'card-foreground': 'hsl(var(--card-foreground) / <alpha-value>)',
        'muted': 'hsl(var(--muted) / <alpha-value>)',
        'muted-foreground': 'hsl(var(--muted-foreground) / <alpha-value>)',
        'accent': 'hsl(var(--accent) / <alpha-value>)',
        'accent-hover': 'hsl(var(--accent-hover) / <alpha-value>)',
        'accent-foreground': 'hsl(var(--accent-foreground) / <alpha-value>)',
        'destructive': 'hsl(var(--destructive) / <alpha-value>)',
        'destructive-foreground': 'hsl(var(--destructive-foreground) / <alpha-value>)',
        'signal': 'hsl(var(--signal) / <alpha-value>)',

        // Dark Theme
        dark: {
          primary: 'hsl(221 83% 63%)',
          'primary-hover': 'hsl(221 83% 69%)',
          'primary-foreground': 'hsl(0 0% 100%)',

          secondary: 'hsl(222 47% 11%)',
          'secondary-foreground': 'hsl(215 14% 89%)',
          
          background: 'hsl(222 47% 8%)',
          foreground: 'hsl(215 14% 89%)',
          
          card: 'hsl(222 47% 11%)',
          'card-foreground': 'hsl(215 14% 89%)',
          
          muted: 'hsl(222 47% 16%)',
          'muted-foreground': 'hsl(218 11% 65%)',
          
          accent: 'hsl(173 70% 50%)',
          'accent-hover': 'hsl(173 70% 56%)',
          'accent-foreground': 'hsl(224 10% 10%)',
          
          destructive: 'hsl(0 63% 51%)',
          'destructive-foreground': 'hsl(0 0% 100%)',
        }
      },
      // Angoli vivi e superfici piatte: niente arrotondamenti né ombre
      borderRadius: { lg: '0px', md: '0px', sm: '0px', DEFAULT: '0px' },
      boxShadow: { sm: 'none', DEFAULT: 'none', md: 'none', lg: 'none', xl: 'none', '2xl': 'none' },
      fontFamily: { sans: ['Archivo', 'Helvetica Neue', 'Arial', 'sans-serif'] },
    },
  },
  plugins: [],
}