import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Word, getWordsByCategory, getUserProgress, saveProgress, getCategories } from '../../lib/supabase'
import { useAuth } from '../../store/useAuth'
import { useGame } from '../../store/useGame'
import { triggerCelebration, triggerFunnyEffect } from '../../lib/useEffectEngine'
import { play } from '../../lib/sounds'
import { speakWord } from '../../lib/openai-tts'
import { Card } from '../../shared/ui/Card'
import { Input } from '../../shared/ui/Input'
import { Button } from '../../shared/ui/Button'
import { GlobalProgress } from '../../shared/ui/GlobalProgress'
import { LoadingOverlay } from '../../shared/ui/LoadingOverlay'
import MichelGameScreen from './MichelGameScreen'
import RecordingGameScreen from './RecordingGameScreen'

export default function GameScreen() {
  const { categoryId } = useParams()
  const [categoryType, setCategoryType] = useState<'michel' | 'recording' | 'regular' | null>(null)

  // בדיקה איזה סוג קטגוריה זו
  useEffect(() => {
    const checkCategory = async () => {
      if (!categoryId) return
      try {
        const categories = await getCategories()
        const currentCat = categories.find(c => c.id === Number(categoryId))
        
        if (currentCat?.name === 'כתיבת מילים') {
          setCategoryType('michel')
        } else if (currentCat?.name === 'הקלטה של משפטים') {
          setCategoryType('recording')
        } else {
          setCategoryType('regular')
        }
      } catch (err) {
        console.error('Error checking category:', err)
        setCategoryType('regular')
      }
    }
    checkCategory()
  }, [categoryId])

  // אם זו קטגוריה של מישל - הצג את המסך המיוחד
  if (categoryType === 'michel') {
    return <MichelGameScreen />
  }

  // אם זו קטגוריית הקלטות - הצג את מסך ההקלטות
  if (categoryType === 'recording') {
    return <RecordingGameScreen />
  }

  // אם עדיין בודק - הצג טעינה
  if (categoryType === null) {
    return <LoadingOverlay fullscreen message="טוען..." />
  }

  // אחרת - המשך עם המשחק הרגיל
  return <RegularGameScreen />
}

