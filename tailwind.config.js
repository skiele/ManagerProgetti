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
        // Light Theme
        primary: 'hsl(225 76% 52%)',
        'primary-hover': 'hsl(225 76% 58%)',
        'primary-foreground': 'hsl(0 0% 100%)',
        
        secondary: 'hsl(220 13% 91%)',
        'secondary-foreground': 'hsl(222 8% 25%)',
        
        background: 'hsl(220 14% 96%)',
        foreground: 'hsl(224 10% 10%)',
        
        card: 'hsl(0 0% 100%)',
        'card-foreground': 'hsl(224 10% 10%)',
        
        muted: 'hsl(220 13% 91%)',
        'muted-foreground': 'hsl(220 9% 46%)',
        
        accent: 'hsl(173 80% 40%)',
        'accent-hover': 'hsl(173 80% 46%)',
        'accent-foreground': 'hsl(0 0% 100%)',
        
        destructive: 'hsl(0 72% 51%)',
        'destructive-foreground': 'hsl(0 0% 100%)',

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
      borderRadius: {
        lg: `0.75rem`,
        md: `calc(0.75rem - 2px)`,
        sm: `calc(0.75rem - 4px)`,
      },
    },
  },
  plugins: [],
}