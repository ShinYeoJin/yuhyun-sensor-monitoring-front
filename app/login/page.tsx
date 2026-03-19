'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'

type Mode = 'login' | 'signup'

// 테스트 계정 목록
const TEST_ACCOUNTS = [
  { userId: 'admin01', password: '1234', name: '김관리자', role: 'Administrator', email: 'admin@geo.co.kr' },
  { userId: 'mgr_a',  password: '1234', name: '이현장',   role: 'Manager',       email: 'site-a@geo.co.kr' },
]

export default function LoginPage() {
  const router  = useRouter()
  const { login } = useAuth()

  const [mode,     setMode]     = useState<Mode>('login')
  const [userId,   setUserId]   = useState('')
  const [password, setPassword] = useState('')
  const [name,     setName]     = useState('')
  const [phone,    setPhone]    = useState('')
  const [confirm,  setConfirm]  = useState('')
  const [error,    setError]    = useState('')
  const [success,  setSuccess]  = useState('')

  const inputCls = 'w-full rounded-xl border border-line bg-surface-subtle px-4 py-2.5 text-sm text-ink outline-none transition-colors placeholder:text-ink-muted focus:border-brand/50 focus:ring-2 focus:ring-brand/10'

  const handleLogin = () => {
    setError('')
    if (!userId.trim() || !password.trim()) {
      setError('아이디와 비밀번호를 입력해 주세요.')
      return
    }
    const account = TEST_ACCOUNTS.find(a => a.userId === userId && a.password === password)
    if (account) {
      login({ userId: account.userId, name: account.name, role: account.role, email: account.email })
      router.replace('/dashboard')
    } else {
      setError('아이디 또는 비밀번호가 올바르지 않습니다.')
    }
  }

  const handleSignup = () => {
    setError('')
    if (!userId.trim() || !password.trim() || !name.trim() || !phone.trim()) {
      setError('필수 항목을 모두 입력해 주세요.')
      return
    }
    if (password !== confirm) {
      setError('비밀번호가 일치하지 않습니다.')
      return
    }
    setSuccess('회원가입이 완료되었습니다. 로그인해 주세요.')
    setMode('login')
    setPassword(''); setConfirm(''); setName(''); setPhone('')
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-surface-page p-4">
      <div className="w-full max-w-sm space-y-5">
        <div className="text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand font-mono text-lg font-medium text-white shadow-cardhover">
            GM
          </div>
          <h1 className="text-xl font-semibold text-ink">GEOMONITOR</h1>
          <p className="mt-1 font-mono text-xs text-ink-muted">계측 모니터링 시스템</p>
        </div>

        <div className="flex rounded-xl border border-line bg-surface-subtle p-1">
          {(['login','signup'] as Mode[]).map(m => (
            <button key={m} onClick={() => { setMode(m); setError(''); setSuccess('') }}
              className={['flex-1 rounded-lg py-2 font-mono text-xs font-medium transition-all',
                mode === m ? 'bg-surface-card text-brand shadow-card' : 'text-ink-muted hover:text-ink-sub'].join(' ')}>
              {m === 'login' ? '로그인' : '회원가입'}
            </button>
          ))}
        </div>

        <div className="geo-card p-6 space-y-4">
          {success && <div className="rounded-lg border border-sensor-normalborder bg-sensor-normalbg px-3 py-2.5 font-mono text-xs text-sensor-normaltext">✓ {success}</div>}
          {error   && <div className="rounded-lg border border-sensor-dangerborder bg-sensor-dangerbg px-3 py-2.5 font-mono text-xs text-sensor-dangertext">⚠ {error}</div>}

          <div>
            <label className="mb-1.5 block font-mono text-[10px] font-semibold uppercase tracking-wider text-ink-muted">사용자 ID *</label>
            <input type="text" value={userId} onChange={e => setUserId(e.target.value)}
              placeholder="login_id" className={inputCls}
              onKeyDown={e => e.key === 'Enter' && mode === 'login' && handleLogin()} />
          </div>

          {mode === 'signup' && (
            <>
              <div>
                <label className="mb-1.5 block font-mono text-[10px] font-semibold uppercase tracking-wider text-ink-muted">사용자명 *</label>
                <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="홍길동" className={inputCls} />
              </div>
              <div>
                <label className="mb-1.5 block font-mono text-[10px] font-semibold uppercase tracking-wider text-ink-muted">핸드폰번호 *</label>
                <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="010-0000-0000" className={inputCls} />
              </div>
            </>
          )}

          <div>
            <label className="mb-1.5 block font-mono text-[10px] font-semibold uppercase tracking-wider text-ink-muted">비밀번호 *</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)}
              placeholder="비밀번호 입력" className={inputCls}
              onKeyDown={e => e.key === 'Enter' && mode === 'login' && handleLogin()} />
          </div>

          {mode === 'signup' && (
            <div>
              <label className="mb-1.5 block font-mono text-[10px] font-semibold uppercase tracking-wider text-ink-muted">비밀번호 확인 *</label>
              <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)}
                placeholder="비밀번호 재입력" className={inputCls} />
            </div>
          )}

          <button onClick={mode === 'login' ? handleLogin : handleSignup}
            className="w-full rounded-xl bg-brand py-2.5 text-sm font-medium text-white transition-colors hover:bg-brand-hover">
            {mode === 'login' ? '로그인' : '회원가입'}
          </button>

          {mode === 'login' && (
            <div className="rounded-lg bg-surface-subtle px-3 py-2.5">
              <p className="font-mono text-[10px] text-ink-muted mb-1">테스트 계정</p>
              {TEST_ACCOUNTS.map(a => (
                <button key={a.userId} type="button"
                  onClick={() => { setUserId(a.userId); setPassword(a.password) }}
                  className="block font-mono text-[11px] text-brand hover:underline">
                  {a.userId} / {a.password} ({a.name})
                </button>
              ))}
            </div>
          )}
        </div>

        <p className="text-center font-mono text-[10px] text-ink-muted">
          © 2026 GeoMonitor. 계측 모니터링 시스템
        </p>
      </div>
    </main>
  )
}
