import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Word, getWordsByCategory, getUserProgress, saveProgress } from '../../lib/supabase'
import { useAuth } from '../../store/useAuth'
import { useGame } from '../../store/useGame'
import { triggerCelebration, triggerFunnyEffect } from '../../lib/useEffectEngine'
import { play } from '../../lib/sounds'
import { speakWord } from '../../lib/openai-tts'
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
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | 'show-answer' | null>(null)
  const [attempts, setAttempts] = useState(0)
  const [wrongAnswers, setWrongAnswers] = useState<string[]>([])
  const [audioPlayed, setAudioPlayed] = useState(false)
  const [isPlayingAudio, setIsPlayingAudio] = useState(false)
  const [categoryName, setCategoryName] = useState<string>('')

  const currentWord = words[currentIndex]
  
  // זיהוי אם זה משחק בחירה (כפתורים) או הקלדה
  const isChoiceGame = categoryName === 'Am/Is/Are' || categoryName === 'Have/Has'
  const choiceOptions = categoryName === 'Am/Is/Are' 
    ? ['am', 'is', 'are'] 
    : categoryName === 'Have/Has' 
    ? ['have', 'has'] 
    : []

  useEffect(() => {
    if (!user) {
      nav('/')
      return
    }
    
    const loadWords = async () => {
      try {
        console.log('Loading words for category:', categoryId)
        const activeWords = await getWordsByCategory(Number(categoryId))
        
        console.log('Found active words:', activeWords)
        setWords(activeWords)
        
        // טעינת שם הקטגוריה
        const { getCategories } = await import('../../lib/supabase')
        const categories = await getCategories()
        const currentCat = categories.find(c => c.id === Number(categoryId))
        if (currentCat) {
          setCategoryName(currentCat.name)
        }
        
        // מציאת המילה הראשונה שעוד לא נענתה עליה נכון
        const userProgress = await getUserProgress(user.id)
        
        let firstUnansweredIndex = 0
        for (let i = 0; i < activeWords.length; i++) {
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

  const handlePlayAudio = async () => {
    if (!currentWord || isPlayingAudio) return
    
    try {
      setIsPlayingAudio(true)
      setAudioPlayed(true) // מעקב שלחצו על השמעה
      await speakWord(currentWord.en)
    } catch (error) {
      console.error('Audio playback failed:', error)
    } finally {
      setIsPlayingAudio(false)
    }
  }

  const checkIfCategoryCompleted = async () => {
    if (!user) return false
    
    // בדיקה אם סיימנו את כל המילים בקטגוריה
    const allProgress = await getUserProgress(user.id)
    
    const completedWordsInCategory = new Set<number>()
    words.forEach(word => {
      const hasCorrect = allProgress.some(p => p.wordId === word.id && p.isCorrect)
      if (hasCorrect) {
        completedWordsInCategory.add(word.id)
      }
    })
    
    return completedWordsInCategory.size === words.length
  }

  const moveToNextWord = async () => {
    if (!user) return
    
    setFeedback(null)
    setAnswer('')
    setAttempts(0)
    setWrongAnswers([])
    setAudioPlayed(false)
    
    // בדיקה אם סיימנו את כל המילים בקטגוריה
    const categoryCompleted = await checkIfCategoryCompleted()
    
    if (categoryCompleted) {
      // סיימנו את הקטגוריה! עובר למתנות
      console.log('✅ Category completed! Going to rewards...')
      nav('/rewards')
    } else if (currentIndex < words.length - 1) {
      setCurrentIndex(currentIndex + 1)
    } else {
      // הגענו לסוף הרשימה אבל עדיין יש מילים שלא סיימנו
      // חוזרים למילה הראשונה שלא סיימנו
      const allProgress = await getUserProgress(user.id)
      let nextIndex = 0
      for (let i = 0; i < words.length; i++) {
        const hasCorrect = allProgress.some(p => p.wordId === words[i].id && p.isCorrect)
        if (!hasCorrect) {
          nextIndex = i
          break
        }
      }
      setCurrentIndex(nextIndex)
    }
  }

  const checkAnswerWithOption = async (selectedAnswer: string) => {
    if (!currentWord) return

    const canonical = normalizeAnswer(currentWord.he)
    const variants = (currentWord.altHe || []).map(normalizeAnswer)
    const given = normalizeAnswer(selectedAnswer)

    const isCorrect = [canonical, ...variants].includes(given)
    const currentAttempts = attempts + 1
    setAttempts(currentAttempts)

    if (isCorrect) {
      // תשובה נכונה!
      play('correct')
      setFeedback('correct')
      incrementScore()
      incrementStreak()

      // שמירת התקדמות ב-DB
      await saveProgress({
        userId: user!.id,
        wordId: currentWord.id,
        isCorrect: true,
        attempts: currentAttempts,
        lastAnswer: selectedAnswer,
        wrongAnswers: wrongAnswers,
        audioPlayed: audioPlayed
      })

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

      // אפקט חגיגי
      await triggerCelebration(document.getElementById('game-card') || undefined)

      setTimeout(async () => {
        await moveToNextWord()
      }, 3000)
    } else {
      // תשובה שגויה!
      const newWrongAnswers = [...wrongAnswers, selectedAnswer]
      setWrongAnswers(newWrongAnswers)
      
      play('wrong')
      resetStreak()

      // במשחקי בחירה - תמיד מראים טעות מיד, אין "ניסיון שני" באותו אופן
      if (isChoiceGame || currentAttempts >= 2) {
        setFeedback(isChoiceGame ? 'wrong' : 'show-answer')
        
        // שמירת התקדמות ב-DB
        await saveProgress({
          userId: user!.id,
          wordId: currentWord.id,
          isCorrect: false,
          attempts: currentAttempts,
          lastAnswer: selectedAnswer,
          wrongAnswers: newWrongAnswers,
          audioPlayed: audioPlayed
        })

        // במשחקי בחירה - מחכים קצת ואז מנקים את הפידבק כדי שיוכל לנסות שוב
        // אלא אם כן הגענו למקסימום ניסיונות (2) ואז מראים תשובה
        if (isChoiceGame && currentAttempts < 2) {
            await triggerFunnyEffect(document.getElementById('game-card') || undefined)
            setTimeout(() => {
                setFeedback(null)
                setAnswer('') // ניקוי כדי לאפשר בחירה חדשה
            }, 1500)
        } else {
            // אם זה לא משחק בחירה או שזה ניסיון שני במשחק בחירה
            if (isChoiceGame) setFeedback('show-answer') // מראה את התשובה הנכונה
            
            setTimeout(async () => {
              await moveToNextWord()
            }, 4000)
        }
      } else {
        // ניסיון ראשון במשחק הקלדה - תן לו לנסות שוב
        setFeedback('wrong')
        
        // אפקט עדין
        await triggerFunnyEffect(document.getElementById('game-card') || undefined)

        setTimeout(() => {
          setFeedback(null)
          setAnswer('') // ניקוי התשובה
        }, 2000)
      }
    }
  }

  const checkAnswer = async () => {
    checkAnswerWithOption(answer)
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
        
        <Card className="w-full max-w-xl mx-auto shadow-2xl relative overflow-hidden min-h-[600px] flex flex-col" id="game-card">
          {/* התקדמות */}
          <div className="flex justify-between items-center mb-6 relative z-10">
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

        {/* כותרת הסבר למשחק */}
        <div className="text-center mb-4 relative z-10">
          <h2 className="text-2xl font-bold text-primary">
            {categoryName === 'Am/Is/Are' ? 'השלימו את המילה החסרה (Am / Is / Are)' :
             categoryName === 'Have/Has' ? 'השלימו את המילה החסרה (Have / Has)' :
             categoryName === 'Pronouns' ? 'תרגמו את כינוי הגוף' :
             'תרגמו את המילה לעברית'}
          </h2>
          {(categoryName === 'Am/Is/Are' || categoryName === 'Have/Has') && (
            <p className="text-muted text-sm mt-1">
              בחרו את האפשרות המתאימה למשפט
            </p>
          )}
        </div>

        {/* המילה באנגלית + כפתור השמעה */}
        <div className="text-center mb-8 flex-1 flex flex-col justify-center relative z-10">
          <div className="flex items-center justify-center gap-4 mb-4">
            <div className="word-text text-4xl font-bold break-words max-w-[80%]">
              {currentWord.en}
            </div>
            {!isChoiceGame && (
              <button
                onClick={handlePlayAudio}
                disabled={isPlayingAudio}
                className={`p-4 rounded-full transition-all ${
                  isPlayingAudio 
                    ? 'bg-primary/50 animate-pulse' 
                    : audioPlayed 
                    ? 'bg-accent text-white hover:scale-110'
                    : 'bg-sky text-white hover:scale-110'
                }`}
                title="השמע את המילה"
              >
                <span className="text-3xl">{isPlayingAudio ? '🔊' : '🔉'}</span>
              </button>
            )}
          </div>
          {/* תרגום למשפטי Have/Has */}
          {categoryName === 'Have/Has' && (
            <div className="text-lg text-secondary font-semibold mt-2 animate-fade-in">
              {/* כאן נוסיף תרגום ידני או מהדאטה אם קיים */}
              {/* כרגע נציג הסבר כללי אם אין תרגום ספציפי */}
              משמעות: {
                currentWord.en.includes('sport') ? 'אני עושה ספורט אחרי בית הספר' :
                currentWord.en.includes('breakfast') ? 'את/ה אוכל/ת ארוחת בוקר לפני הכיתה' :
                currentWord.en.includes('bike') ? 'יש לו אופניים מהירים' :
                currentWord.en.includes('home') ? (currentWord.en.includes('We') ? 'יש לנו בית' : 'יש לה בית גדול עם גינה') :
                currentWord.en.includes('books') ? 'יש להם הרבה ספרים בחדר' :
                currentWord.en.includes('face') ? 'יש לזה פרצוף מצחיק כשמסתכלים על זה' :
                ''
              }
            </div>
          )}

          {attempts > 0 && !isChoiceGame && (
            <div className="text-sm text-muted">
              ניסיון {attempts} מתוך 2
            </div>
          )}
          {isChoiceGame && (
            <div className="text-lg text-muted mt-2">
              בחר את התשובה הנכונה 👇
            </div>
          )}
        </div>

        {/* שדה תשובה או כפתורי בחירה */}
        <div className="space-y-4">
          {isChoiceGame ? (
            // כפתורי בחירה
            <div className="grid grid-cols-2 gap-4">
              {choiceOptions.map((option) => (
                <button
                  key={option}
                  onClick={() => {
                    // אם כבר יש פידבק, לא עושים כלום
                    if (feedback) return;
                    
                    setAnswer(option);
                    // קריאה ישירה לבדיקה - חשוב מאוד להשתמש בערך העדכני
                    // נשתמש בפונקציה ייעודית לבדיקה עם האופציה שנבחרה
                    checkAnswerWithOption(option);
                  }}
                  disabled={feedback !== null}
                  className={`py-6 px-8 rounded-xl text-2xl font-bold transition-all transform hover:scale-105 ${
                    feedback === 'correct' && answer === option
                      ? 'bg-accent text-white shadow-lg scale-110 ring-4 ring-green-300' // נבחר ונכון
                      : feedback === 'wrong' && answer === option
                      ? 'bg-red-500 text-white shadow-lg scale-95 ring-4 ring-red-300' // נבחר ושגוי
                      : feedback === 'show-answer' && normalizeAnswer(currentWord.he) === option
                      ? 'bg-accent text-white shadow-lg animate-pulse ring-4 ring-blue-300' // התשובה הנכונה שמוצגת
                      : feedback !== null
                      ? 'bg-muted text-white/50 cursor-not-allowed opacity-50' // שאר הכפתורים בזמן פידבק
                      : 'bg-gradient-to-r from-primary to-secondary text-white hover:shadow-2xl active:scale-95' // מצב רגיל
                  }`}
                >
                  {option.toUpperCase()}
                </button>
              ))}
            </div>
          ) : (
            // שדה הקלדה רגיל
            <Input
              placeholder="תרגם לעברית..."
              value={answer}
              onChange={e => setAnswer(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && checkAnswer()}
              disabled={feedback !== null}
              className="text-xl text-center"
            />
          )}

        {/* פידבק */}
        {feedback === 'correct' && (
          <div className="text-accent text-center text-3xl font-bold animate-pulse bg-accent/20 py-4 rounded-xl">
            🎉 תשובה נכונה! כל הכבוד! ⭐
          </div>
        )}
        {feedback === 'wrong' && (
          <div className="text-orange-500 text-center text-2xl font-bold bg-orange-100 py-4 rounded-xl">
            💭 לא בדיוק... נסה שוב! אתה יכול! 💪
          </div>
        )}
        {feedback === 'show-answer' && (
          <div className="bg-gradient-to-r from-blue-100 to-purple-100 py-6 px-4 rounded-xl border-2 border-blue-300">
            <div className="text-center mb-3">
              <div className="text-2xl font-bold text-blue-700 mb-2">
                💡 התשובה הנכונה היא:
              </div>
              <div className="text-4xl font-bold text-purple-600 mb-2">
                {currentWord.he}
              </div>
              {currentWord.altHe && currentWord.altHe.length > 0 && (
                <div className="text-sm text-muted mt-2">
                  תשובות נוספות: {currentWord.altHe.join(', ')}
                </div>
              )}
              <div className="text-sm text-blue-600 mt-3">
                עובר למילה הבאה... ✨
              </div>
            </div>
          </div>
        )}

          {!isChoiceGame && (
            <Button
              className="w-full submit-btn"
              onClick={checkAnswer}
              disabled={!answer.trim() || feedback !== null}
            >
              בדוק תשובה
            </Button>
          )}
        </div>
      </Card>
      </div>
    </div>
  )
}

