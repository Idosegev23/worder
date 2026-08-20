import { SVGProps } from 'react'

/**
 * אייקונים מצוירים — עובי קו אחיד 2.4, קצוות מעוגלים, currentColor.
 * מחליפים את האמוג'י ששימש כאייקון קטגוריה.
 *
 * אמוג'י שהוא *תוכן* (🎁 הטבה, 🔥 רצף, 🏆 הישג) נשאר במקומו — הוא לא ממשק.
 */

type IconProps = SVGProps<SVGSVGElement> & { size?: number }

function Svg({ size = 24, children, ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.4}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {children}
    </svg>
  )
}

export const IconHome = (p: IconProps) => (
  <Svg {...p}><path d="M3 10.5 12 3l9 7.5" /><path d="M5 9.5V21h14V9.5" /><path d="M10 21v-5.5h4V21" /></Svg>
)
export const IconMusic = (p: IconProps) => (
  <Svg {...p}><path d="M9 18V5l10-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="16" cy="16" r="3" /></Svg>
)
export const IconNumbers = (p: IconProps) => (
  <Svg {...p}><path d="M6 4v16" /><path d="M13 4h5v7h-5z" /><path d="M13 15h5v5h-5z" /><path d="M4 8h4" /></Svg>
)
export const IconStar = (p: IconProps) => (
  <Svg {...p}><path d="m12 3 2.7 5.7 6.3.9-4.5 4.4 1 6.2-5.5-2.9-5.5 2.9 1-6.2L3 9.6l6.3-.9z" /></Svg>
)
export const IconBook = (p: IconProps) => (
  <Svg {...p}><path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H20v16H6.5A2.5 2.5 0 0 0 4 20.5z" /><path d="M4 4.5v16" /></Svg>
)
export const IconBolt = (p: IconProps) => (
  <Svg {...p}><path d="M13 2 4 14h7l-1 8 9-12h-7z" /></Svg>
)
export const IconBox = (p: IconProps) => (
  <Svg {...p}><path d="m12 2 9 5v10l-9 5-9-5V7z" /><path d="m3 7 9 5 9-5" /><path d="M12 12v10" /></Svg>
)
export const IconPalette = (p: IconProps) => (
  <Svg {...p}><path d="M12 3a9 9 0 1 0 0 18c1.7 0 2-1.3 1.2-2.2-.8-.9-.4-2.3 1-2.3H17a4 4 0 0 0 4-4c0-5-4-9.5-9-9.5z" /><circle cx="7.5" cy="11.5" r="1" /><circle cx="11" cy="7.5" r="1" /><circle cx="15.5" cy="9" r="1" /></Svg>
)
export const IconCompass = (p: IconProps) => (
  <Svg {...p}><circle cx="12" cy="12" r="9" /><path d="m15.5 8.5-2 5-5 2 2-5z" /></Svg>
)
export const IconUsers = (p: IconProps) => (
  <Svg {...p}><circle cx="9" cy="8" r="3.2" /><path d="M3 20a6 6 0 0 1 12 0" /><path d="M16 5.2a3.2 3.2 0 0 1 0 5.6" /><path d="M18 20a6 6 0 0 0-3-5.2" /></Svg>
)
export const IconApple = (p: IconProps) => (
  <Svg {...p}><path d="M12 7c-3.5-2.5-8 0-8 5 0 4 3 9 5.5 9 1 0 1.6-.6 2.5-.6s1.5.6 2.5.6C17 21 20 16 20 12c0-5-4.5-7.5-8-5z" /><path d="M12 7c0-2 1-3.5 3-4" /></Svg>
)
export const IconLeaf = (p: IconProps) => (
  <Svg {...p}><path d="M4 20c0-9 6-14 16-15 0 10-5 15-13 15H4z" /><path d="M9 15c2-3 4.5-5 8-6.5" /></Svg>
)
export const IconClock = (p: IconProps) => (
  <Svg {...p}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></Svg>
)
export const IconPin = (p: IconProps) => (
  <Svg {...p}><path d="M12 21s7-5.5 7-11a7 7 0 1 0-14 0c0 5.5 7 11 7 11z" /><circle cx="12" cy="10" r="2.6" /></Svg>
)
export const IconChat = (p: IconProps) => (
  <Svg {...p}><path d="M20 15a3 3 0 0 1-3 3H8l-4 3V6a3 3 0 0 1 3-3h10a3 3 0 0 1 3 3z" /></Svg>
)
export const IconPencil = (p: IconProps) => (
  <Svg {...p}><path d="M4 20h4l10-10-4-4L4 16z" /><path d="m14 6 4 4" /></Svg>
)
export const IconMic = (p: IconProps) => (
  <Svg {...p}><rect x="9" y="2" width="6" height="11" rx="3" /><path d="M5 11a7 7 0 0 0 14 0" /><path d="M12 18v4" /></Svg>
)
export const IconBall = (p: IconProps) => (
  <Svg {...p}><circle cx="12" cy="12" r="9" /><path d="m12 7 3.5 2.5-1.3 4.2h-4.4L8.5 9.5z" /></Svg>
)
export const IconCloud = (p: IconProps) => (
  <Svg {...p}><path d="M7 18a4 4 0 0 1 .6-8 5.5 5.5 0 0 1 10.5 1.5A3.5 3.5 0 0 1 17.5 18z" /></Svg>
)
export const IconShirt = (p: IconProps) => (
  <Svg {...p}><path d="M9 3 4 6l2 4 2-1v12h8V9l2 1 2-4-5-3a3 3 0 0 1-6 0z" /></Svg>
)
export const IconTarget = (p: IconProps) => (
  <Svg {...p}><circle cx="12" cy="12" r="8.5" /><circle cx="12" cy="12" r="4.5" /><circle cx="12" cy="12" r="1" /></Svg>
)
export const IconLetters = (p: IconProps) => (
  <Svg {...p}><path d="M3 18 7 6l4 12" /><path d="M4.4 14h5.2" /><path d="M15 10.5a3 3 0 1 1 3 4.5v-9" /></Svg>
)
export const IconQuestion = (p: IconProps) => (
  <Svg {...p}><circle cx="12" cy="12" r="9" /><path d="M9.5 9.5a2.5 2.5 0 1 1 3.4 2.3c-.6.3-.9.8-.9 1.4v.3" /><path d="M12 17.2v.2" /></Svg>
)
export const IconCards = (p: IconProps) => (
  <Svg {...p}><rect x="3" y="6" width="12" height="15" rx="2.5" /><path d="M8 3h9.5A2.5 2.5 0 0 1 20 5.5V17" /></Svg>
)
export const IconSofa = (p: IconProps) => (
  <Svg {...p}><path d="M5 12V8a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v4" /><path d="M3 13a2 2 0 0 1 4 0v3h10v-3a2 2 0 0 1 4 0v6H3z" /></Svg>
)
export const IconSparkles = (p: IconProps) => (
  <Svg {...p}><path d="m12 3 1.8 4.2L18 9l-4.2 1.8L12 15l-1.8-4.2L6 9l4.2-1.8z" /><path d="m18 15 .9 2.1 2.1.9-2.1.9-.9 2.1-.9-2.1-2.1-.9 2.1-.9z" /></Svg>
)

