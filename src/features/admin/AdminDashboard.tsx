import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAdmin } from '../../store/useAdmin'
import { Card } from '../../shared/ui/Card'
import { Button } from '../../shared/ui/Button'
import { supabase } from '../../lib/supabase'
import { LoadingOverlay } from '../../shared/ui/LoadingOverlay'

interface DashboardStats {
  totalUsers: number
  activeToday: number
  activeThisWeek: number
  totalWordsLearned: number
  overallSuccessRate: number
}

interface TopStudent {
  id: string
  name: string
  wordsLearned: number
  successRate: number
  streak: number
}

export default function AdminDashboard() {
  const nav = useNavigate()
  const { isAuthenticated, logout } = useAdmin()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [topStudents, setTopStudents] = useState<TopStudent[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!isAuthenticated) {
      nav('/admin')
      return
    }
    loadDashboardData()
  }, [isAuthenticated, nav])

  const loadDashboardData = async () => {
    try {
      setIsLoading(true)
      
      // Get all users
      const { data: users } = await supabase
        .from('worder_profiles')
        .select('id, first_name, last_name, created_at')
      
      // Get all progress records
      const { data: progress } = await supabase
        .from('worder_progress')
        .select('user_id, is_correct, created_at, streak')
      
      if (!users || !progress) {
        setIsLoading(false)
        return
      }

      const now = new Date()
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      const weekStart = new Date(todayStart)
      weekStart.setDate(weekStart.getDate() - 7)

      // Calculate stats
      const totalUsers = users.length
      
      // Active users (users with progress entries)
      const usersWithProgressToday = new Set(
        progress
          .filter(p => new Date(p.created_at) >= todayStart)
          .map(p => p.user_id)
      )
      const usersWithProgressThisWeek = new Set(
        progress
          .filter(p => new Date(p.created_at) >= weekStart)
          .map(p => p.user_id)
      )
      
      const activeToday = usersWithProgressToday.size
      const activeThisWeek = usersWithProgressThisWeek.size
      
      // Total words learned (correct answers)
      const totalWordsLearned = progress.filter(p => p.is_correct).length
      
      // Overall success rate
      const totalAttempts = progress.length
      const overallSuccessRate = totalAttempts > 0 
        ? Math.round((totalWordsLearned / totalAttempts) * 100) 
        : 0

      setStats({
        totalUsers,
        activeToday,
        activeThisWeek,
        totalWordsLearned,
        overallSuccessRate
      })

      // Calculate top 5 students
      const userStats = new Map<string, { correct: number; total: number; streak: number; name: string }>()
      
      users.forEach(u => {
        userStats.set(u.id, {
          correct: 0,
          total: 0,
          streak: 0,
          name: `${u.first_name} ${u.last_name}`
        })
      })

      progress.forEach(p => {
        const stat = userStats.get(p.user_id)
        if (stat) {
          stat.total++
          if (p.is_correct) stat.correct++
          if (p.streak && p.streak > stat.streak) stat.streak = p.streak
        }
      })

      const topStudentsData: TopStudent[] = Array.from(userStats.entries())
        .map(([id, stat]) => ({
          id,
          name: stat.name,
          wordsLearned: stat.correct,
          successRate: stat.total > 0 ? Math.round((stat.correct / stat.total) * 100) : 0,
          streak: stat.streak
        }))
        .filter(s => s.wordsLearned > 0)
        .sort((a, b) => b.wordsLearned - a.wordsLearned)
        .slice(0, 5)

      setTopStudents(topStudentsData)
      setIsLoading(false)
    } catch (error) {
      console.error('Error loading dashboard data:', error)
      setIsLoading(false)
    }
  }

  if (!isAuthenticated) {
    return null
  }

  const handleLogout = () => {
    logout()
    nav('/admin')
  }

  const sections = [
    { to: '/admin/words', title: 'ניהול מילים', emoji: '📝' },
    { to: '/admin/users', title: 'ניהול משתמשים', emoji: '👥' },
    { to: '/admin/categories', title: 'ניהול קטגוריות', emoji: '📂', highlight: true },
    { to: '/admin/leaderboard', title: 'דירוג תלמידים', emoji: '🏆', highlight: true },
    { to: '/admin/progress', title: 'התקדמות תלמידים', emoji: '📊' },
    { to: '/admin/errors', title: 'ניתוח טעויות', emoji: '🔍' },
    { to: '/admin/recordings', title: 'הקלטות מישל', emoji: '🎤' },
    { to: '/admin/rewards', title: 'ניהול מתנות', emoji: '🎁' },
    { to: '/admin/backup', title: 'גיבוי ושחזור', emoji: '💾' }
  ]

  const getMedal = (index: number) => {
    if (index === 0) return '🥇'
    if (index === 1) return '🥈'
    if (index === 2) return '🥉'
    return `${index + 1}.`
  }

  return (
    <div className="min-h-screen app-bg p-4 sm:p-6 text-ink">
      {isLoading && <LoadingOverlay fullscreen message="טוען נתונים..." />}
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.4em] text-muted mb-2">WordQuest</p>
            <h1 className="text-4xl sm:text-5xl font-extrabold leading-tight bg-surface bg-clip-text text-transparent">
              דשבורד אדמין
            </h1>
            <p className="text-sm text-muted mt-1">
              ניהול משתמשים, קטגוריות, פרסים והתקדמות במקום אחד.
            </p>
          </div>
          <Button variant="danger" onClick={handleLogout} className="w-full sm:w-auto justify-center">
            יציאה
          </Button>
        </div>

        {/* Statistics Cards */}
        {stats && (
          <div className="grid gap-4 grid-cols-2 lg:grid-cols-5">
            <div className="bg-surface rounded-md2 border border-sky p-4 text-center">
              <div className="text-3xl font-bold text-sky">{stats.totalUsers}</div>
              <div className="text-sm text-muted mt-1">משתמשים רשומים</div>
            </div>
            <div className="bg-surface rounded-md2 border border-mint p-4 text-center">
              <div className="text-3xl font-bold text-mint">{stats.activeToday}</div>
              <div className="text-sm text-muted mt-1">פעילים היום</div>
            </div>
            <div className="bg-surface rounded-md2 border border-sky p-4 text-center">
              <div className="text-3xl font-bold text-sky">{stats.activeThisWeek}</div>
              <div className="text-sm text-muted mt-1">פעילים השבוע</div>
            </div>
            <div className="bg-surface rounded-md2 border border-sun p-4 text-center">
              <div className="text-3xl font-bold text-sun">{stats.totalWordsLearned}</div>
              <div className="text-sm text-muted mt-1">מילים נלמדו</div>
            </div>
            <div className="col-span-2 lg:col-span-1 bg-surface rounded-md2 border border-berry p-4 text-center">
              <div className="text-3xl font-bold text-berry">{stats.overallSuccessRate}%</div>
              <div className="text-sm text-muted mt-1">אחוז הצלחה</div>
            </div>
          </div>
        )}

        {/* Top 5 Students */}
        {topStudents.length > 0 && (
          <div className="bg-surface rounded-md2 border border-ink p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-ink flex items-center gap-2">
                🏆 טופ 5 תלמידים
              </h2>
              <Link to="/admin/leaderboard" className="text-sm text-sky hover:underline">
                צפה בדירוג המלא →
              </Link>
            </div>
            <div className="space-y-2">
              {topStudents.map((student, index) => (
                <div 
                  key={student.id}
                  className={`flex items-center justify-between p-3 rounded-sm2 transition-colors ${
                    index === 0 ? 'bg-sun border border-sun' :
                    index === 1 ? 'bg-muted border border-muted' :
                    index === 2 ? 'bg-sun border border-sun' :
                    'bg-surface border border-ink'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl w-8">{getMedal(index)}</span>
                    <span className="font-semibold text-ink">{student.name}</span>
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <span className="text-mint">{student.wordsLearned} מילים</span>
                    <span className="text-sky">{student.successRate}%</span>
                    <span className="text-sun">🔥 {student.streak}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Navigation Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sections.map(sec => (
            <Link key={sec.to} to={sec.to} className="focus:outline-none">
              <Card
                className={`h-full cursor-pointer overflow-hidden border border-ink bg-surface p-5  transition-all hover:-translate-y-1 hover:border-sky/60 hover:bg-surface ${
                  sec.highlight ? 'ring-2 ring-sky/40' : ''
                }`}
              >
                <div className="text-4xl mb-4">{sec.emoji}</div>
                <div className="text-xl font-bold mb-1">{sec.title}</div>
                <p className="text-sm text-muted">
                  {sec.highlight ? 'חדש!' : 'לחצו לניהול מהיר'}
                </p>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}

