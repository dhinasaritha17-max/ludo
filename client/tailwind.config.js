/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ludo: {
          red: '#EF4444',
          'red-dark': '#B91C1C',
          green: '#10B981',
          'green-dark': '#047857',
          yellow: '#F59E0B',
          'yellow-dark': '#B45309',
          blue: '#3B82F6',
          'blue-dark': '#1D4ED8',
          purple: '#8B5CF6',
          dark: '#0F172A',
          card: '#1E293B',
          surface: '#334155',
        }
      },
      animation: {
        'bounce-subtle': 'bounceSubtle 1.5s infinite',
        'pulse-glow': 'pulseGlow 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'dice-shake': 'diceShake 0.6s ease-in-out',
        'float': 'float 3s ease-in-out infinite',
      },
      keyframes: {
        bounceSubtle: {
          '0%, 100%': { transform: 'translateY(-6%)', animationTimingFunction: 'cubic-bezier(0.8, 0, 1, 1)' },
          '50%': { transform: 'translateY(0)', animationTimingFunction: 'cubic-bezier(0, 0, 0.2, 1)' },
        },
        pulseGlow: {
          '0%, 100%': { opacity: '1', filter: 'drop-shadow(0 0 12px currentColor)' },
          '50%': { opacity: '0.6', filter: 'drop-shadow(0 0 4px currentColor)' },
        },
        diceShake: {
          '0%, 100%': { transform: 'rotate(0deg) scale(1)' },
          '20%': { transform: 'rotate(-25deg) scale(1.1)' },
          '40%': { transform: 'rotate(25deg) scale(1.15)' },
          '60%': { transform: 'rotate(-15deg) scale(1.1)' },
          '80%': { transform: 'rotate(10deg) scale(1.05)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        }
      }
    },
  },
  plugins: [],
}
