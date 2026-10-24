import { createContext, useContext } from 'react'
import type { AuthUser, LoginCredentials, SignupCredentials } from '../types/auth.ts'

export interface AuthContextValue {
  user: AuthUser | null
  isAuthenticated: boolean
  /** True while a login/signup request is in flight. */
  isLoading: boolean
  /** True while the stored session is being restored after a page reload. */
  isInitializing: boolean
  error: string | null
  login: (credentials: LoginCredentials) => Promise<void>
  signup: (credentials: SignupCredentials) => Promise<void>
  logout: () => void
  clearError: () => void
  refreshMe: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
