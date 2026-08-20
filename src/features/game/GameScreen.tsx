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
import { Badge } from '../../shared/ui/Badge'
import { GlobalProgress } from '../../shared/ui/GlobalProgress'
import { LoadingOverlay } from '../../shared/ui/LoadingOverlay'
import { IconArrowRight, IconSpeaker } from '../../shared/ui/icons'
import MichelGameScreen from './MichelGameScreen'
import RecordingGameScreen from './RecordingGameScreen'

export default function GameScreen() {
  const { categoryId } = useParams()
  const [categoryType, setCategoryType] = useState<'michel' | 'recording' | 'regular' | null>(null)

  useEffect(() => {
    const checkCategory = async () => {
      if (!categoryId) return
      try {
        const categories = await getCategories()
        const currentCat = categories.find(c => c.id === Number(categoryId))

        if (currentCat?.name === 'כתיבת מילים') setCategoryType('michel')
        else if (currentCat?.name === 'הקלטה של משפטים') setCategoryType('recording')
        else setCategoryType('regular')
      } catch (err) {
        console.error('Error checking category:', err)
        setCategoryType('regular')
      }
    }
    checkCategory()
  }, [categoryId])

  if (categoryType === 'michel') return <MichelGameScreen />
  if (categoryType === 'recording') return <RecordingGameScreen />
  if (categoryType === null) return <LoadingOverlay fullscreen message="טוען…" />

  return <RegularGameScreen />
}

