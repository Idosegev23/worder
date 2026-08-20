import { useEffect, useState } from 'react'
import { Progress, Profile, Word, supabase, getAllWords } from '../../lib/supabase'
import { Link, useNavigate } from 'react-router-dom'
import { useAdmin } from '../../store/useAdmin'
import { Button } from '../../shared/ui/Button'
import { Table, TableHeader, TableBody, TableRow, TableCell } from '../../shared/ui/Table'
import { Modal } from '../../shared/ui/Modal'
import { LoadingOverlay } from '../../shared/ui/LoadingOverlay'

type CategoryProgress = {
  categoryId: number
  categoryName: string
  displayName: string
  totalWords: number
  completedWords: number
  correctWords: number
  progressPercent: number
}

type StudentStats = {
  user: Profile
  totalAttempts: number
  correctAnswers: number
  wrongAnswers: number
  successRate: number
  lastActivity: string
  categoryProgress: CategoryProgress[]
}

type DetailedProgress = Progress & {
  word?: Word
}

export default function ProgressTable() {
  const nav = useNavigate()
  const isAuth = useAdmin(s => s.isAuthenticated)

  const [stats, setStats] = useState<StudentStats[]>([])
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null)
  const [userProgress, setUserProgress] = useState<DetailedProgress[]>([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isDetailsLoading, setIsDetailsLoading] = useState(false)

  useEffect(() => {
    if (!isAuth) {
      nav('/admin')
      return
    }
    loadStats()
  }, [isAuth, nav])

  const loadStats = async () => {
    try {
      setIsLoading(true)
      setError(null)
      
      // טעינת כל המשתמשים
      const { data: users } = await supabase
        .from('worder_profiles')
        .select('*')
        .eq('role', 'user')
      
      // טעינת כל הקטגוריות
      const { data: categories } = await supabase
        .from('worder_categories')
        .select('*')
        .order('display_order')
      
      // טעינת כל המילים
      const { data: words } = await supabase
        .from('worder_words')
        .select('id, category_id')
      
      if (!users || !categories || !words) return
      
      // ספירת מילים לכל קטגוריה
      const wordsPerCategory = new Map<number, number>()
      words.forEach(w => {
        wordsPerCategory.set(w.category_id, (wordsPerCategory.get(w.category_id) || 0) + 1)
      })
      
      // יצירת מפה של מילה -> קטגוריה
      const wordToCategory = new Map<number, number>()
      words.forEach(w => wordToCategory.set(w.id, w.category_id))
      
      // חישוב סטטיסטיקות לכל משתמש
      const statsPromises = users.map(async (user) => {
        const { data: progressRecords } = await supabase
          .from('worder_progress')
          .select('*')
          .eq('user_id', user.id)
        
        const records = progressRecords || []
        const totalAttempts = records.length
        const correctAnswers = records.filter(p => p.is_correct).length
        const wrongAnswers = totalAttempts - correctAnswers
        const successRate = totalAttempts > 0 ? (correctAnswers / totalAttempts) * 100 : 0
        const lastActivity = records.length > 0 
          ? records.reduce((max, p) => p.answered_at > max ? p.answered_at : max, records[0].answered_at)
          : user.created_at

        // חישוב התקדמות לכל קטגוריה
        const categoryStats = new Map<number, { completed: Set<number>; correct: Set<number> }>()
        
        records.forEach(p => {
          const catId = wordToCategory.get(p.word_id)
          if (!catId) return
          
          if (!categoryStats.has(catId)) {
            categoryStats.set(catId, { completed: new Set(), correct: new Set() })
          }
          
          const stat = categoryStats.get(catId)!
          stat.completed.add(p.word_id)
          if (p.is_correct) {
            stat.correct.add(p.word_id)
          }
        })

        const categoryProgress: CategoryProgress[] = categories.map(cat => {
          const totalWords = wordsPerCategory.get(cat.id) || 0
          const stat = categoryStats.get(cat.id)
          const completedWords = stat ? stat.completed.size : 0
          const correctWords = stat ? stat.correct.size : 0
          const progressPercent = totalWords > 0 ? Math.round((completedWords / totalWords) * 100) : 0
          
          return {
            categoryId: cat.id,
            categoryName: cat.name,
            displayName: cat.display_name,
            totalWords,
            completedWords,
            correctWords,
            progressPercent
          }
        }).filter(cp => cp.totalWords > 0) // רק קטגוריות עם מילים

        return {
          user: {
            id: user.id,
            firstName: user.first_name,
            lastName: user.last_name,
            username: user.username,
            password: user.password,
            role: user.role,
            avatarStyle: user.avatar_style,
            avatarSeed: user.avatar_seed,
            createdAt: user.created_at
          },
          totalAttempts,
          correctAnswers,
          wrongAnswers,
          successRate,
          lastActivity,
          categoryProgress
        }
      })

      const allStats = await Promise.all(statsPromises)
      // מיון לפי פעילות אחרונה
      allStats.sort((a, b) => new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime())
      setStats(allStats)
    } catch (error) {
      console.error('Error loading stats:', error)
      setError('טעינת נתוני התלמידים נכשלה.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleViewDetails = async (user: Profile) => {
    setSelectedUser(user)
    setIsDetailsLoading(true)
    try {
      // טעינת כל ההתקדמות של המשתמש עם המילים
      const { data: progressRecords } = await supabase
        .from('worder_progress')
        .select('*')
        .eq('user_id', user.id)
      
      if (!progressRecords) return
      
      const allWords = await getAllWords()
      
      // הוספת פרטי המילים
      const detailedProgress = progressRecords.map((p) => {
        const word = allWords.find(w => w.id === p.word_id)
        return {
          id: p.id,
          userId: p.user_id,
          wordId: p.word_id,
          isCorrect: p.is_correct,
          attempts: p.attempts,
          lastAnswer: p.last_answer,
          wrongAnswers: p.wrong_answers,
          audioPlayed: p.audio_played,
          answeredAt: p.answered_at,
          word
        }
      })
    
      // מיון לפי זמן (אחרון קודם)
      detailedProgress.sort((a, b) => new Date(b.answeredAt).getTime() - new Date(a.answeredAt).getTime())
      setUserProgress(detailedProgress)
      setIsModalOpen(true)
    } catch (error) {
      console.error('Error loading user details:', error)
    } finally {
      setIsDetailsLoading(false)
    }
  }

  const formatDate = (timestamp: string) => {
    return new Date(timestamp).toLocaleDateString('he-IL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div className="min-h-screen app-bg p-4 sm:p-6 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.4em] text-muted">ממשק אדמין</p>
            <h1 className="text-3xl sm:text-5xl font-bold bg-surface bg-clip-text text-transparent">
              התקדמות תלמידים 📊
            </h1>
            <p className="text-muted">מעקב מפורט על התקדמות בכל קטגוריה</p>
          </div>
          <Link to="/admin/dashboard">
            <button className="rounded-sm2 border border-ink px-5 py-3 text-sm font-semibold text-muted hover:text-ink hover:border-white/40 transition-all">
              ← חזרה לדשבורד
            </button>
          </Link>
        </div>

        <div className="bg-surface rounded-md2 border border-ink p-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between text-sm text-muted">
            <span>סה״כ <span className="text-sky font-bold">{stats.length}</span> תלמידים</span>
            <span><span className="text-mint font-bold">{stats.reduce((sum, s) => sum + s.totalAttempts, 0)}</span> ניסיונות</span>
          </div>
        </div>

        <div className="relative">
          {isLoading && <LoadingOverlay fullscreen message="טוען סטטיסטיקות..." />}
          {error && !isLoading && (
            <div className="mb-4 rounded-sm2 border border-berry bg-berry px-4 py-3 text-sm text-berry">
              {error}
            </div>
          )}

          {/* תצוגת כרטיסים - מובייל ודסקטופ */}
          <div className="space-y-6">
            {stats.map(stat => (
              <div key={stat.user.id} className="rounded-md2 border border-ink bg-surface p-5 ">
                {/* כותרת - פרטי תלמיד */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 pb-4 border-b border-ink">
                  <div>
                    <p className="text-xl font-bold text-ink">
                      {stat.user.firstName} {stat.user.lastName}
                    </p>
                    <p className="text-sm text-muted">@{stat.user.username}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-mint">{stat.correctAnswers}</p>
                      <p className="text-xs text-muted">נכונים</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-berry">{stat.wrongAnswers}</p>
                      <p className="text-xs text-muted">שגויים</p>
                    </div>
                    <div className="text-center">
                      <p className={`text-2xl font-bold ${
                        stat.successRate >= 80 ? 'text-mint' :
                        stat.successRate >= 60 ? 'text-sun' : 'text-berry'
                      }`}>
                        {stat.successRate.toFixed(0)}%
                      </p>
                      <p className="text-xs text-muted">הצלחה</p>
                    </div>
                  </div>
                </div>

                {/* התקדמות לפי קטגוריה */}
                <div className="mb-4">
                  <h4 className="text-sm font-semibold text-muted mb-3">📂 התקדמות לפי קטגוריה:</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {stat.categoryProgress.map(cp => (
                      <div 
                        key={cp.categoryId}
                        className={`rounded-sm2 p-3 border ${
                          cp.progressPercent === 0 ? 'bg-muted border-muted' :
                          cp.progressPercent < 50 ? 'bg-berry border-berry' :
                          cp.progressPercent < 100 ? 'bg-sun border-sun' :
                          'bg-mint border-mint'
                        }`}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <span className="text-sm font-medium text-ink truncate flex-1">
                            {cp.displayName}
                          </span>
                          <span className={`text-sm font-bold ${
                            cp.progressPercent === 0 ? 'text-muted' :
                            cp.progressPercent < 50 ? 'text-berry' :
                            cp.progressPercent < 100 ? 'text-sun' :
                            'text-mint'
                          }`}>
                            {cp.progressPercent}%
                          </span>
                        </div>
                        <div className="h-2 bg-surface rounded-full overflow-hidden mb-2">
                          <div 
                            className={`h-full transition-all ${
                              cp.progressPercent === 0 ? 'bg-muted' :
                              cp.progressPercent < 50 ? 'bg-berry' :
                              cp.progressPercent < 100 ? 'bg-sun' :
                              'bg-mint'
                            }`}
                            style={{ width: `${cp.progressPercent}%` }}
                          />
                        </div>
                        <div className="flex justify-between text-xs text-muted">
                          <span>{cp.completedWords} / {cp.totalWords} מילים</span>
                          <span>✓ {cp.correctWords} נכון</span>
                        </div>
                      </div>
                    ))}
                  </div>
                  {stat.categoryProgress.length === 0 && (
                    <p className="text-sm text-muted text-center py-4">
                      עדיין לא התחיל לשחק
                    </p>
                  )}
                </div>

                {/* כותרת תחתונה */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-ink">
                  <span className="text-xs text-muted">
                    פעילות אחרונה: {formatDate(stat.lastActivity)}
                  </span>
                  <button
                    onClick={() => handleViewDetails(stat.user)}
                    className="px-4 py-2 rounded-sm2 bg-sky/20 text-sky text-sm font-semibold hover:bg-sky/30 transition-colors"
                  >
                    📋 פירוט מילים
                  </button>
                </div>
              </div>
            ))}
            {stats.length === 0 && !isLoading && (
              <div className="rounded-md2 border border-dashed border-ink p-12 text-center">
                <p className="text-2xl mb-2">📭</p>
                <p className="text-muted">אין עדיין תלמידים עם פעילות</p>
              </div>
            )}
          </div>
        </div>

        {/* Modal - פירוט התקדמות */}
        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title={selectedUser ? `התקדמות: ${selectedUser.firstName} ${selectedUser.lastName}` : ''}
        >
          <div className="relative max-h-96 overflow-y-auto">
            {isDetailsLoading && <LoadingOverlay message="טוען פעילויות..." />}
            <Table>
              <TableHeader>
                <TableRow>
                  <TableCell header>מילה</TableCell>
                  <TableCell header>תשובה</TableCell>
                  <TableCell header>תוצאה</TableCell>
                  <TableCell header>זמן</TableCell>
                </TableRow>
              </TableHeader>
              <TableBody>
                {userProgress.map((p, idx) => (
                  <TableRow key={idx}>
                    <TableCell>
                      <div className="font-medium">{p.word?.en}</div>
                      <div className="text-sm text-muted">({p.word?.he})</div>
                    </TableCell>
                    <TableCell>
                      <span className={p.isCorrect ? 'text-ink' : 'text-berry'}>
                        {p.lastAnswer || '-'}
                      </span>
                    </TableCell>
                    <TableCell>
                      {p.isCorrect ? (
                        <span className="text-mint">✓ נכון</span>
                      ) : (
                        <span className="text-berry">✗ שגוי</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted">
                      {formatDate(p.answeredAt)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="mt-4">
            <Button onClick={() => setIsModalOpen(false)} className="w-full">
              סגור
            </Button>
          </div>
        </Modal>
      </div>
    </div>
  )
}


