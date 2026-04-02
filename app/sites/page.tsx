'use client'

import { useState, useMemo, useEffect } from 'react'
import Link from 'next/link'
import type { Site } from '@/types'
import { sensorApi, userApi, siteApi } from '@/lib/api'

type SiteStatus = 'danger' | 'warning' | 'normal'
type ViewFilter = 'all' | 'danger' | 'warning' | 'normal'

interface SiteWithStatus extends Site {
  liveStatus:  SiteStatus
  liveDanger:  number
  liveWarning: number
  liveNormal:  number
  liveOffline: number
  liveTotal:   number
  dbId:        number
  managers:    string[]
}

type SiteForm = {
  name: string; location: string; description: string; managers: string[]
}
const emptyForm: SiteForm = { name: '', location: '', description: '', managers: [] }

const inputCls = 'w-full rounded-lg border border-line bg-surface-subtle px-3 py-2 text-sm text-ink outline-none transition-colors placeholder:text-ink-muted focus:border-brand/50 focus:ring-2 focus:ring-brand/10'
const labelCls = 'mb-1.5 block font-mono text-[10px] font-semibold uppercase tracking-wider text-ink-muted'

const statusStyle: Record<SiteStatus, { badge: string; tab: string; label: string }> = {
  danger:  { badge: 'bg-sensor-dangerbg  border-sensor-dangerborder  text-sensor-dangertext',  tab: 'border-sensor-dangerborder  bg-sensor-dangerbg  text-sensor-dangertext',  label: '위험' },
  warning: { badge: 'bg-sensor-warningbg border-sensor-warningborder text-sensor-warningtext', tab: 'border-sensor-warningborder bg-sensor-warningbg text-sensor-warningtext', label: '주의' },
  normal:  { badge: 'bg-sensor-normalbg  border-sensor-normalborder  text-sensor-normaltext',  tab: 'border-sensor-normalborder  bg-sensor-normalbg  text-sensor-normaltext',  label: '정상' },
}

function SiteStatusBar({ normal, warning, danger, total }: { normal: number; warning: number; danger: number; total: number }) {
  if (total === 0) return <div className="mt-2 h-1.5 rounded-full bg-surface-muted" />
  return (
    <div className="mt-2 flex h-1.5 overflow-hidden rounded-full bg-surface-muted">
      <div className="bg-sensor-normal  transition-all" style={{ width: `${(normal  / total) * 100}%` }} />
      <div className="bg-sensor-warning transition-all" style={{ width: `${(warning / total) * 100}%` }} />
      <div className="bg-sensor-danger  transition-all" style={{ width: `${(danger  / total) * 100}%` }} />
    </div>
  )
}