function RegularGameScreen() {
  const { categoryId } = useParams()
  const nav = useNavigate()
  const user = useAuth(s => s.user)
  const { incrementScore, incrementStreak, resetStreak, streak, unlockAchievement } = useGame()

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
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

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
      : isQuestionSentence
      ? ['am', 'is', 'are']               // משפטי שאלה
      : ['am', 'is', 'are']               // משפטים חיוביים
    : categoryName === 'Have/Has' 
    ? ['have', 'has']                     // רק חיובי
    : []

  const choiceGridCols = categoryName?.includes('Am/Is/Are')
    ? (isNegativeSentence ? 'sm:grid-cols-1' : 'sm:grid-cols-3')
    : categoryName === 'Have/Has'
    ? 'sm:grid-cols-2'
    : 'sm:grid-cols-2'

  useEffect(() => {
    if (!user) {
      nav('/')
      return
    }
    
    const loadWords = async () => {
      setIsLoading(true)
      setLoadError(null)
      try {
        console.log('Loading words for category:', categoryId)
        const fetchedWords = await getWordsByCategory(Number(categoryId))
        
        console.log('Found active words:', fetchedWords)
        
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
        setIsLoading(false)
        
      } catch (error) {
        console.error('Error loading words:', error)
        setActiveWords([])
        setLoadError('לא הצלחנו לטעון מילים לקטגוריה הזו. נסו שוב מאוחר יותר.')
        setIsLoading(false)
      }
    }
    
    loadWords()
  }, [categoryId, user, nav])

  const normalizeAnswer = (str: string) => {
    return str
      .trim()
      .toLowerCase()
      // נרמול תווים מיוחדים (geresh, apostrophe, וכו')
      .replace(/[\u05F3\u2019\u0060]/g, "'") // ׳ ' ` -> '
      .replace(/[\u05F4]/g, '"') // ״ -> "
  }

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

  if (!isLoading && activeWords.length === 0) {
    return (
      <div className="min-h-screen grid place-items-center p-6">
        <Card className="text-center">
          <p className="text-danger mb-4">{loadError || 'לא נמצאו מילים בקטגוריה הזו.'}</p>
          <Button className="mt-4" onClick={() => nav('/categories')}>
            חזרה לקטגוריות
          </Button>
        </Card>
      </div>
    )
  }
  
  if (!isLoading && !currentWord) {
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
    <div className="relative min-h-screen bg-gradient-to-b from-[#070b1e] via-[#0b122d] to-[#05060f] p-3 sm:p-6">
      {isLoading && <LoadingOverlay fullscreen message="טוען מילים..." />}
      <div className="max-w-4xl mx-auto">
        {/* סרגל התקדמות גלובלי */}
        <GlobalProgress />
        
        {/* אם אין מילה נוכחית - הצג הודעה */}
        {!isLoading && !currentWord && (
          <Card className="w-full max-w-xl mx-auto shadow-2xl p-6 text-center">
            <div className="text-2xl mb-4">⚠️</div>
            <h2 className="text-xl font-bold mb-2 text-white">לא נמצאו מילים בקטגוריה זו</h2>
            <p className="text-white mb-4">נסי לבחור קטגוריה אחרת</p>
            <Button onClick={() => nav('/categories')}>חזרה לקטגוריות</Button>
          </Card>
        )}
        
        {/* רק אם יש מילה נוכחית - הצג את המשחק */}
        {currentWord && (
          <Card className="w-full max-w-xl mx-auto shadow-2xl relative overflow-hidden min-h-[520px] sm:min-h-[600px] flex flex-col border border-white/30 bg-white/5 p-4 sm:p-6 gap-4" id="game-card">
            {/* התקדמות */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between relative z-10 bg-white/5 p-3 rounded-2xl border border-white/10">
            <div className="flex items-center justify-between sm:justify-start gap-3">
              <span className="text-white font-bold text-base sm:text-lg tracking-wide">
                {currentIndex + 1} / {activeWords.length}
              </span>
              {isRetryRound && (
                <div className="flex items-center gap-2 bg-gradient-to-r from-blue-400 to-purple-500 text-white px-3 py-1 rounded-full shadow-lg">
                  <span className="text-sm">🔄</span>
                  <span className="text-xs font-semibold">סבב חזרה</span>
                </div>
              )}
              {streak > 0 && (
                <div className="flex items-center gap-2 bg-gradient-to-r from-orange-400 to-red-500 text-white px-3 py-1 rounded-full animate-pulse shadow-lg">
                  <span className="text-sm">🔥</span>
                  <span className="font-bold text-sm">{streak}</span>
                </div>
              )}
            </div>
            
            <button
              onClick={() => nav('/categories')}
              className="flex items-center justify-center gap-2 bg-white/20 hover:bg-white/30 text-white px-3 py-2 rounded-xl transition-all font-bold text-sm sm:text-base shadow-md hover:shadow-lg active:scale-95 w-full sm:w-auto"
            >
              <span className="text-base sm:text-xl">↩️</span>
              <span>חזרה לקטגוריות</span>
            </button>
          </div>

        {/* כותרת הסבר למשחק */}
        <div className="text-center mb-3 sm:mb-4 relative z-10 px-2">
          <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-white leading-tight">
            {categoryName?.includes('Am/Is/Are')
              ? isNegativeSentence 
                ? 'השלימו במשפט שלילה'
                : isQuestionSentence
                ? 'השלימו את מילת השאלה'
                : 'השלימו את המילה החסרה'
             : categoryName === 'Have/Has' 
              ? 'השלימו את המילה'
             : categoryName === 'Pronouns' 
              ? 'תרגמו את כינוי הגוף'
             : 'תרגמו את המילה לעברית'}
          </h2>
        </div>

        {/* המילה באנגלית + כפתור השמעה */}
        <div className="text-center mb-4 sm:mb-6 flex-1 flex flex-col justify-center relative z-10 px-2 gap-3">
          <div className="flex items-center justify-center gap-3 flex-wrap">
            <div className="word-text text-3xl sm:text-4xl font-black break-words max-w-full leading-tight text-white" dir="ltr">
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
            <div className="text-sm sm:text-base md:text-lg text-white font-semibold mt-2 animate-fade-in bg-white/10 px-3 py-2 rounded-lg mx-2 italic">
              "{currentWord.translation}"
            </div>
          )}

          {attempts > 0 && !isChoiceGame && !isMeitarCategory && (
            <div className="text-xs sm:text-sm text-white/80 mt-2">
              ניסיון {attempts} מתוך 2
            </div>
          )}
        </div>

        {/* שדה תשובה או כפתורי בחירה */}
        <div className="space-y-3 sm:space-y-4 relative z-10 px-2">
          {isChoiceGame ? (
            // כפתורי בחירה
            <div className={`grid grid-cols-1 gap-2 sm:gap-3 ${choiceGridCols}`}>
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
              className="text-xl text-center py-3 rounded-2xl"
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
                <div className="text-xs sm:text-sm text-white/80 mt-2">
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
              className="w-full py-3 text-lg font-semibold rounded-2xl"
              onClick={checkAnswer}
              disabled={!answer.trim() || feedback !== null}
            >
              בדוק תשובה
            </Button>
          )}
        </div>
      </Card>
        )}
      </div>
    </div>
  )
}

