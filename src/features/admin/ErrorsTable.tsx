import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { Card } from '../../shared/ui/Card'
import { LoadingOverlay } from '../../shared/ui/LoadingOverlay'

type ErrorStat = {
  word: string
  hebrewWord: string
  category: string
  totalAttempts: number
  wrongAttempts: number
  commonErrors: { answer: string; count: number }[]
  usersWhoListened: number
  usersWhoDidntListen: number
  usersWhoFailed: { name: string; attempts: number; lastAnswer: string }[]
}

export default function ErrorsTable() {
  const [errors, setErrors] = useState<ErrorStat[]>([])
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    loadErrors()
  }, [])

  const loadErrors = async () => {
    try {
      setErrorMessage(null)
      const { data: allProgress } = await supabase.from('worder_progress').select('*')
      const { data: allWords } = await supabase.from('worder_words').select('*')
      const { data: allCategories } = await supabase.from('worder_categories').select('*')
      const { data: allUsers } = await supabase.from('worder_profiles').select('id, first_name, last_name')

      if (!allProgress || !allWords || !allCategories || !allUsers) return

      // מיפוי משתמשים
      const userMap = new Map<string, string>()
      allUsers.forEach((u: any) => {
        userMap.set(u.id, `${u.first_name} ${u.last_name}`)
      })

      // קיבוץ לפי מילה
      const wordStats = new Map<number, {
        wordId: number
        totalAttempts: number
        wrongAttempts: number
        wrongAnswers: string[]
        listenedCount: number
        notListenedCount: number
        failedUsers: Map<string, { attempts: number; lastAnswer: string }>
      }>()

      allProgress.forEach(p => {
        if (!wordStats.has(p.word_id)) {
          wordStats.set(p.word_id, {
            wordId: p.word_id,
            totalAttempts: 0,
            wrongAttempts: 0,
            wrongAnswers: [],
            listenedCount: 0,
            notListenedCount: 0,
            failedUsers: new Map()
          })
        }

        const stat = wordStats.get(p.word_id)!
        stat.totalAttempts++
        
        if (!p.is_correct) {
          stat.wrongAttempts++
          if (p.wrong_answers && p.wrong_answers.length > 0) {
            stat.wrongAnswers.push(...p.wrong_answers)
            
            // שמירת המשתמש שטעה
            const existing = stat.failedUsers.get(p.user_id)
            if (existing) {
              existing.attempts++
              existing.lastAnswer = p.wrong_answers[p.wrong_answers.length - 1]
            } else {
              stat.failedUsers.set(p.user_id, {
                attempts: 1,
                lastAnswer: p.wrong_answers[p.wrong_answers.length - 1]
              })
            }
          }
        }

        if (p.audio_played) {
          stat.listenedCount++
        } else {
          stat.notListenedCount++
        }
      })

      // המרה לפורמט תצוגה
      const errorStats: ErrorStat[] = []
      
      wordStats.forEach((stat, wordId) => {
        const word = allWords.find(w => w.id === wordId)
        if (!word) return

        const category = allCategories.find(c => c.id === word.category_id)
        
        // ספירת תשובות שגויות נפוצות
        const errorCounts = new Map<string, number>()
        stat.wrongAnswers.forEach(ans => {
          errorCounts.set(ans, (errorCounts.get(ans) || 0) + 1)
        })

        const commonErrors = Array.from(errorCounts.entries())
          .map(([answer, count]) => ({ answer, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 5)

        // רשימת משתמשים שטעו
        const usersWhoFailed = Array.from(stat.failedUsers.entries()).map(([userId, data]) => ({
          name: userMap.get(userId) || 'לא ידוע',
          attempts: data.attempts,
          lastAnswer: data.lastAnswer
        })).sort((a, b) => b.attempts - a.attempts)

        errorStats.push({
          word: word.en,
          hebrewWord: word.he,
          category: category?.name || 'לא ידוע',
          totalAttempts: stat.totalAttempts,
          wrongAttempts: stat.wrongAttempts,
          commonErrors,
          usersWhoListened: stat.listenedCount,
          usersWhoDidntListen: stat.notListenedCount,
          usersWhoFailed
        })
      })

      // מיון לפי כמות טעויות (הכי הרבה טעויות בראש)
      errorStats.sort((a, b) => b.wrongAttempts - a.wrongAttempts)
      
      setErrors(errorStats)
      setLoading(false)
    } catch (error) {
      console.error('Error loading error stats:', error)
      setErrorMessage('טעינת נתוני הטעויות נכשלה.')
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4 relative">
      {loading && <LoadingOverlay message="טוען ניתוח טעויות..." />}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-white">ניתוח טעויות ומעקב לימוד</h2>
          <p className="text-white/60 text-sm mt-1">צפייה בטעויות נפוצות ומי טעה בכל מילה</p>
        </div>
        <button
          onClick={loadErrors}
          className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
        >
          🔄 רענן נתונים
        </button>
      </div>

      {errorMessage && !loading && (
        <Card className="border border-red-400/40 bg-red-500/10 text-red-100">
          {errorMessage}
        </Card>
      )}

      <div className="grid gap-4">
        {errors.length === 0 ? (
          <Card>
            <p className="text-center text-white/60">אין עדיין נתוני טעויות</p>
          </Card>
        ) : (
          errors.filter(e => e.wrongAttempts > 0).map((error, index) => (
            <Card key={index} className="hover:shadow-lg transition-shadow bg-white/5 border border-white/10">
              <div className="space-y-4">
                {/* כותרת */}
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-xl font-bold text-primary">
                      {error.word} → {error.hebrewWord}
                    </h3>
                    <p className="text-sm text-white/60">{error.category}</p>
                  </div>
                  <div className="text-left bg-red-500/20 px-4 py-2 rounded-xl">
                    <div className="text-2xl font-bold text-red-400">
                      {error.wrongAttempts}
                    </div>
                    <div className="text-xs text-red-300">טעויות</div>
                  </div>
                </div>

                {/* סטטיסטיקות */}
                <div className="grid grid-cols-3 gap-4 py-3 border-t border-b border-white/10">
                  <div className="text-center">
                    <div className="text-lg font-bold text-white">{error.totalAttempts}</div>
                    <div className="text-xs text-white/60">סה"כ ניסיונות</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-green-400">{error.usersWhoListened}</div>
                    <div className="text-xs text-white/60">שמעו הקראה 🔉</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-orange-400">{error.usersWhoDidntListen}</div>
                    <div className="text-xs text-white/60">לא שמעו 🔇</div>
                  </div>
                </div>

                {/* משתמשים שטעו */}
                {error.usersWhoFailed.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold mb-2 text-white">👥 מי טעה:</h4>
                    <div className="flex flex-wrap gap-2">
                      {error.usersWhoFailed.map((user, i) => (
                        <div
                          key={i}
                          className="bg-red-500/20 border border-red-400/40 px-3 py-2 rounded-lg"
                          title={`תשובה אחרונה: "${user.lastAnswer}"`}
                        >
                          <span className="font-medium text-white">{user.name}</span>
                          <span className="text-xs text-red-300 mr-2">({user.attempts} טעויות)</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* טעויות נפוצות */}
                {error.commonErrors.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold mb-2 text-white">❌ תשובות שגויות נפוצות:</h4>
                    <div className="space-y-1">
                      {error.commonErrors.map((err, i) => (
                        <div
                          key={i}
                          className="flex justify-between items-center bg-red-500/10 border border-red-400/30 px-3 py-2 rounded"
                        >
                          <span className="font-medium text-red-300">"{err.answer}"</span>
                          <span className="text-sm text-white/60">{err.count} פעמים</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* המלצות */}
                {error.usersWhoDidntListen > error.usersWhoListened && (
                  <div className="bg-orange-500/20 border border-orange-400/40 rounded p-3">
                    <p className="text-sm text-orange-200">
                      💡 <strong>המלצה:</strong> רוב התלמידים לא שמעו את ההקראה. 
                      כדאי לעודד שימוש בכפתור ההשמעה!
                    </p>
                  </div>
                )}
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}

