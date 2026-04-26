/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['"DM Sans"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['"Cormorant Garamond"', 'Georgia', 'serif'],
        ar: ['"Noto Kufi Arabic"', 'sans-serif'],
        arDisplay: ['"Amiri"', 'serif'],
      },
      colors: {
        accent: 'var(--accent)',
        'accent-hover': 'var(--accent-hover)',
        // back-compat for legacy `brand-*` references in older components
        brand: {
          50: 'var(--bg-secondary)',
          500: 'var(--accent)',
          600: 'var(--accent)',
          700: 'var(--accent-hover)',
        },
      },
    },
  },
  plugins: [require('tailwindcss-rtl')],
};
