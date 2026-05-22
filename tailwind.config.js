/** 
 * ============================================================================
 * Tailwind CSS Configuration for Shift Roster App
 * 
 * Universal theme colors and design tokens used across ALL pages:
 * - Primary: Indigo (brand color for buttons, links, headers)
 * - Success: Emerald (confirmations, active states)
 * - Warning: Amber (alerts, pending states)
 * - Danger: Rose (errors, destructive actions)
 * - Neutral: Slate (text, borders, backgrounds)
 * ============================================================================
 */

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {

      /* ---- Brand Colors (Teal — calming green palette) ---- */
      colors: {
        brand: {
          50:  '#f0fdfa',
          100: '#ccfbf1',
          200: '#99f6e4',
          300: '#5eead4',
          400: '#2dd4bf',
          500: '#14b8a6',  // Primary brand color (Teal)
          600: '#0d9488',
          700: '#0f766e',
          800: '#115e59',
          900: '#134e4a',
          950: '#042f2e',
        },
      },

      /* ---- Font Family ---- */
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },

      /* ---- Animations ---- */
      animation: {
        'fade-in':    'fadeIn 0.3s ease-out',
        'slide-up':   'slideUp 0.3s ease-out',
        'slide-down': 'slideDown 0.3s ease-out',
        'spin-slow':  'spin 2s linear infinite',
      },
      keyframes: {
        fadeIn: {
          '0%':   { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%':   { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideDown: {
          '0%':   { opacity: '0', transform: 'translateY(-10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },

      /* ---- Shadows ---- */
      boxShadow: {
        'card':    '0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.06)',
        'card-lg': '0 4px 6px rgba(0,0,0,0.07), 0 2px 4px rgba(0,0,0,0.06)',
        'modal':   '0 20px 60px rgba(0,0,0,0.15)',
      },
    },
  },
  plugins: [],
};
