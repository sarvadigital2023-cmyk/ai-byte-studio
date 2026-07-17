import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#050508',
        surface: 'rgba(255,255,255,0.04)',
        muted: '#8A8F98',
        neon: {
          blue: '#00D4FF',
          green: '#39FF88',
          pink: '#FF2D95',
          yellow: '#F5FF3D',
        },
      },
      fontFamily: {
        sans: [
          'Manrope',
          'Inter',
          'system-ui',
          '-apple-system',
          'Segoe UI',
          'sans-serif',
        ],
      },
      boxShadow: {
        'glow-blue': '0 0 24px -6px rgba(0,212,255,0.55)',
        'glow-green': '0 0 24px -6px rgba(57,255,136,0.55)',
        'glow-pink': '0 0 24px -6px rgba(255,45,149,0.55)',
        'glow-yellow': '0 0 24px -6px rgba(245,255,61,0.5)',
      },
      spacing: {
        'safe-top': 'env(safe-area-inset-top)',
        'safe-bottom': 'env(safe-area-inset-bottom)',
      },
      keyframes: {
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        drift: {
          '0%, 100%': { transform: 'translate(0, 0) scale(1)' },
          '33%': { transform: 'translate(6%, -4%) scale(1.08)' },
          '66%': { transform: 'translate(-5%, 5%) scale(0.95)' },
        },
        'pulse-ring': {
          '0%': { transform: 'scale(1)', opacity: '0.8' },
          '100%': { transform: 'scale(1.6)', opacity: '0' },
        },
        travel: {
          '0%': { left: '-20%' },
          '100%': { left: '110%' },
        },
      },
      animation: {
        shimmer: 'shimmer 1.6s linear infinite',
        drift: 'drift 24s ease-in-out infinite',
        'pulse-ring': 'pulse-ring 1.2s cubic-bezier(0.2, 0.6, 0.4, 1) infinite',
        travel: 'travel 1.4s ease-in-out infinite',
      },
    },
  },
  plugins: [],
} satisfies Config