function SiteModal({ mode, form, onChange, onSubmit, onClose, users }: {
  mode: 'add' | 'edit'; form: SiteForm
  onChange: (f: SiteForm) => void; onSubmit: () => void; onClose: () => void
  users: any[]
}) {
  const isValid = form.name.trim() !== '' && form.location.trim() !== ''
  const toggleManager = (username: string) => {
    const next = form.managers.includes(username)
      ? form.managers.filter(m => m !== username)
      : [...form.managers, username]
    onChange({ ...form, managers: next })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/30 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="geo-card flex w-full max-w-md animate-fade-in-up flex-col" style={{ maxHeight: '90vh' }}
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-line px-6 py-4">
          <h2 className="text-sm font-semibold text-ink">{mode === 'add' ? '현장 추가' : '현장 편집'}</h2>
          <button onClick={onClose} className="rounded-md p-1 text-ink-muted hover:bg-surface-subtle hover:text-ink">✕</button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          <div>
            <label className={labelCls}>현장명 *</label>
            <input type="text" value={form.name} onChange={e => onChange({ ...form, name: e.target.value })} placeholder="현장 A" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>위치 *</label>
            <input type="text" value={form.location} onChange={e => onChange({ ...form, location: e.target.value })} placeholder="서울특별시 마포구" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>설명</label>
            <textarea rows={2} value={form.description} onChange={e => onChange({ ...form, description: e.target.value })}
              placeholder="현장에 대한 설명을 입력하세요." className={`${inputCls} resize-none`} />
          </div>
          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className={labelCls + ' mb-0'}>담당자 <span className="ml-1 font-normal normal-case tracking-normal text-ink-muted">(복수 선택 가능)</span></label>
              {form.managers.length > 0 && (
                <button type="button" onClick={() => onChange({ ...form, managers: [] })}
                  className="font-mono text-[10px] text-ink-muted hover:text-sensor-dangertext transition-colors">전체 해제</button>
              )}
            </div>
            {users.length === 0 ? (
              <p className="font-mono text-[11px] text-ink-muted">등록된 사용자가 없습니다.</p>
            ) : (
              <div className="rounded-lg border border-line overflow-hidden">
                {users.filter((u: any) => u && u.username).map((user: any, idx: number) => {
                  const isSelected = form.managers.includes(user.username)
                  return (
                    <button key={user.id} type="button" onClick={() => toggleManager(user.username)}
                      className={['flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors',
                        idx !== 0 ? 'border-t border-line' : '',
                        isSelected ? 'bg-brand/10' : 'bg-surface-card hover:bg-surface-subtle'].join(' ')}>
                      <span className={['flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-all',
                        isSelected ? 'border-brand bg-brand text-white' : 'border-line-strong bg-surface-card'].join(' ')}>
                        {isSelected && <svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                      </span>
                      <span className={['flex h-6 w-6 shrink-0 items-center justify-center rounded-full font-mono text-[11px] font-semibold',
                        isSelected ? 'bg-brand/20 text-brand' : 'bg-surface-muted text-ink-sub'].join(' ')}>
                        {user.username?.[0]?.toUpperCase() || '?'}
                      </span>
                      <span className={`flex-1 text-sm font-medium ${isSelected ? 'text-brand' : 'text-ink'}`}>{user.username}</span>
                      <span className="font-mono text-[10px] text-ink-muted">{user.role}</span>
                    </button>
                  )
                })}
              </div>
            )}
            {form.managers.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {form.managers.map(name => (
                  <span key={name} className="inline-flex items-center gap-1 rounded-full border border-brand/30 bg-brand/10 pl-2.5 pr-1.5 py-0.5 font-mono text-[11px] text-brand">
                    {name}
                    <button type="button" onClick={() => toggleManager(name)} className="ml-0.5 rounded-full hover:bg-brand/20 p-0.5 leading-none">✕</button>
                  </span>
                ))}
              </div>
            )}
            {form.managers.length === 0 && <p className="mt-1.5 font-mono text-[10px] text-ink-muted">담당자를 선택하지 않으면 미배정으로 등록됩니다.</p>}
          </div>
        </div>
        <div className="flex gap-2 border-t border-line px-6 py-4">
          <button onClick={onClose} className="flex-1 rounded-lg border border-line px-4 py-2 text-sm font-medium text-ink-sub hover:border-line-strong hover:text-ink">취소</button>
          <button onClick={onSubmit} disabled={!isValid}
            className="flex-1 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-40">
            {mode === 'add' ? '추가' : '저장'}
          </button>
        </div>
      </div>
    </div>
  )
}

