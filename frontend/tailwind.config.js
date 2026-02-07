/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        'display': ['Instrument Serif', 'serif'],
        'body': ['DM Sans', 'sans-serif'],
        'mono': ['JetBrains Mono', 'monospace'],
        // Legacy for backward compatibility
        'heading': ['DM Sans', 'sans-serif'],
        'main': ['DM Sans', 'sans-serif'],
      },
      colors: {
        // New light mode colors
        'bg': '#F6F5F1',
        'surface': '#FFFFFF',
        'surface-2': '#EEECE7',
        'border': '#D8D5CC',
        'text': '#1A1A1F',
        'text-dim': '#7C7A72',
        'accent': '#2B6CB0',
        'accent-glow': '#2B6CB030',
        'green': '#16A34A',
        'red': '#DC2626',
        'gold': '#D97706',
        'purple': '#7C3AED',
        
        // Legacy colors as CSS variables
        'void': {
          'deep': 'var(--void-deep)',
          'medium': 'var(--void-medium)',
          'light': 'var(--void-light)',
        },
        'indigo': {
          'dark': 'var(--indigo-dark)',
          'medium': 'var(--indigo-medium)',
        },
        'amber': {
          'glow': 'var(--amber-glow)',
          'bright': 'var(--amber-bright)',
          'dim': 'var(--amber-dim)',
        },
        'violet': {
          'glow': 'var(--violet-glow)',
          'bright': 'var(--violet-bright)',
          'dim': 'var(--violet-dim)',
        },
        'arcane': {
          'teal': 'var(--arcane-teal)',
        },
        // Legacy spell colors for backward compatibility
        'spell': {
          'primary': '#6366f1',
          'secondary': '#8b5cf6',
          'accent': '#f59e0b',
          'dark': '#1e1b4b',
          'darker': '#0f0d2e',
        }
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
        'shimmer': 'shimmer 3s ease-in-out infinite',
        'fadeInUp': 'fadeInUp 0.25s ease both',
        'revealChar': 'revealChar 0.35s ease both',
        'charPop': 'charPop 0.15s ease both',
      },
      keyframes: {
        glow: {
          '0%': { boxShadow: '0 0 5px #6366f1, 0 0 10px #6366f1' },
          '100%': { boxShadow: '0 0 20px #6366f1, 0 0 30px #8b5cf6' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% center' },
          '100%': { backgroundPosition: '200% center' },
        },
        fadeInUp: {
          from: { opacity: '0', transform: 'translateY(10px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        revealChar: {
          from: { opacity: '0', transform: 'scale(0.6) rotateX(60deg)' },
          to: { opacity: '1', transform: 'scale(1) rotateX(0)' },
        },
        charPop: {
          from: { opacity: '0', transform: 'translateY(10px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
      backgroundSize: {
        '200': '200% 100%',
      }
    },
  },
  plugins: [],
}
