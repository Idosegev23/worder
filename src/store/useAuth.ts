import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { db, Profile } from '../lib/db'
import { nanoid } from 'nanoid/non-secure'

type AuthState = {
  user?: Profile
  login: (username: string, password: string) => Promise<boolean>
  register: (firstName: string, lastName: string, password: string) => Promise<boolean>
  logout: () => void
  updateAvatar: (style: string, seed: string) => Promise<void>
  refreshUser: () => Promise<void>
}

export const useAuth = create<AuthState>()(
  persist(
    (set, get) => ({
      user: undefined,
  
  login: async (username, password) => {
    const u = await db.profiles.where({ username, password }).first()
    if (u) {
      set({ user: u })
      return true
    }
    return false
  },
  
  register: async (firstName, lastName, password) => {
    const username = `${firstName} ${lastName}`
    const exists = await db.profiles.where({ username }).first()
    if (exists) return false
    
    const id = nanoid()
    const profile: Profile = {
      id,
      firstName,
      lastName,
      role: 'user',
      username,
      password,
      avatarStyle: 'bottts',
      avatarSeed: id,
      createdAt: Date.now()
    }
    
    await db.profiles.add(profile)
    set({ user: profile })
    return true
  },
  
  logout: () => set({ user: undefined }),
  
  updateAvatar: async (style, seed) => {
    const user = get().user
    if (!user) return
    
    await db.profiles.update(user.id, { avatarStyle: style, avatarSeed: seed })
    set({ user: { ...user, avatarStyle: style, avatarSeed: seed } })
  },
  
  refreshUser: async () => {
    const user = get().user
    if (!user) return
    
    // טעינה מחדש מה-DB כדי לקבל עדכונים
    const updated = await db.profiles.get(user.id)
    if (updated) {
      set({ user: updated })
    }
  }
    }),
    {
      name: 'wordquest-auth',
      partialize: (state) => ({ user: state.user })
    }
  )
)