function RegularGameScreen() {
  const { categoryId } = useParams()
  const nav = useNavigate()
  const user = useAuth(s => s.user)
  const { incrementScore, incrementStreak, resetStreak, streak, unlockAchievement } = useGame()

  const [activeWords, setActiveWords] = useState<Word[]>([])
  const [retryQueue, setRetryQueue] = useState<Word[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isRetryRound, setIsRetryRound] = useState(false)
  const [answer, setAnswer] = useState('')
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | 'show-answer' | null>(null)
  const [attempts, setAttempts] = useState(0)
  const [wrongAnswers, setWrongAnswers] = useState<string[]>([])
  const [audioPlayed, setAudioPlayed] = useState(false)
  const [isPlayingAudio, setIsPlayingAudio] = useState(false)
  const [categoryName, setCategoryName] = useState<string>('')
  const [categoryDisplayName, setCategoryDisplayName] = useState<string>('')
  const [wasCompletedInitially, setWasCompletedInitially] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const currentWord = activeWords[currentIndex]
  const isChoiceGame = categoryName?.includes('Am/Is/Are') || categoryName === 'Have/Has'
  const isMeitarCategory = categoryName?.startsWith('Meitar')
  const sentenceType = currentWord?.sentenceType || 'positive'
  const isNegativeSentence = sentenceType === 'negative'
  const isQuestionSentence = sentenceType === 'question'

  const meitarPraises = [
    '🎉 מדהים! מיתר גאונית!',
    '⭐ כל הכבוד! תשובה מושלמת מיתר!',
    '🌟 יפה מאוד! מיתר על זה!',
    '💫 מעולה! מיתר המשיכי ככה!',
    '✨ וואו! איזו תשובה נכונה מיתר!',
    '🎊 פנטסטי! מיתר יודעת את זה מצוין!',
    '🏆 מצוין! מיתר זה היה מושלם!'
  ]

  const choiceOptions = categoryName?.includes('Am/Is/Are')
    ? isNegativeSentence
      ? ['am not', 'is not', 'are not']
      : isQuestionSentence
      ? ['am', 'is', 'are']
      : ['am', 'is', 'are']
    : categoryName === 'Have/Has'
    ? ['have', 'has']
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
        const fetchedWords = await getWordsByCategory(Number(categoryId))
        const categories = await getCategories()
        const currentCat = categories.find(c => c.id === Number(categoryId))
        if (currentCat) {
          setCategoryName(currentCat.name)
          setCategoryDisplayName(currentCat.displayName)
        }

        const userProgress = await getUserProgress(user.id)
        const allCorrect = fetchedWords.every(word =>
          userProgress.some(p => p.wordId === word.id && p.isCorrect)
        )

        let initialWords = fetchedWords
        if (allCorrect) {
          setWasCompletedInitially(true)
        } else {
          const uncompletedWords = fetchedWords.filter(word =>
            !userProgress.some(p => p.wordId === word.id && p.isCorrect)
          )
          if (uncompletedWords.length > 0) initialWords = uncompletedWords
        }

        setActiveWords(initialWords)
        setCurrentIndex(0)
        setRetryQueue([])
        setIsRetryRound(false)
      } catch (error) {
        console.error('Error loading words:', error)
        setActiveWords([])
        setLoadError('לא הצלחנו לטעון מילים לקטגוריה הזו. נסי שוב מאוחר יותר.')
      } finally {
        setIsLoading(false)
      }
    }

    loadWords()
  }, [categoryId, user, nav])

  const normalizeAnswer = (str: string) => {
    return str
      .trim()
      .toLowerCase()
      .replace(/[׳’`]/g, "'")
      .replace(/[״]/g, '"')
  }

  const handlePlayAudio = async () => {
    if (!currentWord || isPlayingAudio) return
    try {
      setIsPlayingAudio(true)
      setAudioPlayed(true)
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

    if (currentIndex < activeWords.length - 1) {
      setCurrentIndex(currentIndex + 1)
    } else {
      if (retryQueue.length > 0) {
        setActiveWords(retryQueue)
        setRetryQueue([])
        setCurrentIndex(0)
        setIsRetryRound(true)
        alert('כל הכבוד! עכשיו נחזור על המילים שצריך לחזק 💪')
      } else {
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
      play('correct')
      setFeedback('correct')
      incrementScore()
      incrementStreak()

      await saveProgress({
        userId: user!.id,
        wordId: currentWord.id,
        isCorrect: true,
        attempts: currentAttempts,
        lastAnswer: selectedAnswer,
        wrongAnswers,
        audioPlayed
      })

      const newStreak = streak + 1
      if (newStreak === 5) unlockAchievement('streak_5', 'רצף של 5! 🔥', 'ענית נכון על 5 מילים ברצף!', '🔥')
      if (newStreak === 10) unlockAchievement('streak_10', 'רצף של 10! ⚡', 'ענית נכון על 10 מילים ברצף!', '⚡')
      if (newStreak === 20) unlockAchievement('streak_20', 'רצף של 20! 🚀', 'ענית נכון על 20 מילים ברצף! מדהים!', '🚀')

      await triggerCelebration(document.getElementById('game-card') || undefined)
      setTimeout(() => { moveToNextWord() }, isMeitarCategory ? 3000 : 2000)
    } else {
      play('wrong')
      resetStreak()

      if (!retryQueue.some(w => w.id === currentWord.id)) {
        setRetryQueue(prev => [...prev, currentWord])
      }

      setFeedback('show-answer')

      if (!isMeitarCategory) {
        await triggerFunnyEffect(document.getElementById('game-card') || undefined)
      }

      await saveProgress({
        userId: user!.id,
        wordId: currentWord.id,
        isCorrect: false,
        attempts: currentAttempts,
        lastAnswer: selectedAnswer,
        wrongAnswers: [...wrongAnswers, selectedAnswer],
        audioPlayed
      })

      setTimeout(() => { moveToNextWord() }, 4000)
    }
  }

  const checkAnswer = () => checkAnswerWithOption(answer)

  if (!isLoading && (activeWords.length === 0 || !currentWord)) {
    return (
      <div className="min-h-screen app-bg grid place-items-center p-6">
        <Card variant="glass" padding="lg" className="text-center max-w-md w-full">
          <div className="text-5xl mb-3">🎯</div>
          <p className="text-ink font-bold mb-5">{loadError || 'לא נמצאו מילים בקטגוריה הזו'}</p>
          <Button fullWidth onClick={() => nav('/categories')}>חזרה לקטגוריות</Button>
        </Card>
      </div>
    )
  }

  const promptCopy = categoryName?.includes('Am/Is/Are')
    ? isNegativeSentence
      ? 'השלימו במשפט שלילה'
      : isQuestionSentence
      ? 'השלימו את מילת השאלה'
      : 'השלימו את המילה החסרה'
    : categoryName === 'Have/Has'
    ? 'השלימו את המילה'
    : categoryName === 'Pronouns'
    ? 'תרגמו את כינוי הגוף'
    : 'תרגמו את המילה לעברית'

  return (
    <div className="min-h-screen app-bg p-3 sm:p-6 relative">
      {isLoading && <LoadingOverlay fullscreen message="טוען מילים…" />}

      <div className="max-w-2xl mx-auto">
        {/* Top bar — back button, category title, retry/streak */}
        <header className="flex items-center justify-between gap-3 mb-4">
          <button
            onClick={() => nav('/categories')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-pill bg-track border-2 border-ink shadow-solid-sm pressable text-ink font-bold text-sm"
          >
            <IconArrowRight size={16} />
            <span className="hidden sm:inline">לקטגוריות</span>
          </button>

          <div className="text-center flex-1 min-w-0">
            <div className="text-base sm:text-lg font-bold text-ink truncate">{categoryDisplayName}</div>
          </div>

          <div className="flex items-center gap-1.5">
            {isRetryRound && <Badge tone="sky" icon="🔄">חזרה</Badge>}
            {streak > 0 && <Badge tone="rose" icon="🔥">{streak}</Badge>}
          </div>
        </header>

        {/* נקודות התקדמות — ירוק=נענתה, חרדל=נוכחית, track=טרם */}
        <div className="mb-5">
          <div className="flex items-center gap-1 mb-1.5">
            {activeWords.map((w, i) => (
              <span
                key={w.id}
                className={`flex-1 h-2 rounded-pill border border-ink ${
                  i < currentIndex ? 'bg-mint' : i === currentIndex ? 'bg-sun' : 'bg-track'
                }`}
              />
            ))}
          </div>
          <div className="text-xs font-semibold text-muted text-center">
            {currentIndex + 1} מתוך {activeWords.length}
          </div>
        </div>

        {currentWord && (
          <Card variant="solid" padding="lg" id="game-card" className="relative">
            {/* prompt */}
            <div className="text-center mb-6">
              <div className="text-sm text-muted font-medium mb-1">{promptCopy}</div>
            </div>

            {/* word + audio */}
            <div className="text-center mb-7 sm:mb-8 space-y-4">
              <div className="flex items-center justify-center gap-3 sm:gap-4 flex-wrap">
                <div
                  className="word-text text-4xl sm:text-5xl md:text-6xl font-extrabold text-ink break-words leading-tight tracking-tight"
                  dir="ltr"
                >
                  {currentWord.en}
                </div>
                {!isChoiceGame && (
                  <button
                    onClick={handlePlayAudio}
                    disabled={isPlayingAudio}
                    className={[
                      'w-14 h-14 rounded-pill grid place-items-center text-ink',
                      'border-outline border-ink shadow-solid pressable',
                      isPlayingAudio ? 'bg-sun animate-pulse' : audioPlayed ? 'bg-mint' : 'bg-sky'
                    ].join(' ')}
                    title="השמע את המילה"
                  >
                    <IconSpeaker size={26} />
                  </button>
                )}
              </div>

              {currentWord.translation && (
                <div className="text-base sm:text-lg text-muted font-medium bg-track border-2 border-ink px-4 py-1.5 rounded-pill inline-block">
                  "{currentWord.translation}"
                </div>
              )}

              {attempts > 0 && !isChoiceGame && !isMeitarCategory && feedback === null && (
                <div className="text-xs font-semibold text-muted">ניסיון {attempts}</div>
              )}
            </div>

            {/* input or choice buttons */}
            <div className="space-y-3">
              {isChoiceGame ? (
                <div className={`grid grid-cols-1 gap-2.5 ${choiceGridCols}`}>
                  {choiceOptions.map((option) => {
                    const isSelected = answer === option
                    const isThisCorrect = feedback === 'correct' && isSelected
                    const isThisWrong = feedback === 'show-answer' && isSelected
                    const isAnswer = feedback === 'show-answer' && normalizeAnswer(currentWord.he) === option
                    const isMuted = feedback !== null && !isSelected && !isAnswer

                    return (
                      <button
                        key={option}
                        onClick={() => {
                          if (feedback) return
                          setAnswer(option)
                          checkAnswerWithOption(option)
                        }}
                        disabled={feedback !== null}
                        className={[
                          'py-4 px-5 rounded-md2 text-lg sm:text-xl font-bold text-ink',
                          'border-outline border-ink shadow-solid',
                          isThisCorrect ? 'bg-mint' : '',
                          isThisWrong ? 'bg-berry' : '',
                          isAnswer && !isThisCorrect ? 'bg-mint animate-pulse' : '',
                          isMuted ? 'bg-track opacity-45' : '',
                          !feedback ? 'bg-sky pressable' : ''
                        ].join(' ')}
                      >
                        {option}
                      </button>
                    )
                  })}
                </div>
              ) : (
                <>
                  <Input
                    placeholder="תרגום לעברית…"
                    value={answer}
                    onChange={e => setAnswer(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && answer.trim() && !feedback && checkAnswer()}
                    disabled={feedback !== null}
                    className="text-center text-2xl font-bold"
                    dir="rtl"
                    autoFocus
                  />
                  <Button
                    size="lg"
                    variant="accent"
                    fullWidth
                    onClick={checkAnswer}
                    disabled={!answer.trim() || feedback !== null}
                  >
                    בדיקה
                  </Button>
                </>
              )}

              {/* feedback row */}
              {feedback === 'correct' && (
                <div className="text-center bg-mint border-outline border-ink shadow-solid rounded-md2 py-4 px-4 animate-pop-in">
                  <div className="text-xl sm:text-2xl font-bold text-ink">
                    {isMeitarCategory
                      ? meitarPraises[Math.floor(Math.random() * meitarPraises.length)]
                      : '🎉 יפה! המשיכי ככה'}
                  </div>
                </div>
              )}
              {feedback === 'wrong' && (
                <div className="text-center bg-sun border-outline border-ink shadow-solid rounded-md2 py-4 px-4 animate-nudge">
                  <div className="text-base sm:text-lg font-bold text-ink">
                    💭 לא בדיוק... את יכולה!
                  </div>
                </div>
              )}
              {feedback === 'show-answer' && (
                <div className="bg-track border-outline border-ink shadow-solid rounded-md2 py-5 px-5 animate-pop-in space-y-2 text-center">
                  <div className="text-sm font-semibold text-muted">התשובה הנכונה</div>
                  <div className="text-3xl sm:text-4xl font-bold text-ink">{currentWord.he}</div>
                  {currentWord.altHe && currentWord.altHe.length > 0 && (
                    <div className="text-sm text-muted font-medium">
                      גם: {currentWord.altHe.join(' · ')}
                    </div>
                  )}
                  <div className="text-xs text-muted pt-1">עוברת למילה הבאה ✨</div>
                </div>
              )}
            </div>
          </Card>
        )}

        {/* GlobalProgress at bottom — less prominent during play */}
        <div className="mt-6 opacity-90">
          <GlobalProgress />
        </div>
      </div>
    </div>
  )
}
