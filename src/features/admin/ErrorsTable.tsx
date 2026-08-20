import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
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

  const errorsWithMistakes = errors.filter(e => e.wrongAttempts > 0)

  return (
    <div className="min-h-screen app-bg p-4 sm:p-6 md:p-8">
      <div className="max-w-5xl mx-auto">
        {loading && <LoadingOverlay fullscreen message="טוען ניתוח טעויות..." />}
        
        {/* כותרת */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.4em] text-muted">ממשק אדמין</p>
            <h1 className="text-3xl sm:text-5xl font-bold bg-surface bg-clip-text text-transparent">
              ניתוח טעויות 📊
            </h1>
            <p className="text-muted">צפייה בטעויות נפוצות ומי טעה בכל מילה</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={loadErrors}
              className="px-5 py-3 bg-sky text-ink rounded-sm2 font-semibold hover:bg-sky/90 transition-colors"
            >
              🔄 רענן
            </button>
            <Link to="/admin/dashboard">
              <button className="rounded-sm2 border border-ink px-5 py-3 text-sm font-semibold text-muted hover:text-ink hover:border-white/40 transition-all">
                ← חזרה
              </button>
            </Link>
          </div>
        </div>

        {errorMessage && !loading && (
          <div className="mb-6 rounded-sm2 border border-berry bg-berry p-4 text-berry">
            {errorMessage}
          </div>
        )}

        {/* סיכום */}
        {errorsWithMistakes.length > 0 && (
          <div className="mb-6 bg-surface rounded-md2 border border-ink p-4">
            <p className="text-muted text-center">
              נמצאו <span className="text-berry font-bold text-xl">{errorsWithMistakes.length}</span> מילים עם טעויות
            </p>
          </div>
        )}

        {/* רשימת טעויות */}
        <div className="space-y-4">
          {errorsWithMistakes.length === 0 ? (
            <div className="bg-surface rounded-md2 border border-ink p-12 text-center">
              <p className="text-2xl mb-2">🎉</p>
              <p className="text-muted text-lg">אין עדיין נתוני טעויות</p>
            </div>
          ) : (
            errorsWithMistakes.map((error, index) => (
              <div 
                key={index} 
                className="bg-surface rounded-md2 border border-ink p-5 hover:bg-surface transition-colors"
              >
                <div className="space-y-4">
                  {/* כותרת */}
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-xl font-bold text-sky">
                        {error.word} → {error.hebrewWord}
                      </h3>
                      <p className="text-sm text-muted">{error.category}</p>
                    </div>
                    <div className="text-center bg-berry px-4 py-2 rounded-sm2 border border-berry">
                      <div className="text-2xl font-bold text-berry">
                        {error.wrongAttempts}
                      </div>
                      <div className="text-xs text-berry">טעויות</div>
                    </div>
                  </div>

                  {/* סטטיסטיקות */}
                  <div className="grid grid-cols-3 gap-4 py-3 border-t border-b border-ink">
                    <div className="text-center">
                      <div className="text-lg font-bold text-ink">{error.totalAttempts}</div>
                      <div className="text-xs text-muted">סה"כ ניסיונות</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-mint">{error.usersWhoListened}</div>
                      <div className="text-xs text-muted">שמעו הקראה 🔉</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-sun">{error.usersWhoDidntListen}</div>
                      <div className="text-xs text-muted">לא שמעו 🔇</div>
                    </div>
                  </div>

                  {/* משתמשים שטעו */}
                  {error.usersWhoFailed.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold mb-2 text-ink">👥 מי טעה:</h4>
                      <div className="flex flex-wrap gap-2">
                        {error.usersWhoFailed.map((user, i) => (
                          <div
                            key={i}
                            className="bg-berry border border-berry px-3 py-2 rounded-lg"
                            title={`תשובה אחרונה: "${user.lastAnswer}"`}
                          >
                            <span className="font-medium text-ink">{user.name}</span>
                            <span className="text-xs text-berry mr-2">({user.attempts} טעויות)</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* טעויות נפוצות */}
                  {error.commonErrors.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold mb-2 text-ink">❌ תשובות שגויות נפוצות:</h4>
                      <div className="space-y-1">
                        {error.commonErrors.map((err, i) => (
                          <div
                            key={i}
                            className="flex justify-between items-center bg-berry border border-berry px-3 py-2 rounded-lg"
                          >
                            <span className="font-medium text-berry">"{err.answer}"</span>
                            <span className="text-sm text-muted">{err.count} פעמים</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* המלצות */}
                  {error.usersWhoDidntListen > error.usersWhoListened && (
                    <div className="bg-sun border border-sun rounded-lg p-3">
                      <p className="text-sm text-sun">
                        💡 <strong>המלצה:</strong> רוב התלמידים לא שמעו את ההקראה. 
                        כדאי לעודד שימוש בכפתור ההשמעה!
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

