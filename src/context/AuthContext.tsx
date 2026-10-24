import React, { useCallback, useEffect, useRef, useState } from 'react'
import type { AuthUser, LoginCredentials, SignupCredentials } from '../types/auth.ts'
import * as authApi from '../lib/auth-api.ts'
import { ApiError } from '../lib/api.ts'
import { hasRefreshToken } from '../lib/auth-token.ts'
import { AuthContext } from './auth-context.ts'

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isInitializing, setIsInitializing] = useState(() => hasRefreshToken())
  const [error, setError] = useState<string | null>(null)
  const restoreAttempted = useRef(false)

  const clearError = useCallback(() => setError(null), [])

  const login = useCallback(async (credentials: LoginCredentials) => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await authApi.login(credentials)
      setUser(response.user)
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Login failed. Please check your credentials.'
      setError(message)
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [])

  const signup = useCallback(async (credentials: SignupCredentials) => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await authApi.signup(credentials)
      setUser(response.user)
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Sign up failed. Please try again.'
      setError(message)
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [])

  const logout = useCallback(() => {
    authApi.logout()
    setUser(null)
    setError(null)
  }, [])

  // Restore the session after a reload. The access token only lives in memory,
  // so fetchMe() uses the persisted refresh token via the API client.
  // The ref prevents StrictMode's double effect from rotating the refresh
  // token twice (the backend invalidates the previous token on every use).
  useEffect(() => {
    if (restoreAttempted.current) return
    restoreAttempted.current = true
    if (!hasRefreshToken()) return

    authApi
      .fetchMe()
      .then((currentUser) => {
        setUser(currentUser)
        setError(null)
      })
      .catch((cause: unknown) => {
        if (cause instanceof ApiError && cause.status === 401) {
          setError('Your session has expired. Please sign in again.')
        } else {
          setError(cause instanceof Error ? cause.message : 'Could not restore your session.')
        }
      })
      .finally(() => setIsInitializing(false))
  }, [])

  useEffect(() => {
    const handleUnauthorized = () => {
      authApi.logout()
      setUser(null)
      setError('Your session has expired. Please sign in again.')
    }
    window.addEventListener('auth:unauthorized', handleUnauthorized)
    return () => window.removeEventListener('auth:unauthorized', handleUnauthorized)
  }, [])

  const refreshMe = useCallback(async () => {
    try {
      const currentUser = await authApi.fetchMe()
      setUser(currentUser)
      setError(null)
    } catch (cause) {
      if (cause instanceof ApiError && cause.status === 401) {
        authApi.logout()
        setUser(null)
      }
      throw cause
    }
  }, [])

  const value = {
    user,
    isAuthenticated: user !== null,
    isLoading,
    isInitializing,
    error,
    login,
    signup,
    logout,
    clearError,
    refreshMe,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
