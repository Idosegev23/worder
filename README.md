# WordQuest 🎮

אפליקציה לוקאלית לחלוטין ללימוד אנגלית-עברית עם אפקטים משוגעים וממשק ניהול מתקדם.

## 🎯 תכונות

### למשתמשים:
- ✅ 38 מילים ב-4 קטגוריות (Nouns, Verbs, Prepositions, Adjectives)
- ✅ אפקטים חגיגיים משוגעים (65%) בתשובות נכונות
- ✅ אפקטים שובבים בתשובות שגויות
- ✅ מערכת מתנות בחירה
- ✅ אווטרים מותאמים אישית (DiceBear)
- ✅ אחסון לוקאלי (IndexedDB)

### לאדמין:
- ✅ ניהול מילים מלא (CRUD + אלטרנטיבות)
- ✅ ניהול משתמשים עם **הצגת/עריכת סיסמאות במפורש**
- ✅ **מעקב התקדמות תלמידים** - סטטיסטיקות מלאות + פירוט לכל תלמיד
- ✅ ניהול מתנות
- ✅ ייצוא/ייבוא JSON לגיבוי

## 🚀 התקנה

```bash
npm install
```

## 🎬 הרצה

```bash
npm run dev
```

## 🏗️ בנייה לפרודקשן

```bash
npm run build
npm run preview
```

## 🎨 סטאק טכנולוגי

- **React 18** + **Vite**
- **TypeScript**
- **Tailwind CSS**
- **Zustand** - ניהול state
- **Dexie.js** - IndexedDB wrapper
- **Framer Motion** + **GSAP** - אנימציות
- **Howler.js** - סאונד
- **DiceBear** - אווטרים
- **canvas-confetti** - קונפטי ואפקטים

## 📁 מבנה פרויקט

```
worder/
├── src/
│   ├── features/
│   │   ├── auth/        # Login, Register
│   │   ├── avatar/      # Avatar Picker
│   │   ├── categories/  # Category Grid
│   │   ├── game/        # GameScreen (הלב של המשחק!)
│   │   ├── rewards/     # Reward Chooser
│   │   └── admin/       # Admin Dashboard + Tables
│   ├── lib/
│   │   ├── db.ts              # Dexie DB
│   │   ├── seed.ts            # נתונים ראשוניים
│   │   ├── storage.ts         # ייצוא/ייבוא
│   │   ├── effectsRegistry.ts # כל האפקטים!
│   │   ├── useEffectEngine.ts # מנוע אפקטים
│   │   ├── confetti.ts        # קונפטי
│   │   ├── sounds.ts          # סאונד
│   │   └── dicebear.ts        # אווטרים
│   ├── store/
│   │   ├── useAuth.ts   # Zustand auth
│   │   ├── useGame.ts   # Zustand game
│   │   └── useAdmin.ts  # Zustand admin
│   └── shared/ui/       # רכיבי UI משותפים
└── public/
    └── sfx/             # קבצי אודיו
```

## 🎭 אפקטים

### אפקטים חגיגיים (תשובות נכונות):
- 🎉 Confetti Burst
- 🎆 Fireworks
- ⭐ Star Shower
- 💃 Victory Dance
- ✨ Glow Pulse
- 🎈 Happy Bounce
- 🌈 Rainbow Flash
- 🎊 Emoji Rain
- 🎪 Scale Joy
- 💥 Particle Explosion
- 🔔 Success Chime
- ✨ Gold Shimmer

### אפקטים שובבים (תשובות שגויות):
- 🔄 Flip Screen
- 🎨 Invert Colors
- 🤹 Shake
- 🏃 Runaway Button
- 🌊 Ripple
- 📺 VHS Glitch
- 🎯 Zoom Burst
- 🪂 Gravity Drop
- 🧲 Cursor Magnet
- 🔀 Type Scramble
- 🤪 Emoji Burst
- 💨 Blur Pulse
- 🚀 Button Teleport
- 👻 Afterimage Echo
- 🧩 Mini Quiz

## 🔐 כניסת אדמין

- Username: `אילנית שגב`
- Password: `123456`

## 🎵 קבצי סאונד

הוסף את הקבצים הבאים ל-`public/sfx/`:
- correct.mp3
- wrong.mp3
- boing.mp3
- victory.mp3
- cheer.mp3
- sparkle.mp3

*(האפליקציה תעבוד גם בלעדיהם)*

## 🎨 צבעים

- Background: `#0F172A`
- Surface: `#111827`
- Primary: `#7C3AED` (סגול)
- Secondary: `#F59E0B` (כתום)
- Accent: `#10B981` (ירוק)
- Error: `#EF4444` (אדום)

## 📝 רישיון

פרויקט חינוכי פרטי

