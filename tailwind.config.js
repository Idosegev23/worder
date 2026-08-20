/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // ——— ליבה ———
        ink: '#2A1B10',      // קווי מתאר, טקסט, צללים
        cream: '#FFF8EE',    // רקע האפליקציה
        surface: '#FFFFFF',  // כרטיסים, שדות
        muted: '#7A6555',    // טקסט משני
        line: '#E8DCCB',     // מפרידים דקים
        track: '#F2E8DA',    // רקע פס התקדמות / מצב לא-פעיל

        // ——— חמישה צבעים, כל אחד עם תפקיד ———
        sun: '#FFD166',      // מותג, הדגשה
        mint: '#06D6A0',     // הצלחה, התקדמות
        berry: '#EF476F',    // שגיאה
        sky: '#4CC9F0'       // פעולה, ניווט
      },
      fontFamily: {
        // Rubik — תמיכה מלאה בעברית, ידידותי בלי להיות ילדותי
        rubik: ['Rubik', 'system-ui', 'sans-serif'],
        display: ['Rubik', 'system-ui', 'sans-serif']
      },
      borderRadius: {
        // שלוש מדרגות בלבד
        sm2: '10px',   // שדות
        md2: '20px',   // כרטיסים
        pill: '999px'
      },
      borderWidth: {
        outline: '2.5px'
      },
      boxShadow: {
        // צל מוצק — שפה של מדבקה, לא טשטוש
        'solid-sm': '2px 3px 0 #2A1B10',
        'solid': '3px 4px 0 #2A1B10',
        'solid-lg': '5px 6px 0 #2A1B10',
        'solid-pressed': '1px 1px 0 #2A1B10'
      },
      keyframes: {
        'pop-in': {
          '0%': { transform: 'scale(0.94) translateY(6px)', opacity: '0' },
          '100%': { transform: 'scale(1) translateY(0)', opacity: '1' }
        },
        'nudge': {
          '0%, 100%': { transform: 'translateX(0)' },
          '25%': { transform: 'translateX(-5px)' },
          '75%': { transform: 'translateX(5px)' }
        }
      },
      animation: {
        'pop-in': 'pop-in 0.35s cubic-bezier(0.34, 1.4, 0.64, 1) both',
        'nudge': 'nudge 0.3s ease-in-out'
      }
    }
  },
  plugins: []
}
