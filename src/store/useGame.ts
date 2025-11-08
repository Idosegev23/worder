import { create } from 'zustand'
import { persist } from 'zustand/middleware'

type Achievement = {
  id: string
  title: string
  description: string
  icon: string
  unlockedAt?: number
}

type GameState = {
  currentCategoryId?: number
  score: number
  streak: number
  maxStreak: number
  stars: number // כוכבים גלובליים
  totalCorrect: number // סך כל התשובות הנכונות
  achievements: Achievement[]
  incrementScore: () => void
  incrementStreak: () => void
  resetStreak: () => void
  addStars: (amount: number) => void
  unlockAchievement: (id: string, title: string, description: string, icon: string) => void
  setCategory: (id: number) => void
  reset: () => void
}

export const useGame = create<GameState>()(
  persist(
    (set) => ({
      currentCategoryId: undefined,
      score: 0,
      streak: 0,
      maxStreak: 0,
      stars: 0,
      totalCorrect: 0,
      achievements: [],
      
      incrementScore: () => set((state) => {
        const newTotalCorrect = state.totalCorrect + 1
        const newStreak = state.streak + 1
        const newMaxStreak = Math.max(state.maxStreak, newStreak)
        
        // חישוב כוכבים: 1 כוכב לכל תשובה נכונה + בונוס רצף
        let starsToAdd = 1
        if (newStreak >= 5) starsToAdd += 1 // בונוס לרצף של 5
        if (newStreak >= 10) starsToAdd += 2 // בונוס לרצף של 10
        
        return { 
          score: state.score + 1,
          totalCorrect: newTotalCorrect,
          stars: state.stars + starsToAdd,
          streak: newStreak,
          maxStreak: newMaxStreak
        }
      }),
      
      incrementStreak: () => set((state) => {
        const newStreak = state.streak + 1
        return {
          streak: newStreak,
          maxStreak: Math.max(state.maxStreak, newStreak)
        }
      }),
      
      resetStreak: () => set({ streak: 0 }),
      
      addStars: (amount) => set((state) => ({ stars: state.stars + amount })),
      
      unlockAchievement: (id, title, description, icon) => set((state) => {
        if (state.achievements.some(a => a.id === id)) return state
        
        return {
          achievements: [
            ...state.achievements,
            { id, title, description, icon, unlockedAt: Date.now() }
          ]
        }
      }),
      
      setCategory: (id) => set({ currentCategoryId: id }),
      
      reset: () => set({ score: 0, streak: 0, currentCategoryId: undefined })
    }),
    {
      name: 'game-storage'
    }
  )
)

