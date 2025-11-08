import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { db, Word } from '../../lib/db'
import { useAuth } from '../../store/useAuth'
import { useGame } from '../../store/useGame'
import { triggerCelebration, triggerFunnyEffect } from '../../lib/useEffectEngine'
import { play } from '../../lib/sounds'
import { Card } from '../../shared/ui/Card'
import { Input } from '../../shared/ui/Input'
import { Button } from '../../shared/ui/Button'
import { GlobalProgress } from '../../shared/ui/GlobalProgress'

export default function GameScreen() {
  const { categoryId } = useParams()
  const nav = useNavigate()
  const user = useAuth(s => s.user)
  const { incrementScore, incrementStreak, resetStreak, streak, unlockAchievement } = useGame()

  const [words, setWords] = useState<Word[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [answer, setAnswer] = useState('')
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null)

  const currentWord = words[currentIndex]

  useEffect(() => {
    if (!user) {
      nav('/')
      return
    }
    
    const loadWords = async () => {
      try {
        console.log('Loading words for category:', categoryId)
        const allWords = await db.words
          .where({ categoryId: Number(categoryId) })
          .toArray()
        
        console.log('Found words:', allWords)
        
        const activeWords = allWords
          .filter(w => w.active !== false)
          .sort((a, b) => (a.order || 0) - (b.order || 0))
        
        console.log('Active words:', activeWords)
        setWords(activeWords)
        
        // מציאת המילה הראשונה שעוד לא נענתה עליה נכון
        const userProgress = await db.progress.where({ userId: user.id }).toArray()
        
        let firstUnansweredIndex = 0
        for (let i = 0; i < activeWords.length; i++) {
          if (!activeWords[i].id) continue // דילוג על מילים ללא ID
          
          const hasCorrectAnswer = userProgress.some(
            p => p.wordId === activeWords[i].id && p.isCorrect
          )
          
          if (!hasCorrectAnswer) {
            firstUnansweredIndex = i
            console.log(`Found unanswered word at index ${i}:`, activeWords[i].en)
            break
          }
          
          // אם כל המילים נענו, נתחיל מההתחלה (חזרה על הקטגוריה)
          if (i === activeWords.length - 1 && hasCorrectAnswer) {
            firstUnansweredIndex = 0
            console.log('All words answered correctly, starting from beginning')
          }
        }
        
        console.log('Starting from index:', firstUnansweredIndex)
        setCurrentIndex(firstUnansweredIndex)
      } catch (error) {
        console.error('Error loading words:', error)
        setWords([])
      }
    }
    
    loadWords()
  }, [categoryId, user, nav])

  const normalizeAnswer = (str: string) => str.trim().toLowerCase()

  const checkAnswer = async () => {
    if (!currentWord || !answer.trim()) return

    const canonical = normalizeAnswer(currentWord.he)
    const variants = (currentWord.altHe || []).map(normalizeAnswer)
    const given = normalizeAnswer(answer)

    const isCorrect = [canonical, ...variants].includes(given)

    // שמירת התקדמות ב-DB
    const progressEntry = {
      userId: user!.id,
      wordId: currentWord.id!,
      isCorrect,
      attempts: 1,
      lastAnswer: answer,
      answeredAt: Date.now()
    }
    
    console.log('Saving progress:', progressEntry)
    await db.progress.add(progressEntry)
    console.log('Progress saved successfully')

    if (isCorrect) {
      // תשובה נכונה!
      play('correct')
      setFeedback('correct')
      incrementScore()
      incrementStreak()

      // בדיקת הישגים
      const newStreak = streak + 1
      if (newStreak === 5) {
        unlockAchievement('streak_5', 'רצף של 5! 🔥', 'ענית נכון על 5 מילים ברצף!', '🔥')
      }
      if (newStreak === 10) {
        unlockAchievement('streak_10', 'רצף של 10! ⚡', 'ענית נכון על 10 מילים ברצף!', '⚡')
      }
      if (newStreak === 20) {
        unlockAchievement('streak_20', 'רצף של 20! 🚀', 'ענית נכון על 20 מילים ברצף! מדהים!', '🚀')
      }

      // תמיד אפקט חגיגי משוגע! (לא רק 65%)
      await triggerCelebration(document.getElementById('game-card') || undefined)

      // המתנה ארוכה יותר כדי לראות את האפקט
      setTimeout(async () => {
        setFeedback(null)
        setAnswer('')
        if (currentIndex < words.length - 1) {
          setCurrentIndex(currentIndex + 1)
        } else {
          // סיום קטגוריה! תמיד חוזרים לבחירת קטגוריות
          // מסך הקטגוריות יבדוק אם סיימנו הכול ויעביר למתנות אם צריך
          nav('/categories')
        }
      }, 3000)
    } else {
      // תשובה שגויה!
      play('wrong')
      setFeedback('wrong')
      resetStreak()

      // תמיד אפקט שובב!
      await triggerFunnyEffect(document.getElementById('game-card') || undefined)

      // הסרת הפידבק אחרי זמן קצר
      setTimeout(() => {
        setFeedback(null)
      }, 2000)
    }
  }

  if (words.length === 0) {
    return (
      <div className="min-h-screen grid place-items-center p-6">
        <Card className="text-center">
          <p className="text-muted mb-4">טוען מילים...</p>
          <p className="text-xs text-muted">
            אם זה לוקח זמן, נסה לרענן את הדף (F5)
          </p>
          <Button className="mt-4" onClick={() => nav('/categories')}>
            חזרה לקטגוריות
          </Button>
        </Card>
      </div>
    )
  }
  
  if (!currentWord) {
    return (
      <div className="min-h-screen grid place-items-center p-6">
        <Card className="text-center">
          <p className="text-danger mb-4">שגיאה: לא נמצאו מילים בקטגוריה זו</p>
          <Button onClick={() => nav('/categories')}>
            חזרה לקטגוריות
          </Button>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-4xl mx-auto">
        {/* סרגל התקדמות גלובלי */}
        <GlobalProgress />
        
        <Card className="w-full max-w-xl mx-auto shadow-2xl" id="game-card">
          {/* התקדמות */}
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-4">
              <span className="text-muted text-sm">
                מילה {currentIndex + 1} / {words.length}
              </span>
              
              {/* הצגת רצף נוכחי */}
              {streak > 0 && (
                <div className="flex items-center gap-2 bg-gradient-to-r from-orange-400 to-red-500 text-white px-3 py-1 rounded-full animate-pulse">
                  <span className="text-lg">🔥</span>
                  <span className="font-bold">{streak}</span>
                </div>
              )}
              
              {/* בונוס רצף */}
              {streak >= 5 && (
                <div className="text-gold text-xs font-bold animate-bounce">
                  +{streak >= 10 ? '3' : '2'} כוכבים!
                </div>
              )}
            </div>
            
            <button
              onClick={() => nav('/categories')}
              className="text-secondary hover:underline text-sm"
            >
              חזרה
            </button>
          </div>

        {/* המילה באנגלית */}
        <div className="word-text text-5xl font-bold text-center mb-8 py-8">
          {currentWord.en}
        </div>

        {/* שדה תשובה */}
        <div className="space-y-4">
          <Input
            placeholder="תרגם לעברית..."
            value={answer}
            onChange={e => setAnswer(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && checkAnswer()}
            disabled={feedback !== null}
            className="text-xl text-center"
          />

        {/* פידבק */}
        {feedback === 'correct' && (
          <div className="text-accent text-center text-3xl font-bold animate-pulse bg-accent/20 py-4 rounded-xl">
            ✓ תשובה נכונה! כל הכבוד! 🎉
          </div>
        )}
        {feedback === 'wrong' && (
          <div className="text-danger text-center text-3xl font-bold animate-pulse bg-danger/20 py-4 rounded-xl">
            ✗ אופס! נסה שוב 😅
          </div>
        )}

          <Button
            className="w-full submit-btn"
            onClick={checkAnswer}
            disabled={!answer.trim() || feedback !== null}
          >
            בדוק תשובה
          </Button>
        </div>
      </Card>
      </div>
    </div>
  )
}