/* ——— אייקוני ממשק ——— */
export const IconSpeaker = (p: IconProps) => (
  <Svg {...p}><path d="M11 5 6 9H3v6h3l5 4z" /><path d="M15.5 9.5a3.5 3.5 0 0 1 0 5" /><path d="M18 7a7 7 0 0 1 0 10" /></Svg>
)
export const IconArrowRight = (p: IconProps) => (
  <Svg {...p}><path d="M19 12H5" /><path d="m12 5-7 7 7 7" /></Svg>
)
export const IconCheck = (p: IconProps) => (
  <Svg {...p}><path d="m4 12.5 5.5 5.5L20 7" /></Svg>
)
export const IconX = (p: IconProps) => (
  <Svg {...p}><path d="M6 6l12 12" /><path d="M18 6 6 18" /></Svg>
)
export const IconLogout = (p: IconProps) => (
  <Svg {...p}><path d="M14 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4" /><path d="M10 8 6 12l4 4" /><path d="M6 12h9" /></Svg>
)

/**
 * שם קטגוריה → אייקון. התאמת מחרוזת, כמו getCategoryEmoji הקודם,
 * אבל מחזיר רכיב במקום אמוג'י.
 */
export function iconForCategory(name: string) {
  const n = (name || '').toLowerCase()

  if (n.includes('בית') || n.includes('home') || n.includes('house') || n.includes('room')) return IconHome
  if (n.includes('תחביב') || n.includes('hobby') || n.includes('music') || n.includes('ספר ותחביב')) return IconMusic
  if (n.includes('מספר') || n.includes('תארי') || n.includes('number') || n.includes('date')) return IconNumbers
  if (n.includes('תיאור') || n.includes('adject') || n.includes('תאר')) return IconStar
  if (n.includes('verb') || n.includes('פעל')) return IconBolt
  if (n.includes('noun') || n.includes('שמות עצם')) return IconBox
  if (n.includes('preposit') || n.includes('יחס')) return IconCompass
  if (n.includes('pronoun') || n.includes('כינוי')) return IconUsers
  if (n.includes('vocab') || n.includes('אוצר')) return IconBook
  if (n.includes('food') || n.includes('אוכל') || n.includes('meal')) return IconApple
  if (n.includes('nature') || n.includes('טבע')) return IconLeaf
  if (n.includes('time') || n.includes('event') || n.includes('זמן')) return IconClock
  if (n.includes('place') || n.includes('מקומ')) return IconPin
  if (n.includes('phrase') || n.includes('ביטוי') || n.includes('expression')) return IconChat
  if (n.includes('grammar') || n.includes('תחביר')) return IconPencil
  if (n.includes('כתיב')) return IconPencil
  if (n.includes('הקלט')) return IconMic
  if (n.includes('people') || n.includes('אנש')) return IconUsers
  if (n.includes('sport') || n.includes('ספורט') || n.includes('game')) return IconBall
  if (n.includes('weather') || n.includes('season') || n.includes('מזג')) return IconCloud
  if (n.includes('body') || n.includes('clothes') || n.includes('גוף') || n.includes('בגד')) return IconShirt
  if (n.includes('exam') || n.includes('מבחן')) return IconTarget
  if (n.includes('am/is/are') || n.includes('have/has')) return IconLetters
  if (n.includes('question')) return IconQuestion
  if (n.includes('set')) return IconCards
  if (n.includes('object')) return IconSofa
  if (n.includes('כיתה') || n.includes('grade')) return IconBook

  return IconSparkles
}

/**
 * צבע אריח לפי מיקום ברשימה. מחזורי על ארבעת צבעי המותג —
 * דקורטיבי בלבד, ולכן אין כאן קידוד מידע.
 */
const TILE_COLORS = ['bg-sun', 'bg-sky', 'bg-mint', 'bg-berry'] as const

export function tileColor(index: number) {
  return TILE_COLORS[index % TILE_COLORS.length]
}
