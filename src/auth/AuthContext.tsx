import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { authApi } from '@/api/endpoints'
import type { LoginRequest, SignUpRequest } from '@/api/types'
import { tokenStorage, type StoredAuth } from './tokenStorage'

interface AuthContextValue {
  auth: StoredAuth | null
  isAuthenticated: boolean
  login: (body: LoginRequest) => Promise<void>
  signUp: (body: SignUpRequest) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [auth, setAuth] = useState<StoredAuth | null>(() => tokenStorage.get())
  const queryClient = useQueryClient()

  // 토큰 재발급에 실패하면 client.ts가 이 이벤트를 보냅니다.
  useEffect(() => {
    const onLogout = () => {
      setAuth(null)
      queryClient.clear()
    }
    window.addEventListener('nubi:logout', onLogout)
    return () => window.removeEventListener('nubi:logout', onLogout)
  }, [queryClient])

  const login = useCallback(async (body: LoginRequest) => {
    const token = await authApi.login(body)
    tokenStorage.save(token)
    setAuth(token)
  }, [])

  const signUp = useCallback(async (body: SignUpRequest) => {
    const token = await authApi.signUp(body)
    tokenStorage.save(token)
    setAuth(token)
  }, [])

  const logout = useCallback(async () => {
    try {
      await authApi.logout()
    } catch {
      /* 서버 로그아웃이 실패해도 로컬 토큰은 지웁니다. */
    }
    tokenStorage.clear()
    setAuth(null)
    queryClient.clear()
  }, [queryClient])

  const value = useMemo(
    () => ({ auth, isAuthenticated: !!auth, login, signUp, logout }),
    [auth, login, signUp, logout],
  )
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth는 AuthProvider 안에서 써야 합니다.')
  return ctx
}
