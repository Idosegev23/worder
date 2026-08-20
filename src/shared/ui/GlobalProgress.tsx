import { useGame } from '../../store/useGame'
import { useEffect, useState } from 'react'
import { getAllActiveWords, getUserProgress } from '../../lib/supabase'
import { useAuth } from '../../store/useAuth'

export function GlobalProgress() {
  const { stars, streak, maxStreak, totalCorrect } = useGame()
  const user = useAuth(s => s.user)
  const [totalWords, setTotalWords] = useState(0)
  const [completedWords, setCompletedWords] = useState(0)

  useEffect(() => {
    if (!user) return

    const loadProgress = async () => {
      try {
        const allWords = await getAllActiveWords()
        setTotalWords(allWords.length)

        const progress = await getUserProgress(user.id)
        const correctProgress = progress.filter(p => p.isCorrect)
        const uniqueWords = new Set(correctProgress.map(p => p.wordId))
        setCompletedWords(uniqueWords.size)
      } catch (error) {
        console.error('Error loading global progress:', error)
      }
    }

    loadProgress()
  }, [user, totalCorrect])

  const progressPercent = totalWords > 0 ? Math.round((completedWords / totalWords) * 100) : 0
  const wordsLeft = totalWords - completedWords

  return (
    <div className="bg-surface rounded-md2 border-outline border-ink shadow-solid p-4 sm:p-5 mb-5 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <Stat icon="⭐" value={stars} tone="bg-sun" label="כוכבים" />
          <Stat icon="🔥" value={streak} tone="bg-berry" label={maxStreak > 0 ? `שיא ${maxStreak}` : 'רצף'} />
          <Stat icon="✓" value={totalCorrect} tone="bg-mint" label="נכונות" />
        </div>

        {wordsLeft > 0 && (
          <div className="text-sm font-bold text-ink bg-track border-2 border-ink px-3.5 py-1.5 rounded-pill">
            עוד {wordsLeft} מילים למתנה 🎁
          </div>
        )}
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs font-semibold">
          <span className="text-muted">התקדמות כוללת</span>
          <span className="text-ink">{completedWords} / {totalWords}</span>
        </div>
        <div className="relative w-full bg-track h-3 rounded-pill border-2 border-ink overflow-hidden">
          <div
            className="absolute inset-y-0 right-0 bg-mint transition-all duration-500 ease-out"
            style={{ width: `${Math.max(progressPercent, 2)}%` }}
          />
        </div>
      </div>
    </div>
  )
}

function Stat({ icon, value, label, tone }: { icon: string; value: number; label: string; tone: string }) {
  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-pill border-2 border-ink text-ink ${tone}`}>
      <span className="text-base leading-none">{icon}</span>
      <span className="font-bold text-base leading-none">{value}</span>
      <span className="text-[11px] font-semibold opacity-75">{label}</span>
    </div>
  )
}
