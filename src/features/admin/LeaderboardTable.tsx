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
    <div className="min-h-screen bg-gradient-to-b from-[#050A1C] to-[#0b1c3a] p-4 sm:p-6 md:p-8">
      <div className="max-w-6xl mx-auto">
        {isLoading && <LoadingOverlay fullscreen message="טוען דירוג..." />}
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.4em] text-white/60">ממשק אדמין</p>
            <h1 className="text-3xl sm:text-5xl font-black bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent">
              דירוג תלמידים 🏆
            </h1>
            <p className="text-white/60">צפייה בהתקדמות ודירוג כל התלמידים</p>
          </div>
          <Link to="/admin/dashboard">
            <button className="rounded-xl border border-white/20 px-5 py-3 text-sm font-semibold text-white/80 hover:text-white hover:border-white/40 transition-all">
              ← חזרה לדשבורד
            </button>
          </Link>
        </div>

        {/* Filters */}
        <div className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 p-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Category Filter */}
            <div className="flex-1">
              <label className="block text-sm text-white/70 mb-2">סנן לפי קטגוריה:</label>
              <select
                value={selectedCategory || ''}
                onChange={(e) => setSelectedCategory(e.target.value ? Number(e.target.value) : null)}
                className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary"
              >
                <option value="">כל הקטגוריות</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.display_name}</option>
                ))}
              </select>
            </div>
            
            {/* Sort Field */}
            <div className="flex-1">
              <label className="block text-sm text-white/70 mb-2">מיין לפי:</label>
              <select
                value={sortField}
                onChange={(e) => setSortField(e.target.value as SortField)}
                className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary"
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
          <span className="text-white/60">
            מציג <span className="text-primary font-bold">{sortedStudents.length}</span> תלמידים
          </span>
        </div>

        {/* Leaderboard */}
        <div className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 overflow-hidden">
          {sortedStudents.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-2xl mb-2">📭</p>
              <p className="text-white/60">אין נתונים להצגה</p>
            </div>
          ) : (
            <div className="divide-y divide-white/10">
              {sortedStudents.map((student, index) => (
                <div 
                  key={student.id}
                  className={`flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 hover:bg-white/5 transition-colors ${
                    index === 0 ? 'bg-yellow-500/10' :
                    index === 1 ? 'bg-gray-400/10' :
                    index === 2 ? 'bg-orange-500/10' : ''
                  }`}
                >
                  <div className="flex items-center gap-4 mb-3 sm:mb-0">
                    <span className={`text-3xl w-12 text-center ${index < 3 ? '' : 'text-white/50 text-xl'}`}>
                      {getMedal(index)}
                    </span>
                    <div>
                      <p className="font-bold text-white text-lg">{student.name}</p>
                      <p className="text-sm text-white/50">פעיל לאחרונה: {formatDate(student.lastActive)}</p>
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap gap-3 sm:gap-6 mr-16 sm:mr-0">
                    <div className="text-center">
                      <p className={`text-xl font-bold ${sortField === 'wordsLearned' ? 'text-green-400' : 'text-white'}`}>
                        {student.wordsLearned}
                      </p>
                      <p className="text-xs text-white/50">מילים</p>
                    </div>
                    <div className="text-center">
                      <p className={`text-xl font-bold ${sortField === 'successRate' ? 'text-blue-400' : 'text-white'}`}>
                        {student.successRate}%
                      </p>
                      <p className="text-xs text-white/50">הצלחה</p>
                    </div>
                    <div className="text-center">
                      <p className={`text-xl font-bold ${sortField === 'bestStreak' ? 'text-orange-400' : 'text-white'}`}>
                        🔥 {student.bestStreak}
                      </p>
                      <p className="text-xs text-white/50">רצף</p>
                    </div>
                    <div className="text-center">
                      <p className={`text-xl font-bold ${sortField === 'totalAttempts' ? 'text-purple-400' : 'text-white'}`}>
                        {student.totalAttempts}
                      </p>
                      <p className="text-xs text-white/50">ניסיונות</p>
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

