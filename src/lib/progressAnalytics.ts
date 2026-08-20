import type { Profile, Progress, Word, Category } from './supabase'

/**
 * צבירת התקדמות — פונקציות טהורות, בלי גישה לרשת.
 *
 * העיקרון: המסך הישן הציג *ניסיון* בכל שורה, ולכן תלמידה שטעתה
 * ארבע פעמים באותה מילה ייצרה ארבע שורות. כאן כל שורה היא *מילה*.
 */

export type StudentStatus = 'never-started' | 'inactive' | 'struggling' | 'on-track' | 'done'

export type WordStat = {
  wordId: number
  en: string
  he: string
  categoryId: number
  wrongCount: number
  /** האם בסופו של דבר ענתה נכון על המילה */
  mastered: boolean
  /** התשובות השגויות שנתנה בפועל, בלי כפילויות */
  wrongAnswers: string[]
  lastSeen: string | null
}

export type StudentSummary = {
  user: Profile
  totalWords: number
  masteredWords: number
  progressPercent: number
  successRate: number
  totalAttempts: number
  lastActivity: string | null
  daysSinceActivity: number | null
  status: StudentStatus
  /** מילים שנכשלו, הקשה ביותר ראשונה */
  toPractice: WordStat[]
  masteredList: WordStat[]
}

export type ClassWordStat = {
  wordId: number
  en: string
  he: string
  studentsFailed: number
  totalWrong: number
  studentNames: string[]
}

const DAY_MS = 86_400_000

export function daysSince(iso: string | null, now: number): number | null {
  if (!iso) return null
  const t = Date.parse(iso)
  if (Number.isNaN(t)) return null
  return Math.floor((now - t) / DAY_MS)
}

/**
 * מצב התלמידה. הסדר חשוב — "טרם התחילה" גובר על "לא פעילה",
 * אחרת כל תלמידה חדשה תסומן כנעלמת.
 */
export function classifyStudent(args: {
  totalAttempts: number
  progressPercent: number
  successRate: number
  daysSinceActivity: number | null
}): StudentStatus {
  const { totalAttempts, progressPercent, successRate, daysSinceActivity } = args
  if (totalAttempts === 0) return 'never-started'
  if (progressPercent >= 100) return 'done'
  if (daysSinceActivity !== null && daysSinceActivity >= 7) return 'inactive'
  if (successRate < 60) return 'struggling'
  return 'on-track'
}

export const STATUS_LABEL: Record<StudentStatus, string> = {
  'never-started': 'טרם התחילה',
  inactive: 'לא נכנסה שבוע',
  struggling: 'מתקשה',
  'on-track': 'מתקדמת',
  done: 'סיימה הכול'
}

export const STATUS_TONE: Record<StudentStatus, string> = {
  'never-started': 'bg-track',
  inactive: 'bg-sun',
  struggling: 'bg-berry',
  'on-track': 'bg-sky',
  done: 'bg-mint'
}

