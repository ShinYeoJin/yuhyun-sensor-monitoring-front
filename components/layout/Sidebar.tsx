'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth, DEFAULT_USER } from '@/lib/auth-context'
import { alarmApi, userApi } from '@/lib/api'

const navGroups = [
  {
    label: '모니터링',
    items: [
      { href: '/dashboard', label: '대시보드', icon: '◈', showBadge: false },
      { href: '/sensors',   label: '센서 관리', icon: '⊕', showBadge: false },
      { href: '/alarms',    label: '알람',      icon: '△', showBadge: true  },
    ],
  },
  {
    label: '현장',
    items: [
      { href: '/sites', label: '현장 관리',  icon: '⊞', showBadge: false },
      { href: '/users', label: '사용자 관리', icon: '◎', showBadge: false },
      { href: '/files', label: '파일 관리',  icon: '□',  showBadge: false },
    ],
  },
]

// ─── 사이드바 내용 (데스크탑 + 모바일 드로어 공용) ───────────────────────────
function SidebarContent({
  unreadCount,
  onClose,
}: {
  unreadCount: number
  onClose?: () => void
}) {
  const pathname = usePathname()
  const { user } = useAuth()
  const currentUser = user ?? DEFAULT_USER

  const [pwOpen,   setPwOpen]   = useState(false)
  const [pwForm,   setPwForm]   = useState({ current: '', next: '', confirm: '' })
  const [pwError,  setPwError]  = useState('')
  const [pwSaving, setPwSaving] = useState(false)

  const handlePwChange = async () => {
    setPwError('')
    if (pwForm.next !== pwForm.confirm) {
      setPwError('새 비밀번호가 일치하지 않습니다.')
      return
    }
    if (pwForm.next.length < 6) {
      setPwError('새 비밀번호는 6자 이상이어야 합니다.')
      return
    }
    setPwSaving(true)
    try {
      await userApi.changePassword(Number(user?.userId), {
        currentPassword: pwForm.current,
        newPassword: pwForm.next,
      })
      setPwOpen(false)
      setPwForm({ current: '', next: '', confirm: '' })
    } catch (e: any) {
      setPwError(e.message || '변경 실패')
    } finally {
      setPwSaving(false)
    }
  }


  return (
    <div className="flex h-full flex-col">
      {/* 로고 */}
      <div className="flex h-14 items-center justify-between border-b border-line px-5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-brand font-mono text-[13px] font-medium text-white">
            GM
          </div>
          <div className="leading-tight">
            <p className="text-[13px] font-semibold tracking-wide text-ink">GEOMONITOR</p>
            <p className="font-mono text-[10px] text-ink-muted">계측 모니터링 시스템</p>
          </div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="rounded-md p-1 text-ink-muted transition-colors hover:bg-surface-subtle hover:text-ink"
          >
            ✕
          </button>
        )}
      </div>

      {/* 네비게이션 */}
      <nav className="flex-1 overflow-y-auto px-2 py-3">
        {navGroups.map((group) => (
          <div key={group.label} className="mb-1">
            <p className="px-3 pb-1 pt-3 font-mono text-[10px] font-semibold uppercase tracking-[1.5px] text-ink-muted">
              {group.label}
            </p>
            {group.items.map((item) => {
              const isActive = pathname.startsWith(item.href)
              const badge = item.showBadge ? unreadCount : 0
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onClose}
                  className={[
                    'flex items-center gap-2.5 rounded-md px-3 py-2 text-[13px] transition-colors',
                    isActive
                      ? 'border border-brand/20 bg-brand/10 font-medium text-brand'
                      : 'border border-transparent text-ink-sub hover:bg-surface-subtle hover:text-ink',
                  ].join(' ')}
                >
                  <span className="w-4 shrink-0 text-center text-[13px] leading-none">{item.icon}</span>
                  <span className="flex-1">{item.label}</span>
                  {badge > 0 && (
                    <span className="ml-auto flex h-4 min-w-[16px] items-center justify-center rounded-full bg-sensor-danger px-1 font-mono text-[10px] font-medium text-white">
                      {badge}
                    </span>
                  )}
                </Link>
              )
            })}
          </div>
        ))}
      </nav>

      {/* 하단 유저 영역 */}
      <div className="border-t border-line px-2 py-3">
        <div className="flex items-center gap-2.5 rounded-md px-3 py-2">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-alarm-infoborder bg-alarm-infobg font-mono text-xs font-semibold text-alarm-infotext">
            {currentUser.name[0]}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium text-ink">{currentUser.name}</p>
            <p className="truncate font-mono text-[10px] text-ink-muted">{currentUser.email}</p>
          </div>
        </div>
        <button
          onClick={() => { setPwOpen(true); setPwError(''); setPwForm({ current: '', next: '', confirm: '' }) }}
          className="mt-0.5 flex w-full items-center gap-2 rounded-md px-3 py-2 text-xs text-ink-muted transition-colors hover:bg-surface-subtle hover:text-ink-sub"
        >
          <span>🔑</span> 비밀번호 변경
        </button>
        <Link
          href="/logout"
          onClick={onClose}
          className="mt-0.5 flex w-full items-center gap-2 rounded-md px-3 py-2 text-xs text-ink-muted transition-colors hover:bg-surface-subtle hover:text-ink-sub"
        >
          <span>⎋</span> 로그아웃
        </Link>
        <p className="px-3 pt-1 pb-2 font-mono text-[10px] text-ink-muted">v1.0.0</p>
      </div>

      {pwOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/30 backdrop-blur-sm p-4"
          onClick={() => setPwOpen(false)}>
          <div className="geo-card flex w-full max-w-sm animate-fade-in-up flex-col"
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-line px-6 py-4">
              <h2 className="text-sm font-semibold text-ink">비밀번호 변경</h2>
              <button onClick={() => setPwOpen(false)}
                className="rounded-md p-1 text-ink-muted hover:bg-surface-subtle hover:text-ink">✕</button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="mb-1.5 block font-mono text-[10px] font-semibold uppercase tracking-wider text-ink-muted">현재 비밀번호</label>
                <input type="password" value={pwForm.current}
                  onChange={e => setPwForm(f => ({ ...f, current: e.target.value }))}
                  placeholder="현재 비밀번호 입력"
                  className="w-full rounded-lg border border-line bg-surface-subtle px-3 py-2 text-sm text-ink outline-none focus:border-brand/50 focus:ring-2 focus:ring-brand/10" />
              </div>
              <div>
                <label className="mb-1.5 block font-mono text-[10px] font-semibold uppercase tracking-wider text-ink-muted">새 비밀번호</label>
                <input type="password" value={pwForm.next}
                  onChange={e => setPwForm(f => ({ ...f, next: e.target.value }))}
                  placeholder="새 비밀번호 입력 (6자 이상)"
                  className="w-full rounded-lg border border-line bg-surface-subtle px-3 py-2 text-sm text-ink outline-none focus:border-brand/50 focus:ring-2 focus:ring-brand/10" />
              </div>
              <div>
                <label className="mb-1.5 block font-mono text-[10px] font-semibold uppercase tracking-wider text-ink-muted">새 비밀번호 확인</label>
                <input type="password" value={pwForm.confirm}
                  onChange={e => setPwForm(f => ({ ...f, confirm: e.target.value }))}
                  placeholder="새 비밀번호 재입력"
                  className="w-full rounded-lg border border-line bg-surface-subtle px-3 py-2 text-sm text-ink outline-none focus:border-brand/50 focus:ring-2 focus:ring-brand/10" />
              </div>
              {pwError && (
                <div className="rounded-lg border border-sensor-dangerborder bg-sensor-dangerbg px-4 py-2.5">
                  <p className="font-mono text-xs text-sensor-dangertext">{pwError}</p>
                </div>
              )}
            </div>
            <div className="flex gap-2 border-t border-line px-6 py-4">
              <button onClick={() => setPwOpen(false)}
                className="flex-1 rounded-lg border border-line px-4 py-2 text-sm font-medium text-ink-sub hover:border-line-strong hover:text-ink">
                취소
              </button>
              <button onClick={handlePwChange} disabled={pwSaving || !pwForm.current || !pwForm.next || !pwForm.confirm}
                className="flex-1 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover disabled:opacity-50">
                {pwSaving ? '변경 중...' : '변경'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── 통합 Sidebar 컴포넌트 ───────────────────────────────────────────────────
// 데스크탑: 좌측 고정 / 모바일: 햄버거 버튼 + 슬라이드 드로어
export function Sidebar() {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    const fetchCount = async () => {
      try {
        const data = await alarmApi.getAll()
        setUnreadCount(data.filter((a: any) => !a.is_acknowledged).length)
      } catch {}
    }
    fetchCount()
    const interval = setInterval(fetchCount, 60000)
    return () => clearInterval(interval)
  }, [])

  return (
    <>
      {/* ── 데스크탑 고정 사이드바 (md 이상) ── */}
      <aside className="hidden md:flex h-screen w-[220px] shrink-0 flex-col border-r border-line bg-surface-card">
        <SidebarContent unreadCount={unreadCount} />
      </aside>

      {/* ── 모바일 상단 헤더 바 (md 미만) ── */}
      <header className="fixed top-0 left-0 right-0 z-30 flex h-14 items-center justify-between border-b border-line bg-surface-card/95 px-4 backdrop-blur-md md:hidden">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-brand font-mono text-[13px] font-medium text-white">
            GM
          </div>
          <p className="text-[13px] font-semibold tracking-wide text-ink">GEOMONITOR</p>
        </Link>
        <div className="flex items-center gap-2">
          {/* 미처리 알람 수 빠른 링크 */}
          {unreadCount > 0 && (
            <Link
              href="/alarms"
              className="flex h-7 min-w-[28px] items-center justify-center rounded-full bg-sensor-danger px-1.5 font-mono text-[10px] font-medium text-white"
            >
              {unreadCount}
            </Link>
          )}
          {/* 햄버거 버튼 */}
          <button
            onClick={() => setDrawerOpen(true)}
            className="flex h-9 w-9 flex-col items-center justify-center gap-[5px] rounded-md transition-colors hover:bg-surface-subtle"
            aria-label="메뉴 열기"
          >
            <span className="block h-0.5 w-5 rounded-full bg-ink" />
            <span className="block h-0.5 w-5 rounded-full bg-ink" />
            <span className="block h-0.5 w-3.5 self-start rounded-full bg-ink" />
          </button>
        </div>
      </header>

      {/* ── 모바일 드로어 오버레이 ── */}
      {drawerOpen && (
        <div
          className="fixed inset-0 z-40 bg-ink/40 backdrop-blur-sm md:hidden"
          onClick={() => setDrawerOpen(false)}
        />
      )}

      {/* ── 모바일 슬라이드 드로어 ── */}
      <aside
        className={[
          'fixed top-0 left-0 z-50 h-full w-[260px] bg-surface-card shadow-cardhover',
          'transition-transform duration-300 ease-in-out md:hidden',
          drawerOpen ? 'translate-x-0' : '-translate-x-full',
        ].join(' ')}
      >
        <SidebarContent
          unreadCount={unreadCount}
          onClose={() => setDrawerOpen(false)}
        />
      </aside>
    </>
  )
}
