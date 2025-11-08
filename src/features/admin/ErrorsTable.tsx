import { useEffect, useState } from 'react'
import { db } from '../../lib/db'
import { Card } from '../../shared/ui/Card'

type ErrorStat = {
  word: string
  hebrewWord: string
  category: string
  totalAttempts: number
  wrongAttempts: number
  commonErrors: { answer: string; count: number }[]
  usersWhoListened: number
  usersWhoDidntListen: number
}

export default function ErrorsTable() {
  const [errors, setErrors] = useState<ErrorStat[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadErrors()
  }, [])

  const loadErrors = async () => {
    try {
      const allProgress = await db.progress.toArray()
      const allWords = await db.words.toArray()
      const allCategories = await db.categories.toArray()

      // קיבוץ לפי מילה
      const wordStats = new Map<number, {
        wordId: number
        totalAttempts: number
        wrongAttempts: number
        wrongAnswers: string[]
        listenedCount: number
        notListenedCount: number
      }>()

      allProgress.forEach(p => {
        if (!wordStats.has(p.wordId)) {
          wordStats.set(p.wordId, {
            wordId: p.wordId,
            totalAttempts: 0,
            wrongAttempts: 0,
            wrongAnswers: [],
            listenedCount: 0,
            notListenedCount: 0
          })
        }

        const stat = wordStats.get(p.wordId)!
        stat.totalAttempts++
        
        if (!p.isCorrect) {
          stat.wrongAttempts++
          if (p.wrongAnswers) {
            stat.wrongAnswers.push(...p.wrongAnswers)
          }
        }

        if (p.audioPlayed) {
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

        const category = allCategories.find(c => c.id === word.categoryId)
        
        // ספירת תשובות שגויות נפוצות
        const errorCounts = new Map<string, number>()
        stat.wrongAnswers.forEach(ans => {
          errorCounts.set(ans, (errorCounts.get(ans) || 0) + 1)
        })

        const commonErrors = Array.from(errorCounts.entries())
          .map(([answer, count]) => ({ answer, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 5)

        errorStats.push({
          word: word.en,
          hebrewWord: word.he,
          category: category?.name || 'לא ידוע',
          totalAttempts: stat.totalAttempts,
          wrongAttempts: stat.wrongAttempts,
          commonErrors,
          usersWhoListened: stat.listenedCount,
          usersWhoDidntListen: stat.notListenedCount
        })
      })

      // מיון לפי כמות טעויות (הכי הרבה טעויות בראש)
      errorStats.sort((a, b) => b.wrongAttempts - a.wrongAttempts)
      
      setErrors(errorStats)
      setLoading(false)
    } catch (error) {
      console.error('Error loading error stats:', error)
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <Card>
        <p className="text-center text-muted">טוען נתונים...</p>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">ניתוח טעויות ומעקב לימוד</h2>
        <button
          onClick={loadErrors}
          className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
        >
          🔄 רענן נתונים
        </button>
      </div>

      <div className="grid gap-4">
        {errors.length === 0 ? (
          <Card>
            <p className="text-center text-muted">אין עדיין נתוני טעויות</p>
          </Card>
        ) : (
          errors.map((error, index) => (
            <Card key={index} className="hover:shadow-lg transition-shadow">
              <div className="space-y-3">
                {/* כותרת */}
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-xl font-bold text-primary">
                      {error.word} → {error.hebrewWord}
                    </h3>
                    <p className="text-sm text-muted">{error.category}</p>
                  </div>
                  <div className="text-left">
                    <div className="text-2xl font-bold text-danger">
                      {error.wrongAttempts}
                    </div>
                    <div className="text-xs text-muted">טעויות</div>
                  </div>
                </div>

                {/* סטטיסטיקות */}
                <div className="grid grid-cols-3 gap-4 py-3 border-t border-b">
                  <div className="text-center">
                    <div className="text-lg font-bold">{error.totalAttempts}</div>
                    <div className="text-xs text-muted">סה"כ ניסיונות</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-accent">{error.usersWhoListened}</div>
                    <div className="text-xs text-muted">שמעו הקראה 🔉</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-orange-500">{error.usersWhoDidntListen}</div>
                    <div className="text-xs text-muted">לא שמעו 🔇</div>
                  </div>
                </div>

                {/* טעויות נפוצות */}
                {error.commonErrors.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold mb-2">טעויות נפוצות:</h4>
                    <div className="space-y-1">
                      {error.commonErrors.map((err, i) => (
                        <div
                          key={i}
                          className="flex justify-between items-center bg-danger/10 px-3 py-2 rounded"
                        >
                          <span className="font-medium text-danger">"{err.answer}"</span>
                          <span className="text-sm text-muted">{err.count} פעמים</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* המלצות */}
                {error.usersWhoDidntListen > error.usersWhoListened && (
                  <div className="bg-orange-100 border border-orange-300 rounded p-3">
                    <p className="text-sm text-orange-800">
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

