# 🔊 הגדרת OpenAI Text-to-Speech

## למה צריך את זה?
הפרויקט משתמש ב-OpenAI TTS כדי להקריא את המילים באנגלית לתלמידים.
זה עוזר להם ללמוד את ההגייה הנכונה!

---

## 📋 שלבי ההגדרה

### שלב 1: קבלת API Key

1. **היכנס לאתר OpenAI:**
   👉 https://platform.openai.com/

2. **התחבר או הירשם** (אם אין לך חשבון)

3. **לך ל-API Keys:**
   👉 https://platform.openai.com/api-keys

4. **לחץ על "Create new secret key"**
   - תן לו שם: `worder-tts`
   - לחץ "Create secret key"

5. **העתק את ה-Key!** 
   - זה ייראה כמו: `sk-proj-xxxxxxxxxxxxxxxxxxxxxxxxx`
   - ⚠️ **חשוב**: לא תוכל לראות אותו שוב!

---

### שלב 2: הגדרת הפרויקט

1. **פתח את הקובץ `.env.local`** בתיקיית הפרויקט

2. **הדבק את ה-API Key:**
   ```
   VITE_OPENAI_API_KEY=sk-proj-YOUR-ACTUAL-KEY-HERE
   ```
   (החלף את `sk-proj-YOUR-ACTUAL-KEY-HERE` עם ה-key האמיתי שלך)

3. **שמור את הקובץ**

4. **אתחל מחדש את שרת הפיתוח:**
   ```bash
   npm run dev
   ```

---

### שלב 3: בדיקה

1. **פתח את המשחק**
2. **בחר מילה**
3. **לחץ על כפתור הרמקול 🔉**
4. **אם שומעים את המילה - זה עובד! 🎉**

---

## 💰 עלויות

- **OpenAI TTS** עולה כ-**$0.015 ל-1000 תווים**
- מילה ממוצעת: 5 תווים
- **200 מילים ≈ $0.015** (כמעט בחינם!)

---

## ⚠️ אבטחה

✅ הקובץ `.env.local` **לא נדחף לגיט** (הוא ב-.gitignore)  
✅ ה-API Key נשאר **רק במחשב שלך**  
❌ **אל תשתף** את ה-API Key בפומבי!

---

## 🐛 פתרון בעיות

### הכפתור לא עובד?
1. בדוק שה-API Key נכון ב-`.env.local`
2. אתחל מחדש את שרת הפיתוח (`npm run dev`)
3. פתח את ה-Console (F12) ובדוק שגיאות

### שגיאה: "OpenAI API Key not configured"
- ה-API Key חסר או לא נטען
- ודא שהקובץ `.env.local` קיים ומכיל את המפתח

### שגיאה: "Authentication failed"
- ה-API Key לא תקף
- צור key חדש מהאתר של OpenAI

---

## 📞 תמיכה

יש בעיה? פתח issue בגיטהאב!
👉 https://github.com/Idosegev23/worder/issues

