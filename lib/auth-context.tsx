'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

// ─── 타입 ─────────────────────────────────────────────────────────────────────
export interface AuthUser {
  userId:   string
  name:     string
  role:     string
  email:    string
}

interface AuthContextValue {
  user:    AuthUser | null
  login:   (user: AuthUser) => void
  logout:  () => void
}

// ─── Context ──────────────────────────────────────────────────────────────────
const AuthContext = createContext<AuthContextValue>({
  user:   null,
  login:  () => {},
  logout: () => {},
})

// ─── Provider ─────────────────────────────────────────────────────────────────
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)

  // 새로고침 후에도 유지 (sessionStorage 기반)
  useEffect(() => {
    try {
      const stored = sessionStorage.getItem('gm_user')
      if (stored) setUser(JSON.parse(stored))
    } catch {}
  }, [])

  const login = (u: AuthUser) => {
    setUser(u)
    try { sessionStorage.setItem('gm_user', JSON.stringify(u)) } catch {}
  }

  const logout = () => {
    setUser(null)
    try { sessionStorage.removeItem('gm_user') } catch {}
  }

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
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
