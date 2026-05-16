import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Backgrounds
        void: '#000000',
        terminal: '#0a0f0a',
        panel: 'rgba(0, 15, 0, 0.85)',
        'panel-hover': 'rgba(0, 25, 0, 0.9)',
        // Borders
        'panel-border': 'rgba(0, 255, 136, 0.15)',
        'panel-border-hover': 'rgba(0, 255, 136, 0.4)',
        // Accent
        'matrix-green': '#00ff88',
        'matrix-green-dim': '#335533',
        'matrix-green-glow': 'rgba(0, 255, 136, 0.25)',
        'matrix-green-faint': 'rgba(0, 255, 136, 0.05)',
        amber: '#ffaa00',
        'red-alert': '#ff0044',
        'blue-data': '#0088ff',
        // Text
        'text-bright': '#00ff88',
        'text-normal': '#a0b0a0',
        'text-dim': '#4a5a4a',
        'text-ghost': '#1a2a1a',
        // Legacy mappings
        primary: '#0a0f0a',
        secondary: 'rgba(0, 15, 0, 0.85)',
        cta: '#00ff88',
        background: '#000000',
        text: '#a0b0a0',
      },
      fontFamily: {
        sans: ['var(--font-geist)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-geist-mono)', 'ui-monospace', 'monospace'],
      },
      borderRadius: {
        terminal: '4px',
        panel: '6px',
        modal: '8px',
      },
      boxShadow: {
        'neon': '0 0 5px rgba(0, 255, 136, 0.25), 0 0 15px rgba(0, 255, 136, 0.1)',
        'neon-lg': '0 0 10px rgba(0, 255, 136, 0.3), 0 0 30px rgba(0, 255, 136, 0.15)',
        'neon-inset': 'inset 0 0 10px rgba(0, 255, 136, 0.1)',
        'neon-red': '0 0 5px rgba(255, 0, 68, 0.25), 0 0 15px rgba(255, 0, 68, 0.1)',
        'neon-amber': '0 0 5px rgba(255, 170, 0, 0.25), 0 0 15px rgba(255, 170, 0, 0.1)',
      },
      animation: {
        'glitch': 'glitch-jitter 0.15s ease-in-out',
        'glow-pulse': 'glow-pulse 2s ease-in-out infinite alternate',
        'matrix-fall': 'matrix-fall 1.5s ease-in-out infinite',
      },
      keyframes: {
        'glitch-jitter': {
          '0%, 100%': { transform: 'translate(0)' },
          '20%': { transform: 'translate(-1px, 1px)' },
          '40%': { transform: 'translate(1px, -1px)' },
          '60%': { transform: 'translate(-1px, 0)' },
          '80%': { transform: 'translate(1px, 1px)' },
        },
        'glow-pulse': {
          '0%': { boxShadow: '0 0 5px rgba(0, 255, 136, 0.2), 0 0 15px rgba(0, 255, 136, 0.1)' },
          '100%': { boxShadow: '0 0 10px rgba(0, 255, 136, 0.4), 0 0 30px rgba(0, 255, 136, 0.2)' },
        },
        'matrix-fall': {
          '0%': { opacity: '0', transform: 'translateY(-100%)' },
          '50%': { opacity: '1' },
          '100%': { opacity: '0', transform: 'translateY(100%)' },
        },
      },
    },
  },
  plugins: [],
}
export default config
