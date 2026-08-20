import { create } from 'zustand'

/**
 * שער האדמין. הסיסמה נשמרת ב-sessionStorage כדי לאמת קריאות ל-/api/ai —
 * היא מוקלדת ולא נמצאת בבאנדל, ולכן משמשת כאסימון גישה אמיתי לנתיב.
 */

type AdminState = {
  isAuthenticated: boolean
  password: string | null
  login: (password: string) => void
  logout: () => void
}

export const useAdmin = create<AdminState>((set) => ({
  isAuthenticated: !!sessionStorage.getItem('admin'),
  password: sessionStorage.getItem('adminPwd'),

  login: (password: string) => {
    sessionStorage.setItem('admin', '1')
    sessionStorage.setItem('adminPwd', password)
    set({ isAuthenticated: true, password })
  },

  logout: () => {
    sessionStorage.removeItem('admin')
    sessionStorage.removeItem('adminPwd')
    set({ isAuthenticated: false, password: null })
  }
}))
