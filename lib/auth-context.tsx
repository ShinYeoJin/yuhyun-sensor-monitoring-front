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
  loading: boolean
  login:   (email: string, password: string) => Promise<void>
  logout:  () => void
}


// ─── Context ──────────────────────────────────────────────────────────────────
const AuthContext = createContext<AuthContextValue>({
  user:    null,
  token:   null,
  loading: true,
  login:   async () => {},
  logout:  () => {},
})

// ─── Provider ─────────────────────────────────────────────────────────────────
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user,    setUser]    = useState<AuthUser | null>(null)
  const [token,   setToken]   = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const verify = async () => {
      try {
        const storedUser  = localStorage.getItem('gm_user')
        const storedToken = localStorage.getItem('gm_token')
        if (storedUser && storedToken) {
          const me = await authApi.me()
          const u: AuthUser = {
            userId: String(me.id),
            name:   me.username,
            role:   me.role,
            email:  me.email,
          }
          setUser(u)
          setToken(storedToken)
          localStorage.setItem('gm_user', JSON.stringify(u))
        }
      } catch {
        localStorage.removeItem('gm_token')
        localStorage.removeItem('gm_user')
        if (
          typeof window !== 'undefined' &&
          !window.location.pathname.startsWith('/login') &&
          !window.location.pathname.startsWith('/qr')
        ) {
          window.location.href = '/login?expired=true'
        }
      } finally {
        setLoading(false)
      }
    }
    verify()
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
      localStorage.setItem('gm_user',  JSON.stringify(u))
      localStorage.setItem('gm_token', data.token)
    } catch {}
  }

  const logout = () => {
    setUser(null)
    setToken(null)
    try {
      localStorage.removeItem('gm_user')
      localStorage.removeItem('gm_token')
    } catch {}
  }

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout }}>
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