/** צובר את רשומות ההתקדמות של תלמידה אחת לרמת מילה */
export function summarizeStudent(
  user: Profile,
  records: Progress[],
  visibleWords: Word[],
  now: number
): StudentSummary {
  const byWord = new Map<number, Progress[]>()
  for (const r of records) {
    const list = byWord.get(r.wordId)
    if (list) list.push(r)
    else byWord.set(r.wordId, [r])
  }

  const toPractice: WordStat[] = []
  const masteredList: WordStat[] = []

  for (const word of visibleWords) {
    const rows = byWord.get(word.id)
    if (!rows || rows.length === 0) continue

    const wrongRows = rows.filter(r => !r.isCorrect)
    const mastered = rows.some(r => r.isCorrect)
    const lastSeen = rows.reduce<string | null>(
      (max, r) => (max === null || r.answeredAt > max ? r.answeredAt : max),
      null
    )

    const stat: WordStat = {
      wordId: word.id,
      en: word.en,
      he: word.he,
      categoryId: word.categoryId,
      wrongCount: wrongRows.length,
      mastered,
      wrongAnswers: [...new Set(wrongRows.map(r => r.lastAnswer || '').filter(Boolean))],
      lastSeen
    }

    // מילה שנכשלה נשארת ב"לתרגול" גם אם בסוף נענתה נכון —
    // המורה רוצה לדעת שהיא הייתה קשה.
    if (wrongRows.length > 0) toPractice.push(stat)
    else masteredList.push(stat)
  }

  toPractice.sort((a, b) => b.wrongCount - a.wrongCount)

  const totalWords = visibleWords.length
  const masteredWords = visibleWords.filter(w =>
    (byWord.get(w.id) || []).some(r => r.isCorrect)
  ).length
  const totalAttempts = records.length
  const correct = records.filter(r => r.isCorrect).length
  const lastActivity = records.reduce<string | null>(
    (max, r) => (max === null || r.answeredAt > max ? r.answeredAt : max),
    null
  )
  const progressPercent = totalWords > 0 ? Math.round((masteredWords / totalWords) * 100) : 0
  const successRate = totalAttempts > 0 ? Math.round((correct / totalAttempts) * 100) : 0
  const d = daysSince(lastActivity, now)

  return {
    user,
    totalWords,
    masteredWords,
    progressPercent,
    successRate,
    totalAttempts,
    lastActivity,
    daysSinceActivity: d,
    status: classifyStudent({ totalAttempts, progressPercent, successRate, daysSinceActivity: d }),
    toPractice,
    masteredList
  }
}

/** צולב את כל התלמידות — אילו מילים מפילות הכי הרבה */
export function hardestWords(summaries: StudentSummary[], limit = 30): ClassWordStat[] {
  const acc = new Map<number, ClassWordStat>()

  for (const s of summaries) {
    const name = `${s.user.firstName} ${s.user.lastName}`
    for (const w of s.toPractice) {
      const cur = acc.get(w.wordId)
      if (cur) {
        cur.studentsFailed += 1
        cur.totalWrong += w.wrongCount
        cur.studentNames.push(name)
      } else {
        acc.set(w.wordId, {
          wordId: w.wordId,
          en: w.en,
          he: w.he,
          studentsFailed: 1,
          totalWrong: w.wrongCount,
          studentNames: [name]
        })
      }
    }
  }

  return [...acc.values()]
    .sort((a, b) => b.studentsFailed - a.studentsFailed || b.totalWrong - a.totalWrong)
    .slice(0, limit)
}

/** תיאור זמן קריא בעברית */
export function formatSince(days: number | null): string {
  if (days === null) return 'טרם נכנסה'
  if (days === 0) return 'היום'
  if (days === 1) return 'אתמול'
  if (days < 7) return `לפני ${days} ימים`
  if (days < 14) return 'לפני שבוע'
  if (days < 31) return `לפני ${Math.floor(days / 7)} שבועות`
  return `לפני ${Math.floor(days / 30)} חודשים`
}

/** מה נשלח ל-AI לסיכום להורים — מצטבר בלבד, בלי יומן גולמי */
export function parentSummaryPayload(s: StudentSummary, categories: Category[]) {
  const catName = (id: number) => categories.find(c => c.id === id)?.displayName ?? 'לא ידוע'
  return {
    שם: s.user.firstName,
    מילים_שנלמדו: s.masteredWords,
    סך_מילים: s.totalWords,
    אחוז_התקדמות: s.progressPercent,
    אחוז_הצלחה: s.successRate,
    פעילות_אחרונה: formatSince(s.daysSinceActivity),
    מילים_שדורשות_תרגול: s.toPractice.slice(0, 8).map(w => ({
      אנגלית: w.en,
      עברית: w.he,
      טעויות: w.wrongCount,
      יחידה: catName(w.categoryId)
    }))
  }
}
