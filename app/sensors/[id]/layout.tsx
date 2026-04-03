'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'

export default function SensorDetailLayout({ children }: { children: React.ReactNode }) {
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

  return <>{children}</>
}