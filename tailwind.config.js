/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#F0F9FF',        // תכלת בהיר מאוד
        surface: '#FFFFFF',    // לבן
        primary: '#8B5CF6',    // סגול בהיר
        secondary: '#EC4899',  // ורוד חי
        accent: '#10B981',     // ירוק (נשאר)
        danger: '#F87171',     // אדום בהיר יותר
        text: '#1E293B',       // טקסט כהה
        muted: '#64748B',      // אפור בהיר
        gold: '#FBBF24',       // זהב
        sky: '#38BDF8',        // תכלת
        purple: '#A78BFA',     // סגול בהיר
        pink: '#F472B6',       // ורוד בהיר
      },
      fontFamily: {
        heebo: ['Heebo', 'sans-serif']
      }
    },
  },
  plugins: [],
}

