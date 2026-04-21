'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Sidebar } from '@/components/layout/Sidebar'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    const verifyToken = async () => {
      const token = localStorage.getItem('gm_token')
      if (!token) {
        router.replace('/login')
        return
      }
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL || 'https://yuhyun-sensor-monitoring-back.onrender.com'}/api/auth/me`,
          { headers: { Authorization: `Bearer ${token}` } }
        )
        if (!res.ok) throw new Error('unauthorized')
      } catch {
        localStorage.removeItem('gm_token')
        localStorage.removeItem('gm_user')
        router.replace('/login?expired=true')
        return
      }
      setChecking(false)
    }
    verifyToken()
  }, [router])

  if (checking) return (
    <div className="flex h-screen items-center justify-center bg-surface-page">
      <p className="font-mono text-sm text-ink-muted">로딩 중...</p>
    </div>
  )


  return (
    <div className="flex h-screen overflow-hidden bg-surface-page">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto pt-14 md:pt-0">
          {children}
        </div>
      </div>
    </div>
  )
}

