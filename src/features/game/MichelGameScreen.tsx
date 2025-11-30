import { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Word, getWordsByCategory, getUserProgress, saveProgress } from '../../lib/supabase'
import { useAuth } from '../../store/useAuth'
import { useGame } from '../../store/useGame'
import { triggerCelebration } from '../../lib/useEffectEngine'
import { play } from '../../lib/sounds'
import { Card } from '../../shared/ui/Card'
import { Input } from '../../shared/ui/Input'
import { Button } from '../../shared/ui/Button'
import { GlobalProgress } from '../../shared/ui/GlobalProgress'
import { LoadingOverlay } from '../../shared/ui/LoadingOverlay'

/**
 * מסך משחק מיוחד למישל מישמיש
 * - מציג תמונה
 * - כפתור להשמעת המילה בעברית (TTS)
 * - שדה כתיבה לתשובה בעברית
 * - בדיקת תשובה נכונה
 */
export default function MichelGameScreen() {
  const { categoryId } = useParams()
  const nav = useNavigate()
  const user = useAuth(s => s.user)
  const { incrementScore, incrementStreak, resetStreak } = useGame()

  const [words, setWords] = useState<Word[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [answer, setAnswer] = useState('')
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null)
  const [attempts, setAttempts] = useState(0)
  const [audioPlayed, setAudioPlayed] = useState(false)
  const [isPlayingAudio, setIsPlayingAudio] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const currentWord = words[currentIndex]
  const inputRef = useRef<HTMLInputElement>(null)

  // טעינת מילים
  useEffect(() => {
    if (!categoryId || !user) return
    loadWords()
  }, [categoryId, user])

  const loadWords = async () => {
    if (!categoryId || !user) return
    setIsLoading(true)
    setLoadError(null)
    try {
      const allWords = await getWordsByCategory(parseInt(categoryId))
      const progress = await getUserProgress(user.id, parseInt(categoryId))
      const correctIds = new Set(progress.filter(p => p.isCorrect).map(p => p.wordId))
      const remaining = allWords.filter(w => !correctIds.has(w.id))
      
      if (remaining.length === 0) {
        setLoadError('כל הכבוד! סיימת את כל המילים! 🎉')
        setWords([])
      } else {
        setWords(remaining)
      }
    } catch (err) {
      console.error('Error loading words:', err)
      setLoadError('שגיאה בטעינת המילים')
    } finally {
      setIsLoading(false)
    }
  }

  // השמעת המילה בעברית
  const handlePlayAudio = async () => {
    if (!currentWord || isPlayingAudio) return
    setIsPlayingAudio(true)
    setAudioPlayed(true)
    
    try {
      // השמעה באמצעות Web Speech API (עברית)
      const utterance = new SpeechSynthesisUtterance(currentWord.he)
      utterance.lang = 'he-IL'
      utterance.rate = 0.8 // קצב איטי יותר
      utterance.onend = () => setIsPlayingAudio(false)
      utterance.onerror = () => setIsPlayingAudio(false)
      window.speechSynthesis.speak(utterance)
    } catch (err) {
      console.error('TTS error:', err)
      setIsPlayingAudio(false)
    }
  }

  // נרמול תשובה (הסרת רווחים, אותיות קטנות)
  const normalizeAnswer = (text: string) => text.trim().toLowerCase().replace(/\s+/g, '')

  // בדיקת תשובה
  const checkAnswer = async () => {
    if (!currentWord || !user || !answer.trim()) return

    const userAnswer = normalizeAnswer(answer)
    const correctAnswer = normalizeAnswer(currentWord.he)

    if (userAnswer === correctAnswer) {
      // תשובה נכונה! 🎉
      setFeedback('correct')
      play('correct')
      triggerCelebration()
      incrementScore(10)
      incrementStreak()

      // שמירת התקדמות
      await saveProgress({
        userId: user.id,
        wordId: currentWord.id,
        isCorrect: true,
        attempts: attempts + 1,
        lastAnswer: answer,
        wrongAnswers: [],
        audioPlayed
      })

      // מעבר למילה הבאה אחרי 2 שניות
      setTimeout(() => {
        moveToNextWord()
      }, 2000)
    } else {
      // תשובה שגויה
      setFeedback('wrong')
      play('wrong')
      setAttempts(attempts + 1)
      
      if (attempts >= 1) {
        // אחרי 2 ניסיונות - הצגת התשובה הנכונה
        resetStreak()
        await saveProgress({
          userId: user.id,
          wordId: currentWord.id,
          isCorrect: false,
          attempts: attempts + 1,
          lastAnswer: answer,
          wrongAnswers: [answer],
          audioPlayed
        })
        
        setTimeout(() => {
          alert(`התשובה הנכונה היא: ${currentWord.he}`)
          moveToNextWord()
        }, 1500)
      } else {
        // ניסיון נוסף
        setTimeout(() => {
          setFeedback(null)
          setAnswer('')
          inputRef.current?.focus()
        }, 1500)
      }
    }
  }

  // מעבר למילה הבאה
  const moveToNextWord = () => {
    setAnswer('')
    setFeedback(null)
    setAttempts(0)
    setAudioPlayed(false)

    if (currentIndex < words.length - 1) {
      setCurrentIndex(currentIndex + 1)
    } else {
      // סיום המשחק
      alert('כל הכבוד מישל! סיימת את כל המילים! 🎉🌟')
      nav('/categories')
    }
  }

  // טיפול ב-Enter
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !feedback) {
      checkAnswer()
    }
  }

  if (isLoading) {
    return <LoadingOverlay fullscreen message="טוען מילים..." />
  }

  if (loadError) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md text-center">
          <p className="text-xl text-white mb-4">{loadError}</p>
          <Button onClick={() => nav('/categories')}>חזרה לקטגוריות</Button>
        </Card>
      </div>
    )
  }

  if (!currentWord) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md text-center">
          <p className="text-xl text-white mb-4">אין מילים זמינות</p>
          <Button onClick={() => nav('/categories')}>חזרה לקטגוריות</Button>
        </Card>
      </div>
    )
  }

  // נתיב לתמונה
  const imagePath = `/images/${currentWord.en}`

  return (
    <div className="min-h-screen p-4 sm:p-6 md:p-8 relative">
      <GlobalProgress />
      
      <div className="max-w-4xl mx-auto">
        {/* כותרת */}
        <div className="flex flex-col sm:flex-row items-center justify-between mb-6 gap-4">
          <div className="text-center sm:text-right">
            <h1 className="text-2xl sm:text-3xl font-black text-white mb-1">
              משחק מיוחד למישל 🎨
            </h1>
            <p className="text-sm text-white/70">
              מילה {currentIndex + 1} מתוך {words.length}
            </p>
          </div>
          <Button
            onClick={() => nav('/categories')}
            className="w-full sm:w-auto"
          >
            ← חזרה
          </Button>
        </div>

        {/* כרטיס המשחק */}
        <Card className="relative min-h-[520px] sm:min-h-[600px] flex flex-col">
          {/* התמונה */}
          <div className="flex-1 flex items-center justify-center mb-6">
            <img
              src={imagePath}
              alt="תמונה"
              className="max-w-full max-h-[300px] sm:max-h-[400px] rounded-2xl shadow-2xl object-contain"
              onError={(e) => {
                e.currentTarget.src = '/images/placeholder.png'
              }}
            />
          </div>

          {/* כפתור השמעה */}
          <div className="text-center mb-6">
            <button
              onClick={handlePlayAudio}
              disabled={isPlayingAudio}
              className={`px-8 py-4 rounded-2xl text-xl font-bold transition-all ${
                isPlayingAudio
                  ? 'bg-primary/50 animate-pulse'
                  : audioPlayed
                  ? 'bg-accent text-white hover:scale-105'
                  : 'bg-gradient-to-r from-primary to-secondary text-white hover:scale-105 shadow-lg'
              }`}
            >
              {isPlayingAudio ? '🔊 מנגן...' : '🔉 מה יש בתמונה?'}
            </button>
          </div>

          {/* שדה כתיבה */}
          <div className="space-y-4">
            <label className="block text-center text-lg font-semibold text-white">
              כתבי את המילה בעברית:
            </label>
            <Input
              ref={inputRef}
              type="text"
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={!!feedback}
              placeholder="הקלידי כאן..."
              className="text-center text-2xl font-bold"
              dir="rtl"
              autoFocus
            />
          </div>

          {/* כפתור בדיקה */}
          <div className="mt-6">
            <Button
              onClick={checkAnswer}
              disabled={!answer.trim() || !!feedback}
              className="w-full text-xl py-4"
            >
              {feedback === 'correct' ? '✅ נכון!' : feedback === 'wrong' ? '❌ לא נכון' : 'בדקי'}
            </Button>
          </div>

          {/* פידבק */}
          {feedback === 'correct' && (
            <div className="mt-4 text-center text-2xl font-bold text-green-400 animate-bounce">
              🎉 כל הכבוד מישל! 🌟
            </div>
          )}
          {feedback === 'wrong' && attempts < 2 && (
            <div className="mt-4 text-center text-xl font-semibold text-yellow-400">
              נסי שוב! 💪
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}

