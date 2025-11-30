import { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Word, getWordsByCategory, getUserProgress, saveProgress } from '../../lib/supabase'
import { useAuth } from '../../store/useAuth'
import { useGame } from '../../store/useGame'
import { triggerCelebration } from '../../lib/useEffectEngine'
import { play } from '../../lib/sounds'
import { speakWord } from '../../lib/openai-tts'
import { Card } from '../../shared/ui/Card'
import { Input } from '../../shared/ui/Input'
import { Button } from '../../shared/ui/Button'
// אין GlobalProgress למישל - לא רלוונטי
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
      const progress = await getUserProgress(user.id)
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

  // השמעת המילה בעברית - OpenAI TTS (קול אנושי)
  const handlePlayAudio = async () => {
    if (!currentWord || isPlayingAudio) return
    setIsPlayingAudio(true)
    setAudioPlayed(true)
    
    try {
      // השמעה באמצעות OpenAI TTS - קול אנושי
      await speakWord(currentWord.he)
      setIsPlayingAudio(false)
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
      incrementScore()
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
    <div className="min-h-screen bg-gradient-to-b from-[#050A1C] to-[#0b1c3a] p-4 sm:p-6 md:p-8 relative">
      {/* אין GlobalProgress למישל - לא רלוונטי */}
      
      <div className="max-w-4xl mx-auto">
        {/* כותרת */}
        <div className="flex flex-col sm:flex-row items-center justify-between mb-8 gap-4">
          <div className="text-center sm:text-right space-y-2">
            <p className="text-xs uppercase tracking-[0.4em] text-white/60">משחק מיוחד</p>
            <h1 className="text-3xl sm:text-5xl font-black bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              מה יש בתמונה? 🎨
            </h1>
            <p className="text-sm text-white/70">
              מילה {currentIndex + 1} מתוך {words.length}
            </p>
          </div>
          <button
            onClick={() => nav('/categories')}
            className="rounded-2xl border border-white/20 px-6 py-3 text-sm font-semibold text-white/80 hover:text-white hover:border-white/40 transition-all"
          >
            ← חזרה
          </button>
        </div>

        {/* כרטיס המשחק */}
        <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/5 backdrop-blur-sm p-6 sm:p-8">
          {/* התמונה */}
          <div className="flex items-center justify-center mb-8">
            <div className="bg-white rounded-2xl p-4 shadow-2xl">
              <img
                src={imagePath}
                alt="תמונה"
                className="max-w-full max-h-[250px] sm:max-h-[300px] rounded-xl object-contain"
                onError={(e) => {
                  e.currentTarget.src = '/images/placeholder.png'
                }}
              />
            </div>
          </div>

          {/* כפתור השמעה */}
          <div className="text-center mb-8">
            <button
              onClick={handlePlayAudio}
              disabled={isPlayingAudio}
              className={`px-10 py-5 rounded-2xl text-xl font-bold transition-all shadow-lg ${
                isPlayingAudio
                  ? 'bg-primary/50 animate-pulse'
                  : audioPlayed
                  ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white hover:scale-105'
                  : 'bg-gradient-to-r from-primary to-secondary text-white hover:scale-105 hover:shadow-xl'
              }`}
            >
              {isPlayingAudio ? '🔊 מנגן...' : '🔉 מה יש בתמונה?'}
            </button>
          </div>

          {/* שדה כתיבה */}
          <div className="space-y-4 mb-6">
            <label className="block text-center text-lg font-semibold text-white">
              כתבי את המילה בעברית:
            </label>
            <div className="bg-white rounded-2xl p-2">
              <input
                ref={inputRef}
                type="text"
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                onKeyPress={handleKeyPress}
                disabled={!!feedback}
                placeholder="הקלידי כאן..."
                className="w-full text-center text-2xl font-bold p-4 rounded-xl bg-gray-50 text-gray-800 border-2 border-transparent focus:border-primary focus:outline-none transition-all"
                dir="rtl"
                autoFocus
              />
            </div>
          </div>

          {/* כפתור בדיקה */}
          <button
            onClick={checkAnswer}
            disabled={!answer.trim() || !!feedback}
            className={`w-full py-5 text-xl font-bold rounded-2xl transition-all shadow-lg ${
              feedback === 'correct'
                ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white'
                : feedback === 'wrong'
                ? 'bg-gradient-to-r from-red-500 to-pink-500 text-white'
                : 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white hover:shadow-xl hover:scale-[1.02] disabled:opacity-50'
            }`}
          >
            {feedback === 'correct' ? '✅ נכון!' : feedback === 'wrong' ? '❌ לא נכון' : 'בדקי'}
          </button>

          {/* פידבק */}
          {feedback === 'correct' && (
            <div className="mt-6 text-center py-4">
              <div className="text-3xl font-bold text-green-400 animate-bounce">
                🎉 כל הכבוד מישל! 🌟
              </div>
            </div>
          )}
          {feedback === 'wrong' && attempts < 2 && (
            <div className="mt-6 text-center py-4">
              <div className="text-2xl font-bold text-yellow-400">
                נסי שוב! 💪
              </div>
            </div>
          )}

          {/* Progress bar */}
          <div className="mt-8">
            <div className="h-2 bg-white/10 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-primary to-secondary transition-all duration-500"
                style={{ width: `${((currentIndex + 1) / words.length) * 100}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

