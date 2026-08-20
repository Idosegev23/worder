import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAdmin } from '../../store/useAdmin'
import { supabase } from '../../lib/supabase'
import { LoadingOverlay } from '../../shared/ui/LoadingOverlay'

interface StudentRank {
  id: string
  name: string
  wordsLearned: number
  totalAttempts: number
  successRate: number
  bestStreak: number
  lastActive: string
}

interface Category {
  id: number
  name: string
  display_name: string
}

type SortField = 'wordsLearned' | 'successRate' | 'bestStreak' | 'totalAttempts'

export default function LeaderboardTable() {
  const nav = useNavigate()
  const isAuth = useAdmin(s => s.isAuthenticated)
  const [students, setStudents] = useState<StudentRank[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null)
  const [sortField, setSortField] = useState<SortField>('wordsLearned')
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!isAuth) {
      nav('/admin')
      return
    }
    loadData()
  }, [isAuth, nav])

  useEffect(() => {
    if (isAuth) {
      loadLeaderboard()
    }
  }, [selectedCategory, isAuth])

  const loadData = async () => {
    try {
      // Load categories
      const { data: cats } = await supabase
        .from('worder_categories')
        .select('id, name, display_name')
        .order('display_order')
      
      if (cats) {
        setCategories(cats)
      }
      
      await loadLeaderboard()
    } catch (error) {
      console.error('Error loading data:', error)
      setIsLoading(false)
    }
  }

  const loadLeaderboard = async () => {
    try {
      setIsLoading(true)
      
      // Get all users
      const { data: users } = await supabase
        .from('worder_profiles')
        .select('id, first_name, last_name')
        .neq('role', 'admin')
      
      // Get progress with optional category filter
      let progressQuery = supabase
        .from('worder_progress')
        .select('user_id, word_id, is_correct, streak, created_at, worder_words!inner(category_id)')
      
      if (selectedCategory) {
        progressQuery = progressQuery.eq('worder_words.category_id', selectedCategory)
      }
      
      const { data: progress } = await progressQuery

      if (!users || !progress) {
        setIsLoading(false)
        return
      }

      // Calculate stats per user
      const userStats = new Map<string, {
        correct: number
        total: number
        bestStreak: number
        lastActive: Date
        name: string
      }>()

      users.forEach(u => {
        userStats.set(u.id, {
          correct: 0,
          total: 0,
          bestStreak: 0,
          lastActive: new Date(0),
          name: `${u.first_name} ${u.last_name}`
        })
      })

      progress.forEach((p: any) => {
        const stat = userStats.get(p.user_id)
        if (stat) {
          stat.total++
          if (p.is_correct) stat.correct++
          if (p.streak && p.streak > stat.bestStreak) stat.bestStreak = p.streak
          const createdAt = new Date(p.created_at)
          if (createdAt > stat.lastActive) stat.lastActive = createdAt
        }
      })

      const leaderboard: StudentRank[] = Array.from(userStats.entries())
        .map(([id, stat]) => ({
          id,
          name: stat.name,
          wordsLearned: stat.correct,
          totalAttempts: stat.total,
          successRate: stat.total > 0 ? Math.round((stat.correct / stat.total) * 100) : 0,
          bestStreak: stat.bestStreak,
          lastActive: stat.lastActive.toISOString()
        }))
        .filter(s => s.totalAttempts > 0)

      setStudents(leaderboard)
      setIsLoading(false)
    } catch (error) {
      console.error('Error loading leaderboard:', error)
      setIsLoading(false)
    }
  }

  const sortedStudents = [...students].sort((a, b) => {
    return b[sortField] - a[sortField]
  })

  const getMedal = (index: number) => {
    if (index === 0) return '🥇'
    if (index === 1) return '🥈'
    if (index === 2) return '🥉'
    return `${index + 1}`
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    if (date.getTime() === 0) return 'אף פעם'
    return date.toLocaleDateString('he-IL', { day: 'numeric', month: 'short' })
  }

  return (
    <div className="min-h-screen app-bg p-4 sm:p-6 md:p-8">
      <div className="max-w-6xl mx-auto">
        {isLoading && <LoadingOverlay fullscreen message="טוען דירוג..." />}
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.4em] text-muted">ממשק אדמין</p>
            <h1 className="text-3xl sm:text-5xl font-bold bg-surface bg-clip-text text-transparent">
              דירוג תלמידים 🏆
            </h1>
            <p className="text-muted">צפייה בהתקדמות ודירוג כל התלמידים</p>
          </div>
          <Link to="/admin/dashboard">
            <button className="rounded-sm2 border border-ink px-5 py-3 text-sm font-semibold text-muted hover:text-ink hover:border-white/40 transition-all">
              ← חזרה לדשבורד
            </button>
          </Link>
        </div>

        {/* Filters */}
        <div className="bg-surface rounded-md2 border border-ink p-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Category Filter */}
            <div className="flex-1">
              <label className="block text-sm text-muted mb-2">סנן לפי קטגוריה:</label>
              <select
                value={selectedCategory || ''}
                onChange={(e) => setSelectedCategory(e.target.value ? Number(e.target.value) : null)}
                className="w-full bg-surface border border-ink rounded-sm2 px-4 py-3 text-ink focus:outline-none focus:border-sky"
              >
                <option value="">כל הקטגוריות</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.display_name}</option>
                ))}
              </select>
            </div>
            
            {/* Sort Field */}
            <div className="flex-1">
              <label className="block text-sm text-muted mb-2">מיין לפי:</label>
              <select
                value={sortField}
                onChange={(e) => setSortField(e.target.value as SortField)}
                className="w-full bg-surface border border-ink rounded-sm2 px-4 py-3 text-ink focus:outline-none focus:border-sky"
              >
                <option value="wordsLearned">מילים שנלמדו</option>
                <option value="successRate">אחוז הצלחה</option>
                <option value="bestStreak">רצף הכי טוב</option>
                <option value="totalAttempts">סה"כ ניסיונות</option>
              </select>
            </div>
          </div>
        </div>

        {/* Summary */}
        <div className="mb-6 text-center">
          <span className="text-muted">
            מציג <span className="text-sky font-bold">{sortedStudents.length}</span> תלמידים
          </span>
        </div>

        {/* Leaderboard */}
        <div className="bg-surface rounded-md2 border border-ink overflow-hidden">
          {sortedStudents.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-2xl mb-2">📭</p>
              <p className="text-muted">אין נתונים להצגה</p>
            </div>
          ) : (
            <div className="divide-y divide-white/10">
              {sortedStudents.map((student, index) => (
                <div 
                  key={student.id}
                  className={`flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 hover:bg-surface transition-colors ${
                    index === 0 ? 'bg-sun' :
                    index === 1 ? 'bg-muted' :
                    index === 2 ? 'bg-sun' : ''
                  }`}
                >
                  <div className="flex items-center gap-4 mb-3 sm:mb-0">
                    <span className={`text-3xl w-12 text-center ${index < 3 ? '' : 'text-muted text-xl'}`}>
                      {getMedal(index)}
                    </span>
                    <div>
                      <p className="font-bold text-ink text-lg">{student.name}</p>
                      <p className="text-sm text-muted">פעיל לאחרונה: {formatDate(student.lastActive)}</p>
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap gap-3 sm:gap-6 mr-16 sm:mr-0">
                    <div className="text-center">
                      <p className={`text-xl font-bold ${sortField === 'wordsLearned' ? 'text-mint' : 'text-ink'}`}>
                        {student.wordsLearned}
                      </p>
                      <p className="text-xs text-muted">מילים</p>
                    </div>
                    <div className="text-center">
                      <p className={`text-xl font-bold ${sortField === 'successRate' ? 'text-sky' : 'text-ink'}`}>
                        {student.successRate}%
                      </p>
                      <p className="text-xs text-muted">הצלחה</p>
                    </div>
                    <div className="text-center">
                      <p className={`text-xl font-bold ${sortField === 'bestStreak' ? 'text-sun' : 'text-ink'}`}>
                        🔥 {student.bestStreak}
                      </p>
                      <p className="text-xs text-muted">רצף</p>
                    </div>
                    <div className="text-center">
                      <p className={`text-xl font-bold ${sortField === 'totalAttempts' ? 'text-sky' : 'text-ink'}`}>
                        {student.totalAttempts}
                      </p>
                      <p className="text-xs text-muted">ניסיונות</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

