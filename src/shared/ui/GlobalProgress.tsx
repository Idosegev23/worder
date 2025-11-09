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
        // ספירת כל המילים הפעילות
        const allWords = await getAllActiveWords()
        setTotalWords(allWords.length)
        
        // ספירת מילים שנענו עליהן נכון
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
    <div className="bg-gradient-to-r from-purple to-pink shadow-lg rounded-2xl p-4 mb-6">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-6">
          {/* כוכבים */}
          <div className="flex items-center gap-2 bg-white/20 backdrop-blur px-4 py-2 rounded-full">
            <span className="text-2xl">⭐</span>
            <span className="text-white font-bold text-xl">{stars}</span>
          </div>
          
          {/* רצף נוכחי */}
          <div className="flex items-center gap-2 bg-white/20 backdrop-blur px-4 py-2 rounded-full">
            <span className="text-2xl">🔥</span>
            <span className="text-white font-bold text-xl">{streak}</span>
            {maxStreak > 0 && (
              <span className="text-white/70 text-sm">(שיא: {maxStreak})</span>
            )}
          </div>
          
          {/* סך הכל נכונות */}
          <div className="flex items-center gap-2 bg-white/20 backdrop-blur px-4 py-2 rounded-full">
            <span className="text-2xl">✓</span>
            <span className="text-white font-bold text-xl">{totalCorrect}</span>
          </div>
        </div>
        
        {/* ספירה לאחור */}
        {wordsLeft > 0 && (
          <div className="text-white text-sm bg-white/20 backdrop-blur px-4 py-2 rounded-full">
            עוד {wordsLeft} מילים למתנה! 🎁
          </div>
        )}
      </div>
      
      {/* סרגל התקדמות */}
      <div className="relative">
        <div className="w-full bg-white/30 h-4 rounded-full overflow-hidden">
          <div 
            className="bg-gradient-to-r from-gold to-yellow-300 h-full rounded-full transition-all duration-500 ease-out flex items-center justify-end px-2"
            style={{ width: `${progressPercent}%` }}
          >
            {progressPercent > 10 && (
              <span className="text-white text-xs font-bold drop-shadow">
                {progressPercent}%
              </span>
            )}
          </div>
        </div>
        {progressPercent <= 10 && (
          <span className="absolute top-0 left-2 text-white text-xs font-bold">
            {progressPercent}%
          </span>
        )}
      </div>
      
      <div className="text-white/80 text-xs mt-2 text-center">
        {completedWords} / {totalWords} מילים
      </div>
    </div>
  )
}

