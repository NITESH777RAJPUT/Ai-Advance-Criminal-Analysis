/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        intel: {
          950: '#06090e',
          900: '#0b111a',
          850: '#0f1724',
          800: '#152132',
          750: '#1b2b40',
          700: '#233852',
          600: '#334e70',
          500: '#486b95',
          accent: '#06b6d4', // cyan
          crimson: '#ef4444', // threat alert
          amber: '#f59e0b', // warning
          emerald: '#10b981', // safe / operational
          950: '#04070d', // Deep obsidian
          900: '#070d18', // Intelligence dark navy
          850: '#0b1424', // Surface dark
          800: '#111d33', // Card surface
          750: '#182742', // Elevated border
          700: '#1f3354', // Border soft
          600: '#2d4b7a', // Active border
          500: '#3e66a3', // Muted text
          accent: '#06b6d4', // Cyber Cyan
          crimson: '#ef4444', // Threat alert
          amber: '#f59e0b', // Warning
          emerald: '#10b981', // Safe / operational
          purple: '#a855f7', // High influence purple
          blue: '#3b82f6', // Cyber tactical blue
        },
        cyber: {
          cyan: '#06b6d4',
          blue: '#3b82f6',
          purple: '#8b5cf6',
          neon: '#00f5ff',
          red: '#ef4444',
          amber: '#f59e0b',
          emerald: '#10b981',
          obsidian: '#03060a',
        }
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'Courier New', 'monospace'],
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      boxShadow: {
        'glow-cyan': '0 0 20px -3px rgba(6, 182, 212, 0.45)',
        'glow-purple': '0 0 20px -3px rgba(168, 85, 247, 0.45)',
        'glow-red': '0 0 25px -2px rgba(239, 68, 68, 0.65)',
        'glow-amber': '0 0 20px -3px rgba(245, 158, 11, 0.45)',
        'glow-emerald': '0 0 20px -3px rgba(16, 185, 129, 0.45)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'halo-pulse': 'haloPulse 2.5s infinite ease-out',
        'radar-sweep': 'radarSweep 6s linear infinite',
      },
      keyframes: {
        haloPulse: {
          '0%': { transform: 'scale(0.98)', boxShadow: '0 0 0 0 rgba(6, 182, 212, 0.7)' },
          '70%': { transform: 'scale(1.02)', boxShadow: '0 0 0 16px rgba(6, 182, 212, 0)' },
          '100%': { transform: 'scale(0.98)', boxShadow: '0 0 0 0 rgba(6, 182, 212, 0)' },
        },
        radarSweep: {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        }
      }
    },
  },
  plugins: [],
}


