/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Premium ultra-dark palette (inspired by Ghost SignalDesk AI MessageGrid)
        surface: {
          50: '#e8e9ed',   // primary text (from SignalDesk)
          100: '#d4d5db',  // bright text
          200: '#9496a8',  // secondary text (from SignalDesk)
          300: '#7a7c90',  // tertiary bright
          400: '#5c5e72',  // tertiary text (from SignalDesk)
          500: '#3a3b50',  // muted/border bright (from SignalDesk)
          600: '#262738',  // default borders (from SignalDesk)
          700: '#1e1f2a',  // subtle borders (from SignalDesk)
          800: '#111218',  // card bg (from SignalDesk)
          900: '#0c0d12',  // surface bg (from SignalDesk)
          950: '#050508',  // void bg (from SignalDesk)
        },
        brand: {
          50: '#e6fcff',
          100: '#b3f5ff',
          200: '#80eeff',
          300: '#4de7ff',
          400: '#1ae0ff',
          500: '#00d4ff',  // Primary accent (from SignalDesk)
          600: '#00a8cc',
          700: '#007d99',
          800: '#005266',
          900: '#002733',
        },
        feature: {
          50: '#edf2ff',
          100: '#d0dcff',
          200: '#b3c6ff',
          300: '#96b0ff',
          400: '#799aff',
          500: '#4d8bff',  // Feature blue (brighter, more saturated)
          600: '#3d6fcc',
          700: '#2e5399',
          800: '#1e3766',
          900: '#0f1c33',
        },
        success: '#10B981',
        warning: '#F59E0B',
        danger: '#EF4444',
        info: '#3B82F6',
      },
      fontFamily: {
        sans: ['DM Sans', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Geist Mono', 'Consolas', 'monospace'],
      },
      fontSize: {
        '2xs': ['0.6875rem', { lineHeight: '1rem' }],      // NEW: 11px for metadata only
        'xs': ['0.8125rem', { lineHeight: '1.125rem' }],   // CHANGED: 13px (was 12px)
        'sm': ['0.875rem', { lineHeight: '1.25rem' }],     // KEEP: 14px minimum
        'base': ['1rem', { lineHeight: '1.5rem' }],
        'lg': ['1.125rem', { lineHeight: '1.75rem' }],
        'xl': ['1.25rem', { lineHeight: '1.75rem' }],
        '2xl': ['1.5rem', { lineHeight: '2rem' }],
        '3xl': ['1.875rem', { lineHeight: '2.25rem' }],
        '4xl': ['2.25rem', { lineHeight: '2.5rem' }],
      },
      borderRadius: {
        'none': '0',
        'sm': '0.25rem',
        DEFAULT: '0.375rem',
        'md': '0.5rem',
        'lg': '0.75rem',
        'xl': '1rem',
        '2xl': '1.5rem',
        'full': '9999px',
      },
      boxShadow: {
        'sm': '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        DEFAULT: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
        'md': '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        'lg': '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
        'xl': '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        'inner': 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.06)',
        'glass': '0 8px 32px 0 rgba(0, 212, 255, 0.08)',
        'glass-feature': '0 8px 32px 0 rgba(77, 139, 255, 0.08)',
        'none': 'none',
      },
      backdropBlur: {
        xs: '2px',
        sm: '4px',
        DEFAULT: '8px',
        md: '12px',
        lg: '16px',
        xl: '24px',
        '2xl': '40px',
        '3xl': '64px',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'slide-down': 'slideDown 0.3s ease-out',
        'scale-in': 'scaleIn 0.2s ease-out',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideDown: {
          '0%': { transform: 'translateY(-10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}
