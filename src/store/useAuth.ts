import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { Profile, getUserByUsername, createUser, updateUser, supabase } from '../lib/supabase'

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
    try {
      // התחברות פשוטה - רק username + password
      const { data, error } = await supabase
        .from('worder_profiles')
        .select('*')
        .eq('username', username)
        .eq('password', password)
        .single()
      
      if (error || !data) return false
      
      set({ user: data as Profile })
      return true
    } catch (error) {
      console.error('Login error:', error)
      return false
    }
  },
  
  register: async (firstName, lastName, password) => {
    try {
      const username = `${firstName} ${lastName}`
      
      // בדיקה אם המשתמש כבר קיים
      const existing = await getUserByUsername(username)
      if (existing) return false
      
      // יצירת משתמש חדש
      const profile = await createUser({
        firstName,
        lastName,
        username,
        password,
        role: 'user',
        avatarStyle: 'bottts',
        avatarSeed: crypto.randomUUID()
      })
      
      set({ user: profile })
      return true
    } catch (error) {
      console.error('Register error:', error)
      return false
    }
  },
  
  logout: () => set({ user: undefined }),
  
  updateAvatar: async (style, seed) => {
    const user = get().user
    if (!user) return
    
    try {
      const updated = await updateUser(user.id, {
        avatarStyle: style,
        avatarSeed: seed
      })
      set({ user: updated })
    } catch (error) {
      console.error('Update avatar error:', error)
    }
  },
  
  refreshUser: async () => {
    const user = get().user
    if (!user) return
    
    try {
      // טעינה מחדש מה-DB כדי לקבל עדכונים
      const { data } = await supabase
        .from('worder_profiles')
        .select('*')
        .eq('id', user.id)
        .single()
      
      if (data) {
        set({ user: data as Profile })
      }
    } catch (error) {
      console.error('Refresh user error:', error)
    }
  }
    }),
    {
      name: 'wordquest-auth',
      partialize: (state) => ({ user: state.user })
    }
  )
)

