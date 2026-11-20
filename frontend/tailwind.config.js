/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        /* ── Brand (matches screenshot palette) ── */
        brand: {
          DEFAULT: '#4F46E5',   // Indigo-600 — sidebar, active, primary buttons
          light:   '#EEF2FF',   // Indigo-50  — hover tints, icon bg
          dark:    '#3730A3',   // Indigo-800 — sidebar bg
          deeper:  '#1E1B4B',   // Indigo-950 — sidebar footer
        },
        /* Keep named aliases for JSX convenience */
        primary:   '#4F46E5',
        success:   '#10B981',
        danger:    '#EF4444',
        warning:   '#F59E0B',
        info:      '#3B82F6',
        purple:    '#8B5CF6',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'Avenir', 'Helvetica', 'Arial', 'sans-serif'],
      },
      borderRadius: {
        xl:  '0.875rem',
        '2xl': '1.25rem',
      },
      boxShadow: {
        card: '0 1px 3px 0 rgba(0,0,0,.06), 0 1px 2px -1px rgba(0,0,0,.04)',
        'card-hover': '0 4px 12px 0 rgba(79,70,229,.12)',
        sidebar: '2px 0 8px 0 rgba(30,27,75,.18)',
      },
      screens: {
        sm:   '640px',
        md:   '768px',
        lg:   '1024px',
        xl:   '1280px',
        '2xl':'1536px',
      },
    },
  },
  plugins: [],
};
