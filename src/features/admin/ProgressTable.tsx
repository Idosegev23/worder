import { useEffect, useState } from 'react'
import { Progress, Profile, Word, supabase, getAllWords } from '../../lib/supabase'
import { Link, useNavigate } from 'react-router-dom'
import { useAdmin } from '../../store/useAdmin'
import { Card } from '../../shared/ui/Card'
import { Button } from '../../shared/ui/Button'
import { Table, TableHeader, TableBody, TableRow, TableCell } from '../../shared/ui/Table'
import { Modal } from '../../shared/ui/Modal'

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

  useEffect(() => {
    if (!isAuth) {
      nav('/admin')
      return
    }
    loadStats()
  }, [isAuth, nav])

  const loadStats = async () => {
    try {
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
    }
  }

  const handleViewDetails = async (user: Profile) => {
    setSelectedUser(user)
    
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
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">התקדמות תלמידים</h1>
          <Link to="/admin/dashboard">
            <Button variant="secondary">חזרה</Button>
          </Link>
        </div>

        <Card className="mb-6">
          <div className="text-muted text-sm">
            סה״כ {stats.length} תלמידים • {stats.reduce((sum, s) => sum + s.totalAttempts, 0)} ניסיונות
          </div>
        </Card>

        <Card>
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
        </Card>

        {/* Modal - פירוט התקדמות */}
        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title={selectedUser ? `התקדמות: ${selectedUser.firstName} ${selectedUser.lastName}` : ''}
        >
          <div className="max-h-96 overflow-y-auto">
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


