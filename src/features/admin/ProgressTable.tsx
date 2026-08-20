import { useEffect, useState, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAdmin } from '../../store/useAdmin'
import {
  supabase,
  Word,
  Category,
  Progress,
  getCategories,
  getAllWords,
  getAllUsers,
  getAllUserCategoryIds,
  resolveVisibleLeafIds
} from '../../lib/supabase'
import {
  summarizeStudent,
  hardestWords,
  formatSince,
  STATUS_LABEL,
  STATUS_TONE,
  StudentSummary
} from '../../lib/progressAnalytics'
import { LoadingOverlay } from '../../shared/ui/LoadingOverlay'
import { Modal } from '../../shared/ui/Modal'
import { IconArrowRight } from '../../shared/ui/icons'
import StudentDetail from './StudentDetail'

type Tab = 'class' | 'words'

export default function ProgressTable() {
  const nav = useNavigate()
  const isAuth = useAdmin(s => s.isAuthenticated)

  const [tab, setTab] = useState<Tab>('class')
  const [summaries, setSummaries] = useState<StudentSummary[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [selected, setSelected] = useState<StudentSummary | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isAuth) {
      nav('/admin')
      return
    }
    load()
  }, [isAuth, nav])

  const load = async () => {
    try {
      setIsLoading(true)
      setError(null)

      const [users, cats, words, assignments] = await Promise.all([
        getAllUsers(),
        getCategories(),
        getAllWords(),
        getAllUserCategoryIds()
      ])

      const { data: progressRows, error: pErr } = await supabase
        .from('worder_progress')
        .select('*')
      if (pErr) throw pErr

      const progress: Progress[] = (progressRows || []).map((r: any) => ({
        id: r.id,
        userId: r.user_id,
        wordId: r.word_id,
        isCorrect: r.is_correct,
        attempts: r.attempts,
        lastAnswer: r.last_answer,
        wrongAnswers: r.wrong_answers,
        audioPlayed: r.audio_played,
        answeredAt: r.answered_at
      }))

      const byUser = new Map<string, Progress[]>()
      for (const p of progress) {
        const list = byUser.get(p.userId)
        if (list) list.push(p)
        else byUser.set(p.userId, [p])
      }

      const now = Date.now()
      const students = users.filter(u => u.role === 'user')

      const result = students.map(user => {
        // רק המילים שהתלמידה בכלל אמורה לראות — אחרת האחוזים משקרים
        const visibleLeafIds = resolveVisibleLeafIds(assignments[user.id] ?? [], cats)
        const visibleWords: Word[] = words.filter(
          w => visibleLeafIds.has(w.categoryId) && w.active
        )
        return summarizeStudent(user, byUser.get(user.id) ?? [], visibleWords, now)
      })

      // המתקשות והנעלמות למעלה — הן הסיבה שנכנסים למסך הזה
      const rank: Record<string, number> = {
        struggling: 0, inactive: 1, 'never-started': 2, 'on-track': 3, done: 4
      }
      result.sort((a, b) => rank[a.status] - rank[b.status] || a.progressPercent - b.progressPercent)

      setCategories(cats)
      setSummaries(result)
    } catch (e) {
      console.error('Error loading progress:', e)
      setError('טעינת ההתקדמות נכשלה. נסי לרענן.')
    } finally {
      setIsLoading(false)
    }
  }

  const hard = useMemo(() => hardestWords(summaries), [summaries])
  const anyActivity = summaries.some(s => s.totalAttempts > 0)

  return (
    <div className="min-h-screen app-bg p-4 sm:p-6">
      <div className="max-w-5xl mx-auto">
        <header className="flex items-center justify-between gap-3 mb-5">
          <div>
            <h1 className="text-2xl font-bold text-ink">מעקב התקדמות</h1>
            <p className="text-sm text-muted font-medium">
              {summaries.length} תלמידות
            </p>
          </div>
          <Link
            to="/admin/dashboard"
            className="inline-flex items-center gap-1.5 text-sm font-bold text-ink bg-track border-2 border-ink shadow-solid-sm pressable px-3 py-1.5 rounded-pill"
          >
            <IconArrowRight size={16} /> חזרה
          </Link>
        </header>

        <div className="flex gap-2 mb-5">
          <TabButton active={tab === 'class'} onClick={() => setTab('class')}>
            כיתה
          </TabButton>
          <TabButton active={tab === 'words'} onClick={() => setTab('words')}>
            מילים קשות {hard.length > 0 && `(${hard.length})`}
          </TabButton>
        </div>

        <div className="relative min-h-[200px]">
          {isLoading && <LoadingOverlay message="טוען…" />}

          {error && !isLoading && (
            <div className="mb-4 rounded-sm2 border-2 border-ink bg-berry px-4 py-3 text-sm font-bold text-ink">
              {error}
            </div>
          )}

          {!isLoading && !error && !anyActivity && (
            <div className="rounded-md2 border-2 border-ink bg-surface p-8 text-center mb-5">
              <p className="text-4xl mb-2">🌱</p>
              <p className="font-bold text-ink">עוד אין נתוני התקדמות</p>
              <p className="text-sm text-muted mt-1">
                המספרים יופיעו כאן אחרי שהתלמידות ישחקו בפעם הראשונה.
              </p>
            </div>
          )}

          {!isLoading && tab === 'class' && (
            <div className="rounded-md2 border-2 border-ink bg-surface shadow-solid overflow-hidden">
              {summaries.map((s, i) => (
                <button
                  key={s.user.id}
                  onClick={() => setSelected(s)}
                  className={`w-full text-right px-4 py-3 flex items-center gap-3 hover:bg-cream transition-colors ${
                    i > 0 ? 'border-t border-line' : ''
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-ink truncate">
                      {s.user.firstName} {s.user.lastName}
                    </div>
                    <div className="text-xs text-muted font-medium">
                      {formatSince(s.daysSinceActivity)}
                      {s.toPractice.length > 0 && ` · ${s.toPractice.length} מילים לתרגול`}
                    </div>
                  </div>

                  <div className="hidden sm:flex items-center gap-2 w-40">
                    <div className="flex-1 h-2.5 rounded-pill bg-track border-2 border-ink overflow-hidden">
                      <div className="h-full bg-mint" style={{ width: `${s.progressPercent}%` }} />
                    </div>
                    <span className="text-xs font-bold text-ink tabular-nums w-12 text-left">
                      {s.masteredWords}/{s.totalWords}
                    </span>
                  </div>

                  <span className="text-sm font-bold text-ink tabular-nums w-12 text-left">
                    {s.totalAttempts > 0 ? `${s.successRate}%` : '—'}
                  </span>

                  <span
                    className={`shrink-0 text-xs font-bold text-ink border-2 border-ink rounded-pill px-2.5 py-0.5 ${STATUS_TONE[s.status]}`}
                  >
                    {STATUS_LABEL[s.status]}
                  </span>
                </button>
              ))}
              {summaries.length === 0 && !isLoading && (
                <p className="p-8 text-center text-muted">אין תלמידות במערכת.</p>
              )}
            </div>
          )}

          {!isLoading && tab === 'words' && (
            <div className="rounded-md2 border-2 border-ink bg-surface shadow-solid overflow-hidden">
              {hard.map((w, i) => (
                <div
                  key={w.wordId}
                  className={`px-4 py-3 flex items-center gap-3 ${i > 0 ? 'border-t border-line' : ''}`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-ink truncate" dir="ltr">
                      {w.en}
                    </div>
                    <div className="text-xs text-muted font-medium truncate">
                      {w.he} · {w.studentNames.join(', ')}
                    </div>
                  </div>
                  <span className="shrink-0 text-xs font-bold text-ink bg-berry border-2 border-ink rounded-pill px-2.5 py-0.5">
                    {w.studentsFailed} תלמידות
                  </span>
                  <span className="shrink-0 text-sm font-bold text-ink tabular-nums w-14 text-left">
                    {w.totalWrong} טעויות
                  </span>
                </div>
              ))}
              {hard.length === 0 && (
                <p className="p-8 text-center text-muted">
                  אין עדיין מילים עם טעויות. זה או שהכול הולך מצוין, או שעוד לא שיחקו.
                </p>
              )}
            </div>
          )}
        </div>

        <Modal
          isOpen={!!selected}
          onClose={() => setSelected(null)}
          title={selected ? `${selected.user.firstName} ${selected.user.lastName}` : ''}
        >
          {selected && (
            <StudentDetail
              summary={selected}
              categories={categories}
              onClose={() => setSelected(null)}
            />
          )}
        </Modal>
      </div>
    </div>
  )
}

function TabButton({
  active,
  onClick,
  children
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-pill text-sm font-bold text-ink border-2 border-ink shadow-solid-sm pressable ${
        active ? 'bg-sun' : 'bg-surface'
      }`}
    >
      {children}
    </button>
  )
}
