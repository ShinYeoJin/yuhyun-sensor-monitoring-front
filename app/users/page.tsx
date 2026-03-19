'use client'

import { useState } from 'react'
import type { User, UserRole, UserStatus } from '@/types'
import { mockSites } from '@/lib/mock-data'

// ─── 목 데이터 ────────────────────────────────────────────────────────────────
const initialUsers: User[] = [
  {
    id: 'u1', userId: 'admin01', name: '김관리자', password: '••••••••',
    role: 'Administrator', phone: '010-1234-5678',
    registeredBy: 'system', registeredAt: '2025-01-01T09:00:00Z',
    siteIds: [], status: 'active', lastLogin: '2026-03-16T14:00:00Z',
  },
  {
    id: 'u2', userId: 'mgr_a', name: '이현장', password: '••••••••',
    role: 'Manager', phone: '010-2345-6789',
    registeredBy: '김관리자', registeredAt: '2025-01-10T10:00:00Z',
    siteIds: ['site-a'], status: 'active', lastLogin: '2026-03-16T09:30:00Z',
  },
  {
    id: 'u3', userId: 'mgr_b', name: '최관리자', password: '••••••••',
    role: 'Manager', phone: '010-3456-7890',
    registeredBy: '김관리자', registeredAt: '2025-02-15T11:00:00Z',
    siteIds: ['site-b'], status: 'active', lastLogin: '2026-03-15T18:00:00Z',
  },
  {
    id: 'u4', userId: 'oper01', name: '박운영자', password: '••••••••',
    role: 'Operator', phone: '010-4567-8901',
    registeredBy: '김관리자', registeredAt: '2025-03-01T09:00:00Z',
    siteIds: ['site-a', 'site-b'], status: 'active', lastLogin: '2026-03-14T11:00:00Z',
  },
  {
    id: 'u5', userId: 'mon01', name: '정모니터', password: '••••••••',
    role: 'Monitor', phone: '010-5678-9012',
    registeredBy: '이현장', registeredAt: '2025-03-01T14:00:00Z',
    siteIds: ['site-c'], status: 'inactive', lastLogin: '2026-03-10T08:00:00Z',
  },
  {
    id: 'u6', userId: 'multi01', name: '한멀티', password: '••••••••',
    role: 'MultiMonitor', phone: '010-6789-0123',
    registeredBy: '김관리자', registeredAt: '2025-04-01T09:00:00Z',
    siteIds: [], status: 'deleted', lastLogin: '2026-02-01T08:00:00Z',
  },
]

// ─── 권한 설정 ────────────────────────────────────────────────────────────────
const roleConfig: Record<UserRole, { label: string; bg: string; text: string; border: string }> = {
  Administrator: { label: 'Administrator', bg: 'bg-alarm-infobg',       text: 'text-alarm-infotext',      border: 'border-alarm-infoborder'      },
  Manager:       { label: 'Manager',       bg: 'bg-sensor-normalbg',    text: 'text-sensor-normaltext',   border: 'border-sensor-normalborder'   },
  Operator:      { label: 'Operator',      bg: 'bg-sensor-warningbg',   text: 'text-sensor-warningtext',  border: 'border-sensor-warningborder'  },
  Monitor:       { label: 'Monitor',       bg: 'bg-surface-muted',      text: 'text-ink-sub',             border: 'border-line-strong'           },
  MultiMonitor:  { label: 'MultiMonitor',  bg: 'bg-surface-subtle',     text: 'text-ink-muted',           border: 'border-line'                  },
}
const roleOptions: UserRole[] = ['Administrator', 'Manager', 'Operator', 'Monitor', 'MultiMonitor']

// ─── 뷰 필터 탭 ───────────────────────────────────────────────────────────────
type ViewFilter = 'all' | 'active' | 'deleted' | 'inactive'
const viewFilters: { value: ViewFilter; label: string }[] = [
  { value: 'all',      label: '전체'    },
  { value: 'active',   label: '현재'    },
  { value: 'deleted',  label: '삭제'    },
  { value: 'inactive', label: '비활성화' },
]

