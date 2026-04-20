import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { supabase } from '../lib/supabase'

interface AuthState {
  userId: string | null
  isLoggedIn: boolean
  login: (pin: string) => Promise<void>
  logout: () => Promise<void>
  restore: () => Promise<void>
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      userId: null,
      isLoggedIn: false,

      login: async (pin: string) => {
        const email = `${pin}@jpop-practice.app`
        const { error } = await supabase.auth.signInWithPassword({ email, password: pin })
        if (error) throw error

        const { data } = await supabase.auth.getUser()
        set({ userId: data.user?.id ?? null, isLoggedIn: true })
      },

      logout: async () => {
        await supabase.auth.signOut()
        set({ userId: null, isLoggedIn: false })
      },

      restore: async () => {
        const { data } = await supabase.auth.getSession()
        if (data.session) {
          const { data: userData } = await supabase.auth.getUser()
          set({ userId: userData.user?.id ?? null, isLoggedIn: true })
        }
      },
    }),
    { name: 'auth-storage' }
  )
)
