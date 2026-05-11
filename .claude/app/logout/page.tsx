'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'

export default function LogoutPage() {
  const router = useRouter()
  const { logout } = useAuth()

  useEffect(() => {
    logout()
    router.replace('/login')
  }, [])

  return (
    <main className="flex min-h-screen items-center justify-center bg-surface-page">
      <div className="text-center">
        <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-line border-t-brand" />
        <p className="font-mono text-sm text-ink-muted">로그아웃 중...</p>
      </div>
    </main>
  )
}