// ─── 빈 폼 ────────────────────────────────────────────────────────────────────
type FormData = {
  userId:       string
  name:         string
  password:     string
  role:         UserRole
  phone:        string
  registeredBy: string
  siteIds:      string[]
  status:       UserStatus
}
const emptyForm: FormData = {
  userId: '', name: '', password: '', role: 'Monitor',
  phone: '', registeredBy: '', siteIds: [], status: 'active',
}

// ─── 스타일 상수 ──────────────────────────────────────────────────────────────
const inputCls = 'w-full rounded-lg border border-line bg-surface-subtle px-3 py-2 text-sm text-ink outline-none transition-colors placeholder:text-ink-muted focus:border-brand/50 focus:ring-2 focus:ring-brand/10'
const labelCls = 'mb-1.5 block font-mono text-[10px] font-semibold uppercase tracking-wider text-ink-muted'

// ─── 사용자 추가/편집 모달 ────────────────────────────────────────────────────
interface ModalProps {
  mode: 'add' | 'edit'
  form: FormData
  onChange: (f: FormData) => void
  onSubmit: () => void
  onClose: () => void
}

function UserModal({ mode, form, onChange, onSubmit, onClose }: ModalProps) {
  // 사용자명 + 핸드폰번호 필수
  const isValid = form.name.trim() !== '' && form.phone.trim() !== ''
  const set = (key: keyof FormData, val: string) => onChange({ ...form, [key]: val })

  const toggleSite = (siteId: string) => {
    const next = form.siteIds.includes(siteId)
      ? form.siteIds.filter(s => s !== siteId)
      : [...form.siteIds, siteId]
    onChange({ ...form, siteIds: next })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/30 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="geo-card flex w-full max-w-lg animate-fade-in-up flex-col" style={{ maxHeight: '90vh' }}
        onClick={e => e.stopPropagation()}>

        {/* 헤더 */}
        <div className="flex items-center justify-between border-b border-line px-6 py-4">
          <h2 className="text-sm font-semibold text-ink">
            {mode === 'add' ? '사용자 추가' : '사용자 편집'}
          </h2>
          <button onClick={onClose} className="rounded-md p-1 text-ink-muted transition-colors hover:bg-surface-subtle hover:text-ink">✕</button>
        </div>

        {/* 스크롤 영역 */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">

          {/* 사용자 ID + 비밀번호 */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>사용자 ID</label>
              <input type="text" value={form.userId} onChange={e => set('userId', e.target.value)}
                placeholder="login_id" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>비밀번호</label>
              <input type="password" value={form.password} onChange={e => set('password', e.target.value)}
                placeholder={mode === 'edit' ? '변경 시에만 입력' : '비밀번호 입력'} className={inputCls} />
            </div>
          </div>

          {/* 사용자명 + 핸드폰번호 (필수) */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>
                사용자명 <span className="text-sensor-dangertext">*</span>
              </label>
              <input type="text" value={form.name} onChange={e => set('name', e.target.value)}
                placeholder="홍길동" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>
                핸드폰번호 <span className="text-sensor-dangertext">*</span>
              </label>
              <input type="tel" value={form.phone} onChange={e => set('phone', e.target.value)}
                placeholder="010-0000-0000" className={inputCls} />
            </div>
          </div>

          {/* 사용자 권한 */}
          <div>
            <label className={labelCls}>사용자 권한</label>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
              {roleOptions.map(r => {
                const cfg = roleConfig[r]
                const isSelected = form.role === r
                return (
                  <button key={r} type="button" onClick={() => onChange({ ...form, role: r })}
                    className={[
                      'rounded-lg border px-2 py-2 text-center font-mono text-xs font-medium transition-all',
                      isSelected
                        ? `${cfg.bg} ${cfg.text} ${cfg.border}`
                        : 'border-line bg-surface-card text-ink-sub hover:border-line-strong hover:bg-surface-subtle',
                    ].join(' ')}>
                    {isSelected && <span className="mr-0.5">✓</span>}
                    {cfg.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* 등록자 */}
          <div>
            <label className={labelCls}>등록자</label>
            <input type="text" value={form.registeredBy} onChange={e => set('registeredBy', e.target.value)}
              placeholder="등록자 이름" className={inputCls} />
          </div>

          {/* 등록일시 — 추가 시 자동, 편집 시 표시만 */}
          {mode === 'add' && (
            <div className="rounded-lg border border-line bg-surface-subtle px-3 py-2">
              <p className={labelCls + ' mb-0'}>등록일시</p>
              <p className="mt-0.5 font-mono text-xs text-ink-muted">
                {new Date().toLocaleString('ko-KR')} (저장 시 자동 기록)
              </p>
            </div>
          )}

          {/* 계정 미사용 토글 */}
          <div className="flex items-center justify-between rounded-lg border border-line bg-surface-subtle px-4 py-3">
            <div>
              <p className="text-sm font-medium text-ink">계정 미사용</p>
              <p className="font-mono text-[10px] text-ink-muted">활성화 시 로그인 불가 처리</p>
            </div>
            <button
              type="button"
              onClick={() => onChange({ ...form, status: form.status === 'inactive' ? 'active' : 'inactive' })}
              className={[
                'relative h-6 w-11 rounded-full border-2 transition-all duration-200',
                form.status === 'inactive'
                  ? 'border-sensor-danger bg-sensor-danger'
                  : 'border-line-strong bg-surface-muted',
              ].join(' ')}
            >
              <span className={[
                'absolute top-0.5 h-4 w-4 rounded-full bg-surface-card shadow-card transition-all duration-200',
                form.status === 'inactive' ? 'left-4' : 'left-0.5',
              ].join(' ')} />
            </button>
          </div>

          {/* 담당 현장 */}
          <div>
            <label className={labelCls}>
              담당 현장
              <span className="ml-1 font-normal normal-case tracking-normal text-ink-muted">(미선택 시 전체)</span>
            </label>
            <div className="flex flex-wrap gap-2">
              {mockSites.map(site => {
                const isSelected = form.siteIds.includes(site.id)
                return (
                  <button key={site.id} type="button" onClick={() => toggleSite(site.id)}
                    className={[
                      'rounded-full border px-3 py-1 font-mono text-xs transition-all',
                      isSelected
                        ? 'border-brand/40 bg-brand/10 text-brand'
                        : 'border-line text-ink-muted hover:border-line-strong hover:text-ink-sub',
                    ].join(' ')}>
                    {isSelected && '✓ '}{site.name}
                  </button>
                )
              })}
            </div>
          </div>

          {/* 필수 항목 안내 */}
          {!isValid && (
            <p className="font-mono text-[11px] text-sensor-dangertext">
              * 사용자명과 핸드폰번호는 필수 입력 항목입니다.
            </p>
          )}
        </div>

        {/* 하단 버튼 */}
        <div className="flex gap-2 border-t border-line px-6 py-4">
          <button onClick={onClose}
            className="flex-1 rounded-lg border border-line px-4 py-2 text-sm font-medium text-ink-sub transition-colors hover:border-line-strong hover:text-ink">
            취소
          </button>
          <button onClick={onSubmit} disabled={!isValid}
            className="flex-1 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-40">
            {mode === 'add' ? '추가' : '저장'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── 삭제 / 상태 변경 확인 모달 ──────────────────────────────────────────────
function ConfirmModal({ user, action, onConfirm, onClose }: {
  user: User; action: 'delete' | 'inactive' | 'activate'
  onConfirm: () => void; onClose: () => void
}) {
  const config = {
    delete:   { icon: '⚠', iconCls: 'bg-sensor-dangerbg text-sensor-danger', btnCls: 'bg-sensor-danger', label: '삭제',    desc: '삭제된 계정은 목록에서 삭제 처리됩니다.' },
    inactive: { icon: '⚠', iconCls: 'bg-sensor-warningbg text-sensor-warning', btnCls: 'bg-sensor-warning', label: '비활성화', desc: '비활성화 시 해당 사용자는 로그인할 수 없습니다.' },
    activate: { icon: '✓', iconCls: 'bg-sensor-normalbg text-sensor-normal',  btnCls: 'bg-sensor-normal', label: '활성화',   desc: '활성화 시 해당 사용자가 다시 로그인할 수 있습니다.' },
  }[action]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/30 backdrop-blur-sm" onClick={onClose}>
      <div className="geo-card w-full max-w-sm animate-fade-in-up p-6 text-center" onClick={e => e.stopPropagation()}>
        <div className={`mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full text-xl ${config.iconCls}`}>
          {config.icon}
        </div>
        <h3 className="text-sm font-semibold text-ink">{user.name} 계정을 {config.label}하시겠습니까?</h3>
        <p className="mt-1.5 text-xs text-ink-muted">{config.desc}</p>
        <div className="mt-5 flex gap-2">
          <button onClick={onClose} className="flex-1 rounded-lg border border-line px-4 py-2 text-sm font-medium text-ink-sub transition-colors hover:bg-surface-subtle">취소</button>
          <button onClick={onConfirm} className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors hover:opacity-90 ${config.btnCls}`}>{config.label}</button>
        </div>
      </div>
    </div>
  )
}

// ─── 상태 뱃지 ───────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: UserStatus }) {
  const cfg = {
    active:   { label: '활성',    cls: 'border-sensor-normalborder  bg-sensor-normalbg  text-sensor-normaltext',  dot: 'bg-sensor-normal'  },
    inactive: { label: '비활성화', cls: 'border-sensor-warningborder bg-sensor-warningbg text-sensor-warningtext', dot: 'bg-sensor-warning' },
    deleted:  { label: '삭제',    cls: 'border-sensor-dangerborder  bg-sensor-dangerbg  text-sensor-dangertext',  dot: 'bg-sensor-danger'  },
  }[status]
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 font-mono text-[11px] font-medium ${cfg.cls}`}>
      <span className={`inline-block h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  )
}

// ─── 메인 페이지 ──────────────────────────────────────────────────────────────
export default function UsersPage() {
  const [users,         setUsers]         = useState<User[]>(initialUsers)
  const [viewFilter,    setViewFilter]    = useState<ViewFilter>('active')
  const [addOpen,       setAddOpen]       = useState(false)
  const [editTarget,    setEditTarget]    = useState<User | null>(null)
  const [confirmState,  setConfirmState]  = useState<{ user: User; action: 'delete' | 'inactive' | 'activate' } | null>(null)
  const [form,          setForm]          = useState<FormData>(emptyForm)
  const [toast,         setToast]         = useState<string | null>(null)

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 2500) }

  // 통계
  const totalCount    = users.length
  const activeCount   = users.filter(u => u.status === 'active').length
  const inactiveCount = users.filter(u => u.status === 'inactive').length
  const deletedCount  = users.filter(u => u.status === 'deleted').length

  // 필터 적용
  const filtered = viewFilter === 'all'
    ? users
    : users.filter(u => u.status === viewFilter)

  const openAdd = () => { setForm(emptyForm); setAddOpen(true) }
  const openEdit = (user: User) => {
    setForm({ userId: user.userId, name: user.name, password: user.password,
      role: user.role, phone: user.phone, registeredBy: user.registeredBy,
      siteIds: [...user.siteIds], status: user.status })
    setEditTarget(user)
  }

  const handleAdd = () => {
    const newUser: User = {
      id: `u${Date.now()}`, ...form,
      registeredAt: new Date().toISOString(),
      lastLogin: '—',
    }
    setUsers(prev => [...prev, newUser])
    setAddOpen(false)
    showToast(`'${form.name}' 사용자가 추가되었습니다.`)
  }

  const handleEdit = () => {
    if (!editTarget) return
    setUsers(prev => prev.map(u => u.id === editTarget.id ? { ...u, ...form } : u))
    setEditTarget(null)
    showToast(`'${form.name}' 정보가 수정되었습니다.`)
  }

  const handleConfirm = () => {
    if (!confirmState) return
    const { user, action } = confirmState
    const nextStatus: UserStatus =
      action === 'delete' ? 'deleted' : action === 'inactive' ? 'inactive' : 'active'
    setUsers(prev => prev.map(u => u.id === user.id ? { ...u, status: nextStatus } : u))
    const label = action === 'delete' ? '삭제' : action === 'inactive' ? '비활성화' : '활성화'
    showToast(`'${user.name}' 계정이 ${label}되었습니다.`)
    setConfirmState(null)
  }

  // 뷰 필터 탭 스타일
  const tabCls = (val: ViewFilter) => [
    'rounded-full border px-3 py-1 font-mono text-[11px] font-medium transition-colors',
    viewFilter === val
      ? val === 'active'   ? 'border-sensor-normalborder  bg-sensor-normalbg  text-sensor-normaltext'
      : val === 'inactive' ? 'border-sensor-warningborder bg-sensor-warningbg text-sensor-warningtext'
      : val === 'deleted'  ? 'border-sensor-dangerborder  bg-sensor-dangerbg  text-sensor-dangertext'
      : 'border-line-strong bg-surface-muted text-ink'
      : 'border-line text-ink-muted hover:border-line-strong hover:text-ink-sub',
  ].join(' ')

  return (
    <div className="flex-1 overflow-y-auto bg-surface-page">

      {/* 헤더 */}
      <div className="sticky top-0 z-10 border-b border-line bg-surface-card/90 px-6 py-3 backdrop-blur-md">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-[15px] font-semibold text-ink">사용자 관리</h1>
            {/* 통계 요약 */}
            <div className="mt-0.5 flex items-center gap-3 font-mono text-xs">
              <span className="text-ink-muted">전체 <strong className="text-ink">{totalCount}</strong>명</span>
              <span className="text-sensor-normaltext">활성 <strong>{activeCount}</strong>명</span>
              {inactiveCount > 0 && <span className="text-sensor-warningtext">비활성화 <strong>{inactiveCount}</strong>명</span>}
              {deletedCount  > 0 && <span className="text-sensor-dangertext">삭제 <strong>{deletedCount}</strong>명</span>}
            </div>
          </div>
          <button onClick={openAdd}
            className="flex items-center gap-1.5 rounded-lg bg-brand px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-brand-hover">
            + 사용자 추가
          </button>
        </div>

        {/* 뷰 필터 탭 */}
        <div className="mt-3 flex gap-1">
          {viewFilters.map(f => (
            <button key={f.value} onClick={() => setViewFilter(f.value)} className={tabCls(f.value)}>
              {f.label}
              <span className="ml-1 opacity-60">
                {f.value === 'all'      ? totalCount
                : f.value === 'active'  ? activeCount
                : f.value === 'inactive'? inactiveCount
                :                         deletedCount}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* 테이블 */}
      <div className="p-6">
        <div className="geo-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line bg-surface-subtle">
                {['사용자명', '사용자 ID', '권한', '핸드폰번호', '담당 현장', '등록자 / 등록일', '마지막 로그인', '상태', ''].map(h => (
                  <th key={h} className="px-4 py-3 text-left font-mono text-[10px] font-semibold uppercase tracking-wide text-ink-muted">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-10 text-center text-sm text-ink-muted">
                    해당하는 사용자가 없습니다.
                  </td>
                </tr>
              ) : filtered.map(user => {
                const role = roleConfig[user.role]
                const isDeleted = user.status === 'deleted'
                return (
                  <tr key={user.id} className={[
                    'transition-colors hover:bg-surface-subtle',
                    isDeleted ? 'opacity-40' : '',
                  ].join(' ')}>
                    {/* 사용자명 */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border font-mono text-xs font-semibold ${role.bg} ${role.text} ${role.border}`}>
                          {user.name[0]}
                        </div>
                        <span className="font-medium text-ink">{user.name}</span>
                      </div>
                    </td>
                    {/* 사용자 ID */}
                    <td className="px-4 py-3 font-mono text-xs text-ink-sub">{user.userId || '—'}</td>
                    {/* 권한 */}
                    <td className="px-4 py-3">
                      <span className={`inline-block rounded-full border px-2.5 py-0.5 font-mono text-[11px] font-medium ${role.bg} ${role.text} ${role.border}`}>
                        {role.label}
                      </span>
                    </td>
                    {/* 핸드폰 */}
                    <td className="px-4 py-3 font-mono text-xs text-ink-sub">{user.phone || '—'}</td>
                    {/* 담당 현장 */}
                    <td className="px-4 py-3 font-mono text-xs text-ink-sub">
                      {user.siteIds.length === 0 ? <span className="text-ink-muted">전체</span> : user.siteIds.join(', ')}
                    </td>
                    {/* 등록자 / 등록일 */}
                    <td className="px-4 py-3">
                      <p className="font-mono text-xs text-ink-sub">{user.registeredBy || '—'}</p>
                      <p className="font-mono text-[10px] text-ink-muted">
                        {user.registeredAt ? new Date(user.registeredAt).toLocaleDateString('ko-KR') : '—'}
                      </p>
                    </td>
                    {/* 마지막 로그인 */}
                    <td className="px-4 py-3 font-mono text-[11px] text-ink-muted">
                      {user.lastLogin === '—' ? '—' : new Date(user.lastLogin).toLocaleString('ko-KR', {
                        month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
                      })}
                    </td>
                    {/* 상태 */}
                    <td className="px-4 py-3"><StatusBadge status={user.status} /></td>
                    {/* 액션 */}
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      {!isDeleted && (
                        <>
                          <button onClick={() => openEdit(user)} className="mr-2 font-mono text-xs text-ink-muted transition-colors hover:text-brand">편집</button>
                          {user.status === 'active'
                            ? <button onClick={() => setConfirmState({ user, action: 'inactive' })} className="mr-2 font-mono text-xs text-ink-muted transition-colors hover:text-sensor-warning">비활성화</button>
                            : <button onClick={() => setConfirmState({ user, action: 'activate' })} className="mr-2 font-mono text-xs text-ink-muted transition-colors hover:text-sensor-normal">활성화</button>
                          }
                          <button onClick={() => setConfirmState({ user, action: 'delete' })} className="font-mono text-xs text-ink-muted transition-colors hover:text-sensor-danger">삭제</button>
                        </>
                      )}
                      {isDeleted && <span className="font-mono text-[10px] text-ink-muted">삭제됨</span>}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 토스트 */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 animate-fade-in-up rounded-xl border border-line bg-ink px-5 py-3 font-mono text-sm text-white shadow-cardhover">
          {toast}
        </div>
      )}

      {addOpen    && <UserModal mode="add"  form={form} onChange={setForm} onSubmit={handleAdd}  onClose={() => setAddOpen(false)} />}
      {editTarget && <UserModal mode="edit" form={form} onChange={setForm} onSubmit={handleEdit} onClose={() => setEditTarget(null)} />}
      {confirmState && <ConfirmModal user={confirmState.user} action={confirmState.action} onConfirm={handleConfirm} onClose={() => setConfirmState(null)} />}
    </div>
  )
}
