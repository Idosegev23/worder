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
  const [activeWords, setActiveWords] = useState<Word[]>([]) // מילים לסיבוב הנוכחי
  const [retryQueue, setRetryQueue] = useState<Word[]>([]) // מילים לסיבוב הבא (טעויות)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isRetryRound, setIsRetryRound] = useState(false) // האם זה סיבוב תיקון
  const [answer, setAnswer] = useState('')
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | 'show-answer' | null>(null)
  const [attempts, setAttempts] = useState(0)
  const [wrongAnswers, setWrongAnswers] = useState<string[]>([])
  const [audioPlayed, setAudioPlayed] = useState(false)
  const [isPlayingAudio, setIsPlayingAudio] = useState(false)
  const [categoryName, setCategoryName] = useState<string>('')
  const [wasCompletedInitially, setWasCompletedInitially] = useState(false) 

  // שימוש ב-activeWords במקום words
  const currentWord = activeWords[currentIndex]
  
  // זיהוי אם זה משחק בחירה (כפתורים) או הקלדה
  const isChoiceGame = categoryName?.includes('Am/Is/Are') || categoryName === 'Have/Has'
  
  // זיהוי אם זה קטגוריה של מיתר
  const isMeitarCategory = categoryName?.startsWith('Meitar')
  
  // זיהוי סוג המשפט לפי השדה sentenceType
  const sentenceType = currentWord?.sentenceType || 'positive'
  const isNegativeSentence = sentenceType === 'negative'
  const isQuestionSentence = sentenceType === 'question'
  
  // פרגונים מגוונים למיתר (מהריפוזיטורי החדש)
  const meitarPraises = [
    "🎉 מדהים! מיתר גאונית!",
    "⭐ כל הכבוד! תשובה מושלמת מיתר!",
    "🌟 יפה מאוד! מיתר על זה!",
    "💫 מעולה! מיתר המשיכי ככה!",
    "✨ וואו! איזו תשובה נכונה מיתר!",
    "🎊 פנטסטי! מיתר יודעת את זה מצוין!",
    "🏆 מצוין! מיתר זה היה מושלם!",
  ]
  
  // בחירת אפשרויות כפתורים בהתאם לסוג המשפט
  const choiceOptions = categoryName?.includes('Am/Is/Are')
    ? isNegativeSentence
      ? ['am not', 'is not', 'are not']  // משפטי שלילה
      : ['am', 'is', 'are']               // משפטים חיוביים
    : categoryName === 'Have/Has' 
    ? isNegativeSentence
      ? ["don't have", "doesn't have"]  // משפטי שלילה Have/Has
      : isQuestionSentence
      ? ['do', 'does']                   // שאלות Have/Has
      : ['have', 'has']                  // משפטים חיוביים Have/Has
    : []

  useEffect(() => {
    if (!user) {
      nav('/')
      return
    }
    
    const loadWords = async () => {
      try {
        console.log('Loading words for category:', categoryId)
        const fetchedWords = await getWordsByCategory(Number(categoryId))
        
        console.log('Found active words:', fetchedWords)
        setWords(fetchedWords)
        
        const { getCategories } = await import('../../lib/supabase')
        const categories = await getCategories()
        const currentCat = categories.find(c => c.id === Number(categoryId))
        if (currentCat) {
          setCategoryName(currentCat.name)
        }
        
        const userProgress = await getUserProgress(user.id)
        
        // סינון מילים שכבר נענו נכון (אלא אם זה תרגול חוזר)
        const allCorrect = fetchedWords.every(word => 
          userProgress.some(p => p.wordId === word.id && p.isCorrect)
        )
        
        let initialWords = fetchedWords
        if (allCorrect) {
          setWasCompletedInitially(true)
          console.log('Category was already completed! Starting practice mode.')
        } else {
          const uncompletedWords = fetchedWords.filter(word => 
            !userProgress.some(p => p.wordId === word.id && p.isCorrect)
          )
          if (uncompletedWords.length > 0) {
            initialWords = uncompletedWords
          }
        }
        
        setActiveWords(initialWords)
        setCurrentIndex(0)
        setRetryQueue([])
        setIsRetryRound(false)
        
      } catch (error) {
        console.error('Error loading words:', error)
        setWords([])
        setActiveWords([])
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

  const moveToNextWord = async () => {
    if (!user) return
    
    setFeedback(null)
    setAnswer('')
    setAttempts(0)
    setWrongAnswers([])
    setAudioPlayed(false)
    
    // בדיקה אם הגענו לסוף הרשימה הנוכחית
    if (currentIndex < activeWords.length - 1) {
      setCurrentIndex(currentIndex + 1)
    } else {
      // סיימנו את הרשימה הנוכחית. בדיקה אם יש מילים לתיקון
      if (retryQueue.length > 0) {
        console.log('Starting retry round with words:', retryQueue)
        setActiveWords(retryQueue)
        setRetryQueue([]) // מנקים את התור לסיבוב הבא
        setCurrentIndex(0)
        setIsRetryRound(true)
        
        // הודעה למשתמש שמתחיל סבב תיקון
        alert('כל הכבוד! עכשיו נחזור על המילים שצריך לחזק 💪')
      } else {
        // סיימנו הכל!
        console.log('✅ All done!')
        triggerCelebration(document.getElementById('game-card') || undefined)
        play('correct')
        
        setTimeout(() => {
          if (wasCompletedInitially) {
            alert('כל הכבוד! סיימת סבב תרגול נוסף! ⭐')
            nav('/categories')
          } else {
            nav('/rewards')
          }
        }, 2000)
      }
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
      if (newStreak === 5) unlockAchievement('streak_5', 'רצף של 5! 🔥', 'ענית נכון על 5 מילים ברצף!', '🔥')
      if (newStreak === 10) unlockAchievement('streak_10', 'רצף של 10! ⚡', 'ענית נכון על 10 מילים ברצף!', '⚡')
      if (newStreak === 20) unlockAchievement('streak_20', 'רצף של 20! 🚀', 'ענית נכון על 20 מילים ברצף! מדהים!', '🚀')

      // אפקט חגיגי
      await triggerCelebration(document.getElementById('game-card') || undefined)

      setTimeout(async () => {
        await moveToNextWord()
      }, isMeitarCategory ? 3000 : 2000)
    } else {
      // תשובה שגויה!
      play('wrong')
      resetStreak()
      
      // הוספה לתור לתיקון (אם המילה עדיין לא שם)
      if (!retryQueue.some(w => w.id === currentWord.id)) {
        setRetryQueue(prev => [...prev, currentWord])
      }

      setFeedback('show-answer')
      
      // אפקט שובב (רק אם זה לא מיתר)
      if (!isMeitarCategory) {
        await triggerFunnyEffect(document.getElementById('game-card') || undefined)
      }
      
      // שמירת התקדמות (טעות)
      await saveProgress({
        userId: user!.id,
        wordId: currentWord.id,
        isCorrect: false,
        attempts: currentAttempts,
        lastAnswer: selectedAnswer,
        wrongAnswers: [...wrongAnswers, selectedAnswer],
        audioPlayed: audioPlayed
      })

      // הצגת התשובה לזמן מה ואז מעבר הלאה
      setTimeout(async () => {
        await moveToNextWord()
      }, 4000)
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
    <div className="min-h-screen p-3 sm:p-6">
      <div className="max-w-4xl mx-auto">
        {/* סרגל התקדמות גלובלי */}
        <GlobalProgress />
        
        <Card className="w-full max-w-xl mx-auto shadow-2xl relative overflow-hidden min-h-[550px] flex flex-col border-2 sm:border-4 border-white/50" id="game-card">
          {/* התקדמות */}
          <div className="flex justify-between items-center mb-3 sm:mb-4 relative z-10 bg-white/10 p-2 rounded-lg sm:rounded-xl backdrop-blur-sm">
            <div className="flex items-center gap-2 sm:gap-3">
              <span className="text-primary font-bold text-base sm:text-lg">
                {currentIndex + 1} / {words.length}
              </span>
              
              {/* הצגת רצף נוכחי */}
              {streak > 0 && (
                <div className="flex items-center gap-1 sm:gap-2 bg-gradient-to-r from-orange-400 to-red-500 text-white px-2 sm:px-3 py-1 rounded-full animate-pulse shadow-lg">
                  <span className="text-sm sm:text-base">🔥</span>
                  <span className="font-bold text-sm sm:text-base">{streak}</span>
                </div>
              )}
            </div>
            
            <button
              onClick={() => nav('/categories')}
              className="flex items-center gap-1 sm:gap-2 bg-secondary/20 hover:bg-secondary/30 text-secondary px-2 sm:px-4 py-1.5 sm:py-2 rounded-lg transition-all font-bold text-xs sm:text-base shadow-md hover:shadow-lg active:scale-95"
            >
              <span className="text-base sm:text-xl">↩️</span>
              <span className="hidden xs:inline">חזרה</span>
            </button>
          </div>

        {/* כותרת הסבר למשחק */}
        <div className="text-center mb-3 sm:mb-4 relative z-10 px-2">
          <h2 className="text-base sm:text-xl md:text-2xl font-bold text-primary leading-tight">
            {categoryName?.includes('Am/Is/Are')
              ? isNegativeSentence 
                ? 'השלימו במשפט שלילה'
                : 'השלימו את המילה החסרה'
             : categoryName === 'Have/Has' 
              ? isNegativeSentence
                ? 'השלימו במשפט שלילה'
                : isQuestionSentence
                ? 'השלימו את מילת השאלה'
                : 'השלימו את המילה'
             : categoryName === 'Pronouns' 
              ? 'תרגמו את כינוי הגוף'
             : 'תרגמו את המילה לעברית'}
          </h2>
        </div>

        {/* המילה באנגלית + כפתור השמעה */}
        <div className="text-center mb-4 sm:mb-6 flex-1 flex flex-col justify-center relative z-10 px-2">
          <div className="flex items-center justify-center gap-2 sm:gap-3 mb-3 sm:mb-4 flex-wrap">
            <div className="word-text text-2xl sm:text-3xl md:text-4xl font-bold break-words max-w-full leading-tight">
              {currentWord.en}
            </div>
            {/* כפתור השמעה - רק למשחקי תרגום (לא השלמת משפטים) */}
            {!isChoiceGame && (
              <button
                onClick={handlePlayAudio}
                disabled={isPlayingAudio}
                className={`p-2 sm:p-3 rounded-full transition-all flex-shrink-0 ${
                  isPlayingAudio 
                    ? 'bg-primary/50 animate-pulse' 
                    : audioPlayed 
                    ? 'bg-accent text-white hover:scale-110'
                    : 'bg-sky text-white hover:scale-110'
                }`}
                title="השמע את המילה"
              >
                <span className="text-xl sm:text-2xl md:text-3xl">{isPlayingAudio ? '🔊' : '🔉'}</span>
              </button>
            )}
          </div>
          {/* תרגום/משפט דוגמה למשפטים (אם יש תרגום במסד נתונים) */}
          {currentWord.translation && (
            <div className="text-sm sm:text-base md:text-lg text-secondary font-semibold mt-2 animate-fade-in bg-secondary/10 px-3 py-2 rounded-lg mx-2 italic">
              "{currentWord.translation}"
            </div>
          )}

          {attempts > 0 && !isChoiceGame && !isMeitarCategory && (
            <div className="text-xs sm:text-sm text-muted mt-2">
              ניסיון {attempts} מתוך 2
            </div>
          )}
        </div>

        {/* שדה תשובה או כפתורי בחירה */}
        <div className="space-y-3 sm:space-y-4 relative z-10 px-2">
          {isChoiceGame ? (
            // כפתורי בחירה
            <div className={`grid gap-2 sm:gap-3 ${
              categoryName?.includes('Am/Is/Are')
                ? isNegativeSentence 
                  ? 'grid-cols-1'                  // Am not / Is not / Are not (mobile: 1 col)
                  : 'grid-cols-3'                  // Am / Is / Are
                : categoryName === 'Have/Has'
                ? isNegativeSentence
                  ? 'grid-cols-1'                  // Don't have / Doesn't have (mobile: 1 col)
                  : 'grid-cols-2'                  // Have/Has או Do/Does
                : 'grid-cols-2'
            }`}>
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
                  className={`py-3 sm:py-4 md:py-6 px-3 sm:px-6 md:px-8 rounded-xl text-base sm:text-lg md:text-2xl font-bold transition-all transform hover:scale-105 active:scale-95 ${
                    feedback === 'correct' && answer === option
                      ? 'bg-accent text-white shadow-lg scale-105 sm:scale-110 ring-4 ring-green-300' // נבחר ונכון
                      : feedback === 'wrong' && answer === option
                      ? 'bg-red-500 text-white shadow-lg scale-95 ring-4 ring-red-300' // נבחר ושגוי
                      : feedback === 'show-answer' && normalizeAnswer(currentWord.he) === option
                      ? 'bg-accent text-white shadow-lg animate-pulse ring-4 ring-blue-300' // התשובה הנכונה שמוצגת
                      : feedback !== null
                      ? 'bg-muted text-white/50 cursor-not-allowed opacity-50' // שאר הכפתורים בזמן פידבק
                      : 'bg-gradient-to-r from-primary to-secondary text-white hover:shadow-2xl' // מצב רגיל
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
          <div className="text-accent text-center text-xl sm:text-2xl md:text-3xl font-bold animate-pulse bg-gradient-to-r from-accent/20 via-gold/20 to-accent/20 py-4 sm:py-6 rounded-xl border-2 border-accent/30">
            {isMeitarCategory 
              ? meitarPraises[Math.floor(Math.random() * meitarPraises.length)]
              : '🎉 תשובה נכונה! כל הכבוד! ⭐'
            }
          </div>
        )}
        {feedback === 'wrong' && (
          <div className="text-orange-500 text-center text-2xl font-bold bg-orange-100 py-4 rounded-xl">
            💭 לא בדיוק... נסה שוב! אתה יכול! 💪
          </div>
        )}
        {feedback === 'show-answer' && (
          <div className="bg-gradient-to-r from-blue-100 to-purple-100 py-4 sm:py-6 px-3 sm:px-4 rounded-xl border-2 border-blue-300">
            <div className="text-center mb-3">
              <div className="text-lg sm:text-xl md:text-2xl font-bold text-blue-700 mb-2">
                💡 התשובה הנכונה היא:
              </div>
              <div className="text-2xl sm:text-3xl md:text-4xl font-bold text-purple-600 mb-2">
                {currentWord.he}
              </div>
              {currentWord.altHe && currentWord.altHe.length > 0 && (
                <div className="text-xs sm:text-sm text-muted mt-2">
                  תשובות נוספות: {currentWord.altHe.join(', ')}
                </div>
              )}
              {/* משפט להקשר למיתר - הוסר כי הוא מוצג למעלה */}
              
              <div className="text-xs sm:text-sm text-blue-600 mt-3">
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

