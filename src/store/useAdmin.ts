import { create } from 'zustand'

type AdminState = {
  isAuthenticated: boolean
  login: () => void
  logout: () => void
}

export const useAdmin = create<AdminState>((set) => ({
  isAuthenticated: !!sessionStorage.getItem('admin'),
  
  login: () => {
    sessionStorage.setItem('admin', '1')
    set({ isAuthenticated: true })
  },
  
  logout: () => {
    sessionStorage.removeItem('admin')
    set({ isAuthenticated: false })
  }
}))



