'use client'

import { useState, useEffect } from 'react'
import { userApi, authApi } from '@/lib/api'
import { useAuth } from '@/lib/auth-context'

type ViewFilter = 'all' | 'active' | 'deleted' | 'inactive'
const viewFilters: { value: ViewFilter; label: string }[] = [
  { value: 'all',      label: '전체'    },
  { value: 'active',   label: '현재'    },
  { value: 'deleted',  label: '삭제'    },
  { value: 'inactive', label: '비활성화' },
]

const ROLES = ['admin', 'Administrator', 'Manager', 'Operator', 'Monitor', 'MultiMonitor']

const inputCls = 'w-full rounded-lg border border-line bg-surface-subtle px-3 py-2 text-sm text-ink outline-none transition-colors placeholder:text-ink-muted focus:border-brand/50 focus:ring-2 focus:ring-brand/10'
const labelCls = 'mb-1.5 block font-mono text-[10px] font-semibold uppercase tracking-wider text-ink-muted'

function UserModal({ mode, user, onSubmit, onClose }: {
  mode: 'add' | 'edit'
  user?: any
  onSubmit: (data: any) => void
  onClose: () => void
}) {
  const [form, setForm] = useState({
    username: user?.username || '',
    email: user?.email || '',
    password: '',
    role: user?.role || 'user',
    phone: user?.phone || ''
  })
  const isValid = form.username.trim() !== '' && form.email.trim() !== '' && (mode === 'edit' || form.password.trim() !== '')

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/30 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="geo-card flex w-full max-w-lg animate-fade-in-up flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-line px-6 py-4">
          <h2 className="text-sm font-semibold text-ink">{mode === 'add' ? '사용자 추가' : '사용자 수정'}</h2>
          <button onClick={onClose} className="rounded-md p-1 text-ink-muted hover:bg-surface-subtle hover:text-ink">✕</button>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div>
            <label className={labelCls}>사용자 ID (username) *</label>
            <input type="text" value={form.username} onChange={e => setForm({...form, username: e.target.value})}
              placeholder="login_id" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>이메일 *</label>
            <input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})}
              placeholder="email@example.com" className={inputCls} />
          </div>
          {mode === 'add' && (
            <div>
              <label className={labelCls}>비밀번호 *</label>
              <input type="password" value={form.password} onChange={e => setForm({...form, password: e.target.value})}
                placeholder="비밀번호 입력" className={inputCls} />
            </div>
          )}
          <div>
            <label className={labelCls}>핸드폰번호</label>
            <input type="tel" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})}
              placeholder="010-0000-0000" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>권한</label>
            <div className="grid grid-cols-3 gap-2">
              {ROLES.map(r => (
                <button key={r} type="button" onClick={() => setForm({...form, role: r})}
                  className={['rounded-lg border py-2 font-mono text-xs font-medium transition-all',
                    form.role === r ? 'border-brand/40 bg-brand/10 text-brand' : 'border-line text-ink-muted hover:border-line-strong'].join(' ')}>
                  {r === 'admin' ? 'Admin' : r}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="flex gap-2 border-t border-line px-6 py-4">
          <button onClick={onClose} className="flex-1 rounded-lg border border-line px-4 py-2 text-sm font-medium text-ink-sub hover:border-line-strong hover:text-ink">취소</button>
          <button onClick={() => onSubmit(form)} disabled={!isValid}
            className="flex-1 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover disabled:opacity-40">
            {mode === 'add' ? '추가' : '저장'}
          </button>
        </div>
      </div>
    </div>
  )
}

function ConfirmModal({ user, action, onConfirm, onClose }: {
  user: any; action: 'delete' | 'inactive' | 'activate'; onConfirm: () => void; onClose: () => void
}) {
  const config = {
    delete:   { icon: '⚠', iconCls: 'bg-sensor-dangerbg text-sensor-danger',   btnCls: 'bg-sensor-danger',   label: '삭제',    desc: '삭제된 계정은 복구할 수 없습니다.' },
    inactive: { icon: '⚠', iconCls: 'bg-sensor-warningbg text-sensor-warning', btnCls: 'bg-sensor-warning', label: '비활성화', desc: '비활성화 시 해당 사용자는 로그인할 수 없습니다.' },
    activate: { icon: '✓', iconCls: 'bg-sensor-normalbg text-sensor-normal',   btnCls: 'bg-sensor-normal',  label: '활성화',   desc: '활성화 시 해당 사용자가 다시 로그인할 수 있습니다.' },
  }[action]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/30 backdrop-blur-sm" onClick={onClose}>
      <div className="geo-card w-full max-w-sm animate-fade-in-up p-6 text-center" onClick={e => e.stopPropagation()}>
        <div className={`mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full text-xl ${config.iconCls}`}>{config.icon}</div>
        <h3 className="text-sm font-semibold text-ink">{user.username} 계정을 {config.label}하시겠습니까?</h3>
        <p className="mt-1.5 text-xs text-ink-muted">{config.desc}</p>
        <div className="mt-5 flex gap-2">
          <button onClick={onClose} className="flex-1 rounded-lg border border-line px-4 py-2 text-sm font-medium text-ink-sub hover:bg-surface-subtle">취소</button>
          <button onClick={onConfirm} className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium text-white hover:opacity-90 ${config.btnCls}`}>{config.label}</button>
        </div>
      </div>
    </div>
  )
}

function StatusBadge({ isActive, isDeleted }: { isActive: boolean; isDeleted: boolean }) {
  if (isDeleted)  return <span className="inline-flex items-center gap-1 rounded-full border border-sensor-dangerborder  bg-sensor-dangerbg  px-2.5 py-0.5 font-mono text-[11px] font-medium text-sensor-dangertext"><span className="h-1.5 w-1.5 rounded-full bg-sensor-danger" />삭제</span>
  if (!isActive)  return <span className="inline-flex items-center gap-1 rounded-full border border-sensor-warningborder bg-sensor-warningbg px-2.5 py-0.5 font-mono text-[11px] font-medium text-sensor-warningtext"><span className="h-1.5 w-1.5 rounded-full bg-sensor-warning" />비활성화</span>
  return <span className="inline-flex items-center gap-1 rounded-full border border-sensor-normalborder bg-sensor-normalbg px-2.5 py-0.5 font-mono text-[11px] font-medium text-sensor-normaltext"><span className="h-1.5 w-1.5 rounded-full bg-sensor-normal" />활성</span>
}

export default function UsersPage() {
  const { user: me } = useAuth()
  const canManage = me?.role === 'admin'
  const [users,        setUsers]        = useState<any[]>([])
  const [viewFilter,   setViewFilter]   = useState<ViewFilter>('active')
  const [addOpen,      setAddOpen]      = useState(false)
  const [editTarget,   setEditTarget]   = useState<any | null>(null)
  const [confirmState, setConfirmState] = useState<{ user: any; action: 'delete' | 'inactive' | 'activate' } | null>(null)
  const [loading,      setLoading]      = useState(true)
  const [toast,        setToast]        = useState<string | null>(null)

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 2500) }

  const fetchUsers = async () => {
    try {
      const data = await userApi.getAll()
      setUsers(data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchUsers() }, [])

  const totalCount    = users.length
  const activeCount   = users.filter(u => u.is_active && !u.is_deleted).length
  const inactiveCount = users.filter(u => !u.is_active && !u.is_deleted).length
  const deletedCount  = users.filter(u => u.is_deleted).length

  const filtered = users.filter(u => {
    if (viewFilter === 'all')      return true
    if (viewFilter === 'active')   return u.is_active && !u.is_deleted
    if (viewFilter === 'inactive') return !u.is_active && !u.is_deleted
    if (viewFilter === 'deleted')  return u.is_deleted
    return true
  })

  const handleAdd = async (form: any) => {
    try {
      await authApi.register({ username: form.username, email: form.email, password: form.password, role: form.role, phone: form.phone })
      await fetchUsers()
      setAddOpen(false)
      showToast(`'${form.username}' 사용자가 추가되었습니다.`)
    } catch (err: any) {
      showToast(err.message || '추가 실패')
    }
  }

  const handleEdit = async (form: any) => {
    if (!editTarget) return
    try {
      await userApi.edit(editTarget.id, { username: form.username, email: form.email, role: form.role, phone: form.phone })
      await fetchUsers()
      setEditTarget(null)
      showToast(`'${form.username}' 정보가 수정되었습니다.`)
    } catch (err: any) {
      showToast(err.message || '수정 실패')
    }
  }

  const handleConfirm = async () => {
    if (!confirmState) return
    const { user, action } = confirmState
    try {
      if (action === 'delete')   await userApi.delete(user.id)
      if (action === 'inactive') await userApi.deactivate(user.id)
      if (action === 'activate') await userApi.activate(user.id)
      await fetchUsers()
      const label = action === 'delete' ? '삭제' : action === 'inactive' ? '비활성화' : '활성화'
      showToast(`'${user.username}' 계정이 ${label}되었습니다.`)
    } catch (err: any) {
      showToast(err.message || '처리 실패')
    } finally {
      setConfirmState(null)
    }
  }

  const tabCls = (val: ViewFilter) => [
    'rounded-full border px-3 py-1 font-mono text-[11px] font-medium transition-colors',
    viewFilter === val
      ? val === 'active'   ? 'border-sensor-normalborder  bg-sensor-normalbg  text-sensor-normaltext'
      : val === 'inactive' ? 'border-sensor-warningborder bg-sensor-warningbg text-sensor-warningtext'
      : val === 'deleted'  ? 'border-sensor-dangerborder  bg-sensor-dangerbg  text-sensor-dangertext'
      : 'border-line-strong bg-surface-muted text-ink'
      : 'border-line text-ink-muted hover:border-line-strong hover:text-ink-sub',
  ].join(' ')

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="font-mono text-sm text-ink-muted">사용자 목록 불러오는 중...</p>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto bg-surface-page">

      <div className="border-b border-line bg-surface-card/90 px-4 md:px-6 py-3 md:sticky md:top-0 md:z-10 backdrop-blur-md">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h1 className="text-[15px] font-semibold text-ink">사용자 관리</h1>
            <div className="mt-0.5 flex items-center gap-3 font-mono text-xs">
              <span className="text-ink-muted">전체 <strong className="text-ink">{totalCount}</strong>명</span>
              <span className="text-sensor-normaltext">활성 <strong>{activeCount}</strong>명</span>
              {inactiveCount > 0 && <span className="text-sensor-warningtext">비활성화 <strong>{inactiveCount}</strong>명</span>}
              {deletedCount  > 0 && <span className="text-sensor-dangertext">삭제 <strong>{deletedCount}</strong>명</span>}
            </div>
          </div>
          {canManage && (
            <button onClick={() => setAddOpen(true)}
              className="flex items-center gap-1.5 rounded-lg bg-brand px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-brand-hover">
              + 사용자 추가
            </button>
          )}
        </div>

        <div className="mt-3 flex gap-1 overflow-x-auto pb-1 scrollbar-none">
          {viewFilters.map(f => (
            <button key={f.value} onClick={() => setViewFilter(f.value)} className={tabCls(f.value)}>
              {f.label}
              <span className="ml-1 opacity-60">
                {f.value === 'all' ? totalCount : f.value === 'active' ? activeCount : f.value === 'inactive' ? inactiveCount : deletedCount}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="p-6">
        <div className="geo-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px] text-sm">
              <thead>
                <tr className="border-b border-line bg-surface-subtle">
                {['사용자명', '이메일', '핸드폰', '권한', '가입일', '마지막 로그인', '상태', ''].map(h => (
                    <th key={h} className="px-4 py-3 text-left font-mono text-[10px] font-semibold uppercase tracking-wide text-ink-muted">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {filtered.length === 0 ? (
                  <tr><td colSpan={7} className="px-4 py-10 text-center text-sm text-ink-muted">해당하는 사용자가 없습니다.</td></tr>
                ) : filtered.map(user => (
                  <tr key={user.id} className={['transition-colors hover:bg-surface-subtle', user.is_deleted ? 'opacity-40' : ''].join(' ')}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-brand/30 bg-brand/10 font-mono text-xs font-semibold text-brand">
                          {user.username?.[0]?.toUpperCase()}
                        </div>
                        <span className="font-medium text-ink">{user.username}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-ink-sub">{user.email}</td>
                    <td className="px-4 py-3 font-mono text-xs text-ink-sub">{user.phone || '—'}</td>
                    <td className="px-4 py-3">
                      <span className={['inline-block whitespace-nowrap rounded-full border px-2.5 py-0.5 font-mono text-[11px] font-medium',
                        user.role === 'admin' ? 'border-alarm-infoborder bg-alarm-infobg text-alarm-infotext' : 'border-line bg-surface-muted text-ink-sub'].join(' ')}>
                        {user.role === 'admin' ? 'Administrator' : user.role}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-ink-muted">
                      {user.created_at ? new Date(user.created_at).toLocaleDateString('ko-KR') : '—'}
                    </td>
                    <td className="px-4 py-3 font-mono text-[11px] text-ink-muted">
                      {user.last_login ? new Date(user.last_login).toLocaleString('ko-KR', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge isActive={user.is_active} isDeleted={user.is_deleted} />
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      {!user.is_deleted && canManage && me?.email !== user.email && (
                        <>
                          <button onClick={() => setEditTarget(user)} className="mr-2 font-mono text-xs text-ink-muted hover:text-brand">수정</button>
                          {user.is_active
                            ? <button onClick={() => setConfirmState({ user, action: 'inactive' })} className="mr-2 font-mono text-xs text-ink-muted hover:text-sensor-warning">비활성화</button>
                            : <button onClick={() => setConfirmState({ user, action: 'activate' })} className="mr-2 font-mono text-xs text-ink-muted hover:text-sensor-normal">활성화</button>
                          }
                          <button onClick={() => setConfirmState({ user, action: 'delete' })} className="font-mono text-xs text-ink-muted hover:text-sensor-danger">삭제</button>
                        </>
                      )}
                      {user.is_deleted && <span className="font-mono text-[10px] text-ink-muted">삭제됨</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {toast && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 animate-fade-in-up rounded-xl border border-line bg-ink px-5 py-3 font-mono text-sm text-white shadow-cardhover">
          {toast}
        </div>
      )}

      {addOpen && <UserModal mode="add" onSubmit={handleAdd} onClose={() => setAddOpen(false)} />}
      {editTarget && <UserModal mode="edit" user={editTarget} onSubmit={handleEdit} onClose={() => setEditTarget(null)} />}
      {confirmState && <ConfirmModal user={confirmState.user} action={confirmState.action} onConfirm={handleConfirm} onClose={() => setConfirmState(null)} />}
    </div>
  )
}