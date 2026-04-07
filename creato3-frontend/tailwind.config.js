/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        base: 'rgb(var(--color-base) / <alpha-value>)',
        surface: 'rgb(var(--color-surface) / <alpha-value>)',
        border: 'rgb(var(--color-border) / <alpha-value>)',
        glow: 'rgb(var(--color-glow) / <alpha-value>)',
        primary: 'rgb(var(--color-primary) / <alpha-value>)',
        accent: 'rgb(var(--color-accent) / <alpha-value>)',
        emerald: 'rgb(var(--color-emerald) / <alpha-value>)',
        danger: 'rgb(var(--color-danger) / <alpha-value>)'
      },
      fontFamily: {
        display: ['Satoshi', 'Inter', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'SFMono-Regular', 'Menlo', 'monospace']
      },
      boxShadow: {
        glow: '0 0 40px rgba(99, 102, 241, 0.35)',
        card: '0 20px 60px rgba(0, 0, 0, 0.45)',
        soft: '0 10px 30px rgba(0, 0, 0, 0.2)'
      },
      backgroundImage: {
        hero: 'radial-gradient(circle at top, rgba(109, 91, 255, 0.35), transparent 55%), radial-gradient(circle at 20% 30%, rgba(0, 229, 255, 0.25), transparent 50%), radial-gradient(circle at 80% 20%, rgba(42, 245, 152, 0.15), transparent 45%)',
        glass: 'linear-gradient(135deg, rgba(255, 255, 255, 0.08), rgba(255, 255, 255, 0.02))'
      }
    }
  },
  plugins: []
}