function UserInfoModal({ user, onClose }: { user: any; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/30 backdrop-blur-sm" onClick={onClose}>
      <div className="geo-card w-full max-w-sm animate-fade-in-up p-6" onClick={e => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-ink">담당자 정보</h2>
          <button onClick={onClose} className="rounded-md p-1 text-ink-muted hover:bg-surface-subtle hover:text-ink">✕</button>
        </div>
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-brand/30 bg-brand/10 font-mono text-lg font-semibold text-brand">
            {user.username?.[0]?.toUpperCase()}
          </div>
          <div>
            <p className="font-semibold text-ink">{user.username}</p>
            <p className="font-mono text-xs text-ink-muted">{user.role}</p>
          </div>
        </div>
        <dl className="space-y-2.5 text-sm">
          {[
            { label: '이메일',    value: user.email   || '—' },
            { label: '핸드폰',    value: user.phone   || '—' },
            { label: '계정 상태', value: user.is_active ? '활성' : '비활성화' },
          ].map(item => (
            <div key={item.label} className="flex gap-3">
              <dt className="w-24 shrink-0 font-mono text-[10px] text-ink-muted">{item.label}</dt>
              <dd className="font-medium text-ink">{item.value}</dd>
            </div>
          ))}
        </dl>
        <div className="mt-5 flex gap-2">
          <button onClick={onClose} className="flex-1 rounded-lg border border-line px-4 py-2 text-sm font-medium text-ink-sub hover:bg-surface-subtle">닫기</button>
          <a href="/users" className="flex-1 rounded-lg bg-brand px-4 py-2 text-center text-sm font-medium text-white hover:bg-brand-hover">사용자 관리 →</a>
        </div>
      </div>
    </div>
  )
}

export default function SitesPage() {
  const [sites,        setSites]        = useState<any[]>([])
  const [sensors,      setSensors]      = useState<any[]>([])
  const [dbUsers,      setDbUsers]      = useState<any[]>([])
  const [viewFilter,   setViewFilter]   = useState<ViewFilter>('all')
  const [addOpen,      setAddOpen]      = useState(false)
  const [editTarget,   setEditTarget]   = useState<any | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null)
  const [form,         setForm]         = useState<SiteForm>(emptyForm)
  const [toast,        setToast]        = useState<string | null>(null)
  const [userModal,    setUserModal]    = useState<any | null>(null)

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 2500) }

  useEffect(() => {
    sensorApi.getAll().then((data: any[]) => setSensors(data)).catch(console.error)
    userApi.getList().then((data: any[]) => setDbUsers(data)).catch(console.error)
    siteApi.getAll().then((data: any[]) => setSites(data)).catch(console.error)
  }, [])

  const sitesWithStatus = useMemo(() => {
    return sites.map((site: any) => {
      const siteSensors = sensors.filter((s: any) => s.site_code === site.site_code)
      const liveDanger  = siteSensors.filter((s: any) => s.status === 'danger').length
      const liveWarning = siteSensors.filter((s: any) => s.status === 'warning').length
      const liveNormal  = siteSensors.filter((s: any) => s.status === 'normal').length
      const liveOffline = siteSensors.filter((s: any) => s.status === 'offline').length
      const liveTotal   = siteSensors.length
      const liveStatus: SiteStatus = liveDanger > 0 ? 'danger' : liveWarning > 0 ? 'warning' : 'normal'
      return {
        ...site,
        liveStatus,
        liveDanger, liveWarning, liveNormal, liveOffline, liveTotal,
        managers: site.managers || [],
      }
    })
  }, [sites, sensors])

  const totalCount   = sitesWithStatus.length
  const dangerCount  = sitesWithStatus.filter(s => s.liveStatus === 'danger').length
  const warningCount = sitesWithStatus.filter(s => s.liveStatus === 'warning').length
  const normalCount  = sitesWithStatus.filter(s => s.liveStatus === 'normal').length

  const filtered = viewFilter === 'all' ? sitesWithStatus : sitesWithStatus.filter(s => s.liveStatus === viewFilter)

  const openAdd  = () => { setForm(emptyForm); setAddOpen(true) }
  const openEdit = (site: any) => {
    setForm({ name: site.name, location: site.location || '', description: site.description || '', managers: site.managers || [] })
    setEditTarget(site)
  }

  const handleEdit = async () => {
    if (!editTarget) return
    try {
      await siteApi.update(editTarget.id, { name: form.name, location: form.location, description: form.description, managers: form.managers })
      const updated = sites.map((s: any) => s.id === editTarget.id ? { ...s, ...form } : s)
      setSites(updated)
      setEditTarget(null)
      showToast(`${form.name} 현장 정보가 수정되었습니다.`)
    } catch (err: any) {
      showToast(err.message || '수정 실패')
    }
  }

  const handleDelete = () => {
    if (!deleteTarget) return
    setSites(prev => prev.filter((s: any) => s.id !== deleteTarget.id))
    showToast(`${deleteTarget.name} 현장이 삭제되었습니다.`)
    setDeleteTarget(null)
  }

  const tabCls = (val: ViewFilter) => [
    'rounded-full border px-3 py-1 font-mono text-[11px] font-medium transition-colors',
    viewFilter === val
      ? val === 'all' ? 'border-line-strong bg-surface-muted text-ink' : statusStyle[val as SiteStatus].tab
      : 'border-line text-ink-muted hover:border-line-strong hover:text-ink-sub',
  ].join(' ')

  return (
    <div className="flex-1 overflow-y-auto bg-surface-page">
      <div className="border-b border-line bg-surface-card/90 px-4 md:px-6 py-3 md:sticky md:top-0 md:z-10 backdrop-blur-md">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h1 className="text-[15px] font-semibold text-ink">현장 관리</h1>
            <div className="mt-0.5 flex items-center gap-3 font-mono text-xs">
              <span className="text-ink-muted">전체 <strong className="text-ink">{totalCount}</strong>개</span>
              {dangerCount  > 0 && <span className="flex items-center gap-1 text-sensor-dangertext"><span className="pulse-danger" />위험 <strong>{dangerCount}</strong>개</span>}
              {warningCount > 0 && <span className="text-sensor-warningtext">주의 <strong>{warningCount}</strong>개</span>}
              <span className="text-sensor-normaltext">정상 <strong>{normalCount}</strong>개</span>
            </div>
          </div>
          <button onClick={openAdd}
            className="flex items-center gap-1.5 rounded-lg bg-brand px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-brand-hover">
            + 현장 추가
          </button>
        </div>
        <div className="mt-3 flex gap-1 overflow-x-auto pb-1 scrollbar-none">
          {([
            { value: 'all' as ViewFilter, label: '전체', count: totalCount },
            { value: 'danger' as ViewFilter, label: '위험', count: dangerCount },
            { value: 'warning' as ViewFilter, label: '주의', count: warningCount },
            { value: 'normal' as ViewFilter, label: '정상', count: normalCount },
          ]).map(f => (
            <button key={f.value} onClick={() => setViewFilter(f.value)} className={tabCls(f.value)}>
              {f.label}<span className="ml-1 opacity-60">{f.count}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="p-6">
        {filtered.length === 0 ? (
          <div className="geo-card py-16 text-center">
            <p className="text-sm text-ink-muted">등록된 현장이 없습니다.</p>
            <button onClick={openAdd} className="mt-3 font-mono text-xs text-brand hover:underline">+ 첫 번째 현장 추가하기</button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {filtered.map((site: any) => {
              const st = statusStyle[site.liveStatus as SiteStatus] || statusStyle['normal']
              return (
                <div key={site.id} className={['geo-card flex flex-col p-5 transition-shadow hover:shadow-cardhover', site.liveStatus === 'danger' ? 'danger-flash' : ''].join(' ')}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h2 className="font-semibold text-ink">{site.name}</h2>
                      <p className="font-mono text-xs text-ink-muted">{site.location}</p>
                    </div>
                    <span className={`shrink-0 whitespace-nowrap rounded-full border px-2.5 py-0.5 font-mono text-[11px] font-medium ${st.badge}`}>
                      {site.liveStatus === 'danger' && <span className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-sensor-danger" />}
                      {st.label}
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-ink-sub">{site.description || '—'}</p>
                  <SiteStatusBar normal={site.liveNormal} warning={site.liveWarning} danger={site.liveDanger} total={site.liveTotal} />
                  <div className="mt-2 flex flex-wrap gap-3 font-mono text-[11px]">
                    <span className="text-ink-muted">전체 <strong className="text-ink">{site.liveTotal}</strong></span>
                    <span className="text-sensor-normaltext">정상 <strong>{site.liveNormal}</strong></span>
                    {site.liveWarning > 0 && <span className="text-sensor-warningtext">주의 <strong>{site.liveWarning}</strong></span>}
                    {site.liveDanger  > 0 && <span className="text-sensor-dangertext">위험 <strong>{site.liveDanger}</strong></span>}
                    {site.liveOffline > 0 && <span className="text-ink-muted">오프라인 <strong>{site.liveOffline}</strong></span>}
                  </div>
                  <div className="mt-3 border-t border-line pt-3">
                    <p className="mb-1.5 font-mono text-[10px] text-ink-muted">담당자</p>
                    {!site.managers || site.managers.length === 0 ? (
                      <p className="font-mono text-[11px] text-ink-muted">미배정</p>
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        {site.managers.map((username: string) => {
                          const user = dbUsers.find((u: any) => u.username === username)
                          return (
                            <button key={username} type="button"
                              onClick={() => user && setUserModal(user)}
                              className={['inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 font-mono text-[11px] transition-colors',
                                !user ? 'border-line bg-surface-subtle text-ink-sub cursor-default' :
                                user.is_active ? 'border-brand/30 bg-brand/10 text-brand hover:border-brand/50 hover:bg-brand/20' :
                                'border-line-strong bg-surface-muted text-ink-muted hover:bg-surface-subtle'].join(' ')}>
                              <span className={['flex h-4 w-4 items-center justify-center rounded-full font-mono text-[9px] font-semibold',
                                user?.is_active ? 'bg-brand/20 text-brand' : 'bg-surface-muted text-ink-muted'].join(' ')}>
                                {username?.[0]?.toUpperCase()}
                              </span>
                              {username}
                              {user && <span className="text-[9px] opacity-60">↗</span>}
                            </button>
                          )
                        })}
                      </div>
                    )}
                  </div>
                  <div className="mt-3 flex items-center justify-between border-t border-line pt-3">
                    <Link href={`/sensors?site=${site.site_code}`} className="font-mono text-xs text-brand hover:underline">센서 보기 →</Link>
                    <div className="flex gap-2">
                      <button onClick={() => openEdit(site)}
                        className="rounded-lg border border-line px-3 py-1.5 font-mono text-xs text-ink-sub transition-colors hover:border-brand/40 hover:bg-brand/10 hover:text-brand">편집</button>
                      <button onClick={() => setDeleteTarget(site)}
                        className="rounded-lg border border-line px-3 py-1.5 font-mono text-xs text-ink-sub transition-colors hover:border-sensor-dangerborder hover:bg-sensor-dangerbg hover:text-sensor-dangertext">삭제</button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {toast && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 animate-fade-in-up rounded-xl border border-line bg-ink px-5 py-3 font-mono text-sm text-white shadow-cardhover">
          {toast}
        </div>
      )}

      {userModal && <UserInfoModal user={userModal} onClose={() => setUserModal(null)} />}
      {addOpen     && <SiteModal mode="add"  form={form} onChange={setForm} onSubmit={async () => { showToast('현장 추가는 준비 중입니다.'); setAddOpen(false) }} onClose={() => setAddOpen(false)} users={dbUsers} />}
      {editTarget  && <SiteModal mode="edit" form={form} onChange={setForm} onSubmit={handleEdit} onClose={() => setEditTarget(null)} users={dbUsers} />}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/30 backdrop-blur-sm" onClick={() => setDeleteTarget(null)}>
          <div className="geo-card w-full max-w-sm animate-fade-in-up p-6 text-center" onClick={e => e.stopPropagation()}>
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-sensor-dangerbg text-xl text-sensor-danger">⚠</div>
            <h3 className="text-sm font-semibold text-ink">{deleteTarget.name}을(를) 삭제하시겠습니까?</h3>
            <p className="mt-1.5 text-xs text-ink-muted">삭제된 현장 정보는 복구할 수 없습니다.</p>
            <div className="mt-5 flex gap-2">
              <button onClick={() => setDeleteTarget(null)} className="flex-1 rounded-lg border border-line px-4 py-2 text-sm font-medium text-ink-sub hover:bg-surface-subtle">취소</button>
              <button onClick={handleDelete} className="flex-1 rounded-lg bg-sensor-danger px-4 py-2 text-sm font-medium text-white hover:opacity-90">삭제</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}