import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        bg: '#0A0A0A',
        surface: '#111111',
        'surface-2': '#161616',
        border: '#1E1E1E',
        accent: '#00FF88',
        'accent-dim': '#00CC6A',
        muted: '#888888',
        danger: '#FF4444',
        win: '#00FF88',
        lose: '#FF4444',
        up: '#00FF88',
        down: '#FF4444',
        ai: '#7C3AED',
        'ai-dim': '#6D28D9',
        human: '#0EA5E9',
        'human-dim': '#0284C7',
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'Consolas', 'monospace'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        'pulse-green': 'pulse-green 2s ease-in-out infinite',
        'pulse-red': 'pulse-red 2s ease-in-out infinite',
        'flicker': 'flicker 3s ease-in-out infinite',
        'scan': 'scan 4s linear infinite',
        'slide-up': 'slide-up 0.5s ease-out',
        'battle-glow': 'battle-glow 3s ease-in-out infinite',
      },
      keyframes: {
        'pulse-green': {
          '0%, 100%': { boxShadow: '0 0 8px rgba(0, 255, 136, 0.3)' },
          '50%': { boxShadow: '0 0 24px rgba(0, 255, 136, 0.7)' },
        },
        'pulse-red': {
          '0%, 100%': { boxShadow: '0 0 8px rgba(255, 68, 68, 0.3)' },
          '50%': { boxShadow: '0 0 24px rgba(255, 68, 68, 0.7)' },
        },
        'flicker': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.85' },
        },
        'scan': {
          '0%': { backgroundPosition: '0 0' },
          '100%': { backgroundPosition: '0 100%' },
        },
        'slide-up': {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'battle-glow': {
          '0%, 100%': { boxShadow: '0 0 20px rgba(124, 58, 237, 0.3), 0 0 20px rgba(0, 255, 136, 0.3)' },
          '50%': { boxShadow: '0 0 40px rgba(124, 58, 237, 0.6), 0 0 40px rgba(0, 255, 136, 0.6)' },
        },
      },
      backgroundImage: {
        'grid-pattern': 'linear-gradient(rgba(0,255,136,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(0,255,136,0.03) 1px, transparent 1px)',
      },
      backgroundSize: {
        grid: '32px 32px',
      },
    },
  },
  plugins: [],
}

export default config
