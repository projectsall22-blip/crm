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
        /* Named aliases for JSX convenience */
        primary:   '#4F46E5',
        success:   '#10B981',
        danger:    '#EF4444',
        warning:   '#F59E0B',
        info:      '#3B82F6',
        purple:    '#8B5CF6',
        /* Navy — fixes Reports.jsx broken color reference */
        navy: {
          50:  '#EEF2FF',
          100: '#E0E7FF',
          200: '#C7D2FE',
          300: '#A5B4FC',
          400: '#818CF8',
          500: '#6366F1',
          600: '#4F46E5',
          700: '#4338CA',
          800: '#3730A3',
          900: '#312E81',
          950: '#1E1B4B',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'Avenir', 'Helvetica', 'Arial', 'sans-serif'],
      },
      borderRadius: {
        xl:  '0.875rem',
        '2xl': '1.25rem',
        '3xl': '1.5rem',
      },
      boxShadow: {
        card: '0 1px 3px 0 rgba(0,0,0,.06), 0 1px 2px -1px rgba(0,0,0,.04)',
        'card-hover': '0 4px 12px 0 rgba(79,70,229,.12)',
        'card-glow': '0 8px 32px 0 rgba(79,70,229,.18)',
        sidebar: '2px 0 8px 0 rgba(30,27,75,.18)',
        notification: '0 8px 32px rgba(0,0,0,.14)',
        kpi: '0 4px 24px 0 rgba(79,70,229,.15)',
      },
      screens: {
        sm:   '640px',
        md:   '768px',
        lg:   '1024px',
        xl:   '1280px',
        '2xl':'1536px',
      },
      keyframes: {
        'count-up': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-down': {
          '0%': { opacity: '0', transform: 'translateY(-8px) scale(0.97)' },
          '100%': { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        'slide-in-right': {
          '0%': { opacity: '0', transform: 'translateX(16px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        'pulse-dot': {
          '0%, 100%': { opacity: '1', transform: 'scale(1)' },
          '50%': { opacity: '0.5', transform: 'scale(1.3)' },
        },
        'shimmer': {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        'bounce-in': {
          '0%': { transform: 'scale(0.6)', opacity: '0' },
          '60%': { transform: 'scale(1.1)', opacity: '1' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
      },
      animation: {
        'count-up': 'count-up 0.4s ease-out both',
        'slide-down': 'slide-down 0.2s ease-out both',
        'slide-in-right': 'slide-in-right 0.25s ease-out both',
        'pulse-dot': 'pulse-dot 1.5s ease-in-out infinite',
        'shimmer': 'shimmer 2s linear infinite',
        'bounce-in': 'bounce-in 0.35s ease-out both',
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'dot-grid': 'radial-gradient(circle, #cbd5e1 1px, transparent 1px)',
      },
      backgroundSize: {
        'dot-grid': '20px 20px',
      },
    },
  },
  plugins: [],
};
