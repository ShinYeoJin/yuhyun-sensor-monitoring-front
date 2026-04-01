'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { authApi } from './api'

// ─── 타입 ─────────────────────────────────────────────────────────────────────
export interface AuthUser {
  userId:   string
  name:     string
  role:     string
  email:    string
}

interface AuthContextValue {
  user:    AuthUser | null
  token:   string | null
  login:   (email: string, password: string) => Promise<void>
  logout:  () => void
}

// ─── Context ──────────────────────────────────────────────────────────────────
const AuthContext = createContext<AuthContextValue>({
  user:   null,
  token:  null,
  login:  async () => {},
  logout: () => {},
})

// ─── Provider ─────────────────────────────────────────────────────────────────
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user,  setUser]  = useState<AuthUser | null>(null)
  const [token, setToken] = useState<string | null>(null)

  useEffect(() => {
    try {
      const storedUser  = sessionStorage.getItem('gm_user')
      const storedToken = sessionStorage.getItem('gm_token')
      if (storedUser && storedToken) {
        setUser(JSON.parse(storedUser))
        setToken(storedToken)
      }
    } catch {}
  }, [])

  const login = async (email: string, password: string) => {
    const data = await authApi.login({ email, password })
    const u: AuthUser = {
      userId: String(data.user.id),
      name:   data.user.username,
      role:   data.user.role,
      email:  data.user.email,
    }
    setUser(u)
    setToken(data.token)
    try {
      sessionStorage.setItem('gm_user',  JSON.stringify(u))
      sessionStorage.setItem('gm_token', data.token)
    } catch {}
  }

  const logout = () => {
    setUser(null)
    setToken(null)
    try {
      sessionStorage.removeItem('gm_user')
      sessionStorage.removeItem('gm_token')
    } catch {}
  }

  return (
    <AuthContext.Provider value={{ user, token, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

// ─── Hook ─────────────────────────────────────────────────────────────────────
export function useAuth() {
  return useContext(AuthContext)
}

// ─── 기본 로그인 사용자 (미로그인 시 폴백) ──────────────────────────────────
export const DEFAULT_USER: AuthUser = {
  userId: 'admin01',
  name:   '김관리자',
  role:   'Administrator',
  email:  'admin@geo.co.kr',
}