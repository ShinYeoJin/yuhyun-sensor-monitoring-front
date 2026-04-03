'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { Sidebar } from '@/components/layout/Sidebar'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const router = useRouter()
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => {
      setChecking(false)
      if (!user) {
        router.replace('/login')
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [user, router])

  if (checking) return (
    <div className="flex h-screen items-center justify-center bg-surface-page">
      <p className="font-mono text-sm text-ink-muted">로딩 중...</p>
    </div>
  )

  if (!user) return null

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