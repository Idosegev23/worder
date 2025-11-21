import { useEffect, useState } from 'react'
import { Progress, Profile, Word, supabase, getAllWords } from '../../lib/supabase'
import { Link, useNavigate } from 'react-router-dom'
import { useAdmin } from '../../store/useAdmin'
import { Card } from '../../shared/ui/Card'
import { Button } from '../../shared/ui/Button'
import { Table, TableHeader, TableBody, TableRow, TableCell } from '../../shared/ui/Table'
import { Modal } from '../../shared/ui/Modal'
import { LoadingOverlay } from '../../shared/ui/LoadingOverlay'

type StudentStats = {
  user: Profile
  totalAttempts: number
  correctAnswers: number
  wrongAnswers: number
  successRate: number
  lastActivity: string
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
      
      if (!users) return
      
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
          lastActivity
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
    <div className="min-h-screen p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-muted mb-1">מעקב</p>
            <h1 className="text-3xl md:text-4xl font-extrabold text-primary leading-tight">התקדמות תלמידים</h1>
          </div>
          <Link to="/admin/dashboard" className="w-full md:w-auto">
            <Button variant="secondary" className="w-full md:w-auto justify-center">
              חזרה לדשבורד
            </Button>
          </Link>
        </div>

        <Card className="mb-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between text-sm text-muted">
            <span>סה״כ {stats.length} תלמידים</span>
            <span>{stats.reduce((sum, s) => sum + s.totalAttempts, 0)} ניסיונות</span>
          </div>
        </Card>

        <Card className="relative overflow-hidden">
          {isLoading && <LoadingOverlay message="טוען סטטיסטיקות..." />}
          {error && !isLoading && (
            <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-100">
              {error}
            </div>
          )}
          <div className="hidden lg:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableCell header>תלמיד</TableCell>
                  <TableCell header>שם משתמש</TableCell>
                  <TableCell header>ניסיונות</TableCell>
                  <TableCell header>נכונות</TableCell>
                  <TableCell header>שגיאות</TableCell>
                  <TableCell header>% הצלחה</TableCell>
                  <TableCell header>פעילות אחרונה</TableCell>
                  <TableCell header>פעולות</TableCell>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stats.map(stat => (
                  <TableRow key={stat.user.id}>
                    <TableCell>
                      {stat.user.firstName} {stat.user.lastName}
                    </TableCell>
                    <TableCell>{stat.user.username}</TableCell>
                    <TableCell>{stat.totalAttempts}</TableCell>
                    <TableCell>
                      <span className="text-accent font-medium">{stat.correctAnswers}</span>
                    </TableCell>
                    <TableCell>
                      <span className="text-danger font-medium">{stat.wrongAnswers}</span>
                    </TableCell>
                    <TableCell>
                      <span
                        className={`font-bold ${
                          stat.successRate >= 80
                            ? 'text-accent'
                            : stat.successRate >= 60
                            ? 'text-secondary'
                            : 'text-danger'
                        }`}
                      >
                        {stat.successRate.toFixed(1)}%
                      </span>
                    </TableCell>
                    <TableCell className="text-sm text-muted">
                      {formatDate(stat.lastActivity)}
                    </TableCell>
                    <TableCell>
                      <button
                        onClick={() => handleViewDetails(stat.user)}
                        className="text-secondary hover:underline text-sm"
                      >
                        פירוט מלא
                      </button>
                    </TableCell>
                  </TableRow>
                ))}
                {stats.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted py-8">
                      אין עדיין תלמידים עם פעילות
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          <div className="lg:hidden space-y-4">
            {stats.map(stat => (
              <div key={stat.user.id} className="rounded-2xl border border-white/10 bg-bg/80 p-4 shadow-lg">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase text-muted tracking-widest">תלמיד</p>
                    <p className="text-lg font-bold text-primary">
                      {stat.user.firstName} {stat.user.lastName}
                    </p>
                    <p className="text-sm text-muted">@{stat.user.username}</p>
                  </div>
                  <span
                    className={`text-lg font-extrabold ${
                      stat.successRate >= 80
                        ? 'text-accent'
                        : stat.successRate >= 60
                        ? 'text-secondary'
                        : 'text-danger'
                    }`}
                  >
                    {stat.successRate.toFixed(0)}%
                  </span>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-3 text-center text-sm">
                  <div>
                    <p className="text-xs uppercase text-muted">ניסיונות</p>
                    <p className="text-lg font-bold">{stat.totalAttempts}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase text-muted">נכונים</p>
                    <p className="text-lg font-bold text-accent">{stat.correctAnswers}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase text-muted">שגויים</p>
                    <p className="text-lg font-bold text-danger">{stat.wrongAnswers}</p>
                  </div>
                </div>
                <div className="mt-3 text-xs text-muted">
                  פעילות אחרונה: {formatDate(stat.lastActivity)}
                </div>
                <button
                  onClick={() => handleViewDetails(stat.user)}
                  className="mt-4 w-full rounded-xl border border-secondary/40 py-2 text-sm font-semibold text-secondary"
                >
                  פירוט מלא
                </button>
              </div>
            ))}
            {stats.length === 0 && !isLoading && (
              <div className="rounded-2xl border border-dashed border-white/20 p-6 text-center text-muted">
                אין עדיין תלמידים עם פעילות
              </div>
            )}
          </div>
        </Card>

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
                      <span className={p.isCorrect ? 'text-text' : 'text-danger'}>
                        {p.lastAnswer || '-'}
                      </span>
                    </TableCell>
                    <TableCell>
                      {p.isCorrect ? (
                        <span className="text-accent">✓ נכון</span>
                      ) : (
                        <span className="text-danger">✗ שגוי</span>
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


