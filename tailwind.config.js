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
        primary: {
          DEFAULT: 'hsl(221 83% 53%)', // Blu acceso
          hover: 'hsl(221 83% 60%)',
          foreground: 'hsl(0 0% 100%)',
        },
        secondary: {
          DEFAULT: 'hsl(210 40% 96.1%)',
          foreground: 'hsl(222.2 47.4% 11.2%)',
        },
        background: 'hsl(0 0% 100%)',
        foreground: 'hsl(222.2 84% 4.9%)',
        card: {
          DEFAULT: 'hsl(0 0% 100%)',
          foreground: 'hsl(222.2 84% 4.9%)',
        },
        muted: {
          DEFAULT: 'hsl(210 40% 96.1%)',
          foreground: 'hsl(215.4 16.3% 46.9%)',
        },
        accent: {
          DEFAULT: 'hsl(172 63% 45%)', // Verde acqua
          hover: 'hsl(172 63% 52%)',
          foreground: 'hsl(0 0% 100%)',
        },
        destructive: {
          DEFAULT: 'hsl(0 84.2% 60.2%)',
          foreground: 'hsl(0 0% 100%)',
        },
        // Dark theme colors
        dark: {
          primary: {
            DEFAULT: 'hsl(217 91% 60%)',
            hover: 'hsl(217 91% 67%)',
            foreground: 'hsl(0 0% 100%)',
          },
          secondary: {
            DEFAULT: 'hsl(217.2 32.6% 17.5%)',
            foreground: 'hsl(210 40% 98%)',
          },
          background: 'hsl(222.2 84% 4.9%)',
          foreground: 'hsl(210 40% 98%)',
          card: {
            DEFAULT: 'hsl(222.2 84% 4.9%)',
            foreground: 'hsl(210 40% 98%)',
          },
          muted: {
            DEFAULT: 'hsl(217.2 32.6% 17.5%)',
            foreground: 'hsl(215 20.2% 65.1%)',
          },
          accent: {
             DEFAULT: 'hsl(172 63% 45%)',
             hover: 'hsl(172 63% 52%)',
             foreground: 'hsl(0 0% 100%)',
          },
          destructive: {
            DEFAULT: 'hsl(0 62.8% 30.6%)',
            foreground: 'hsl(0 0% 98%)',
          },
        },
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
