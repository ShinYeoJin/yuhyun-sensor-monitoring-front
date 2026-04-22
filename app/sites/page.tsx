'use client'

import { useState, useMemo, useEffect } from 'react'
import Link from 'next/link'
import type { Site } from '@/types'
import { sensorApi, userApi, siteApi } from '@/lib/api'
import { useAuth } from '@/lib/auth-context'
import { useRouter } from 'next/navigation'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

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
  name: string; location: string; description: string; managers: string[]; selectedSensors: number[]; has_floor_plan?: boolean
}
const emptyForm: SiteForm = { name: '', location: '', description: '', managers: [], selectedSensors: [], has_floor_plan: false }

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

function SiteModal({ mode, form, onChange, onSubmit, onClose, users, sensors, siteCode, siteId }: {
  mode: 'add' | 'edit'; form: SiteForm
  onChange: (f: SiteForm) => void; onSubmit: () => void; onClose: () => void
  users: any[]; sensors: any[]; siteCode: string; siteId?: number
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
          {/* 평면도 업로드 */}
          <div>
            <label className={labelCls}>현장 평면도</label>
            <div className="rounded-xl border border-line overflow-hidden">
              {form.has_floor_plan && siteId ? (
                <div className="relative">
                  <img
                    src={`${process.env.NEXT_PUBLIC_API_URL || 'https://yuhyun-sensor-monitoring-back.onrender.com'}/api/sites/${siteId}/floor-plan-image?t=${Date.now()}`}
                    alt="평면도"
                    className="w-full object-contain max-h-48"
                  />
                  <button
                    type="button"
                    onClick={() => onChange({ ...form, has_floor_plan: false })}
                    className="absolute top-2 right-2 rounded-full bg-ink/50 px-2 py-1 font-mono text-[10px] text-white hover:bg-ink/70"
                  >
                    ✕ 제거
                  </button>
                </div>
              ) : (
                <label className="flex cursor-pointer flex-col items-center justify-center gap-2 bg-surface-subtle py-6 hover:bg-surface-muted transition-colors">
                  <span className="text-2xl">🗺</span>
                  <span className="font-mono text-[11px] text-ink-muted">평면도 이미지 업로드</span>
                  <span className="font-mono text-[10px] text-ink-muted">PNG, JPG, PDF</span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/gif,image/webp,application/pdf"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0]
                      if (!file) return
                      const formData = new FormData()
                      formData.append('file', file)
                      try {
                        const token = localStorage.getItem('gm_token')
                        const apiBase = process.env.NEXT_PUBLIC_API_URL || 'https://yuhyun-sensor-monitoring-back.onrender.com'
                        const res = await fetch(
                          `${apiBase}/api/sites/${siteId}/floor-plan`,
                          { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: formData }
                        )
                        const data = await res.json()
                        if (data.success) {
                          onChange({ ...form, has_floor_plan: true })
                        } else {
                          alert('업로드 실패: ' + (data.error || '알 수 없는 오류'))
                        }
                      } catch { alert('업로드 중 오류가 발생했습니다.') }
                    }}
                  />
                </label>
              )}
            </div>
          </div>

          {/* 센서 선택 */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className={labelCls + ' mb-0'}>센서 <span className="ml-1 font-normal normal-case tracking-normal text-ink-muted">(복수 선택 가능)</span></label>
              {form.selectedSensors.length > 0 && (
                <button type="button" onClick={() => onChange({ ...form, selectedSensors: [] })}
                  className="font-mono text-[10px] text-ink-muted hover:text-sensor-dangertext transition-colors">전체 해제</button>
              )}
            </div>
            {sensors.length === 0 ? (
              <p className="font-mono text-[11px] text-ink-muted">등록된 센서가 없습니다.</p>
            ) : (
              <div className="rounded-lg border border-line overflow-hidden max-h-48 overflow-y-auto">
                {sensors.map((sensor: any, idx: number) => {
                  const isSelected = form.selectedSensors.includes(sensor.id)
                  const isCurrent = sensor.site_code === siteCode
                  const isOtherSite = sensor.site_code && sensor.site_code !== siteCode
                  const otherSiteName = isOtherSite ? sensor.site_name : null
                  const isDisabled = isOtherSite && !isSelected
                  return (
                    <button key={sensor.id} type="button"
                      disabled={isDisabled}
                      onClick={() => {
                        if (isDisabled) return
                        const next = isSelected
                          ? form.selectedSensors.filter(id => id !== sensor.id)
                          : [...form.selectedSensors, sensor.id]
                        onChange({ ...form, selectedSensors: next })
                      }}
                      className={['flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors',
                        idx !== 0 ? 'border-t border-line' : '',
                        isDisabled ? 'bg-surface-muted opacity-50 cursor-not-allowed' :
                        isSelected ? 'bg-brand/10' : 'bg-surface-card hover:bg-surface-subtle'].join(' ')}>
                      <span className={['flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-all',
                        isDisabled ? 'border-line bg-surface-muted' :
                        isSelected ? 'border-brand bg-brand text-white' : 'border-line-strong bg-surface-card'].join(' ')}>
                        {isSelected && !isDisabled && <svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                      </span>
                      <span className={`flex-1 text-sm font-medium ${isDisabled ? 'text-ink-muted' : isSelected ? 'text-brand' : 'text-ink'}`}>
                        {sensor.manage_no} — {sensor.name}
                      </span>
                      {isCurrent && (
                        <span className="font-mono text-[10px] text-sensor-normaltext border border-sensor-normalborder bg-sensor-normalbg px-1.5 py-0.5 rounded-full">현재</span>
                      )}
                      {isOtherSite && (
                        <span className="font-mono text-[10px] text-ink-muted border border-line bg-surface-muted px-1.5 py-0.5 rounded-full">{otherSiteName}</span>
                      )}
                    </button>
                  )
                })}
              </div>
            )}
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
          <div className="flex gap-3">
            <dt className="w-24 shrink-0 font-mono text-[10px] text-ink-muted">이메일</dt>
            <dd className="font-medium text-ink">{user.email || '—'}</dd>
          </div>
          <div className="flex gap-3">
            <dt className="w-24 shrink-0 font-mono text-[10px] text-ink-muted">핸드폰</dt>
            <dd className="font-medium text-ink">
              {user.phone
                ? <a href={`tel:${user.phone}`} className="text-brand hover:underline">{user.phone}</a>
                : '—'}
            </dd>
          </div>
          <div className="flex gap-3">
            <dt className="w-24 shrink-0 font-mono text-[10px] text-ink-muted">계정 상태</dt>
            <dd className="font-medium text-ink">{user.is_active ? '활성' : '비활성화'}</dd>
          </div>
        </dl>
        <div className="mt-5 flex gap-2">
          <button onClick={onClose} className="flex-1 rounded-lg border border-line px-4 py-2 text-sm font-medium text-ink-sub hover:bg-surface-subtle">닫기</button>
          <a href="/users" className="flex-1 rounded-lg bg-brand px-4 py-2 text-center text-sm font-medium text-white hover:bg-brand-hover">사용자 관리 →</a>
        </div>
      </div>
    </div>
  )
}

function SensorListModal({ site, sensors, onClose }: { site: any; sensors: any[]; onClose: () => void }) {
  const siteSensors = sensors.filter((s: any) => s.site_code === site.site_code)
  const router = useRouter()

  const statusStyle: Record<string, { bg: string; text: string; label: string }> = {
    normal:  { bg: 'bg-sensor-normalbg border-sensor-normalborder',   text: 'text-sensor-normaltext',  label: '정상' },
    warning: { bg: 'bg-sensor-warningbg border-sensor-warningborder', text: 'text-sensor-warningtext', label: '주의' },
    danger:  { bg: 'bg-sensor-dangerbg border-sensor-dangerborder',   text: 'text-sensor-dangertext',  label: '위험' },
    offline: { bg: 'bg-sensor-offlinebg border-sensor-offlineborder', text: 'text-sensor-offlinetext', label: '오프라인' },
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/30 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="geo-card flex w-full max-w-md animate-fade-in-up flex-col" style={{ maxHeight: '80vh' }}
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-line px-6 py-4">
          <div>
            <h2 className="text-sm font-semibold text-ink">{site.name} 센서 목록</h2>
            <p className="font-mono text-xs text-ink-muted">총 {siteSensors.length}개</p>
          </div>
          <button onClick={onClose} className="rounded-md p-1 text-ink-muted hover:bg-surface-subtle hover:text-ink">✕</button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {siteSensors.length === 0 ? (
            <div className="py-10 text-center font-mono text-sm text-ink-muted">등록된 센서가 없습니다.</div>
          ) : (
            <div className="divide-y divide-line">
              {siteSensors.map((sensor: any) => {
                const st = statusStyle[sensor.status] || statusStyle['offline']
                return (
                  <button key={sensor.id} type="button"
                    onClick={() => { onClose(); router.push(`/sensors/${sensor.id}`) }}
                    className="flex w-full items-center gap-4 px-6 py-3.5 text-left transition-colors hover:bg-surface-subtle">
                    <div className="flex-1 min-w-0">
                      <p className="font-mono text-sm font-semibold text-brand">{sensor.manage_no || sensor.id}</p>
                      <p className="text-xs text-ink-muted truncate">{sensor.name}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-mono text-sm font-medium text-ink">
                        {sensor.status === 'offline' ? '—' : `${parseFloat(sensor.current_value || 0).toFixed(1)} ${sensor.unit || ''}`}
                      </p>
                    </div>
                    <span className={`shrink-0 rounded-full border px-2.5 py-0.5 font-mono text-[11px] font-medium ${st.bg} ${st.text}`}>
                      {st.label}
                    </span>
                    <span className="text-ink-muted text-xs">→</span>
                  </button>
                )
              })}
            </div>
          )}
        </div>
        <div className="border-t border-line px-6 py-4">
          <button onClick={onClose} className="w-full rounded-lg border border-line px-4 py-2 text-sm font-medium text-ink-sub hover:border-line-strong hover:text-ink">닫기</button>
        </div>
      </div>
    </div>
  )
}

function SitesPageInner() {
  const { user:me } = useAuth()
  const canManage = me?.role !== 'MultiMonitor'
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
  const [sensorModal, setSensorModal] = useState<any | null>(null)
  const searchParams = useSearchParams()

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 2500) }

  useEffect(() => {
    sensorApi.getAll().then((data: any[]) => setSensors(data)).catch(console.error)
    userApi.getList().then((data: any[]) => setDbUsers(data)).catch(console.error)
    siteApi.getAll().then((data: any[]) => setSites(data)).catch(console.error)
  }, [])

  // URL에 id 파라미터가 있으면 해당 현장 카드로 스크롤
  useEffect(() => {
    const targetId = searchParams.get('id')
    if (targetId && sites.length > 0) {
      setTimeout(() => {
        const el = document.getElementById(`site-card-${targetId}`)
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }, 100)
    }
  }, [searchParams, sites])

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
    const currentSensors = sensors.filter((s: any) => s.site_code === site.site_code).map((s: any) => s.id)
    setForm({ name: site.name, location: site.location || '', description: site.description || '', managers: site.managers || [], selectedSensors: currentSensors, has_floor_plan: !!site.floor_plan_url })
    setEditTarget(site)
  }

  const handleAdd = async () => {
    try {
      const result = await siteApi.create({ name: form.name, location: form.location, description: form.description, managers: form.managers })
      // 선택된 센서들을 새 현장으로 변경
      if (form.selectedSensors.length > 0) {
        await Promise.all(form.selectedSensors.map((sensorId: number) =>
          sensorApi.updateSite(sensorId, result.site.site_code)
        ))
        await sensorApi.getAll().then((data: any[]) => setSensors(data))
      }
      await siteApi.getAll().then((data: any[]) => setSites(data))
      setAddOpen(false)
      showToast(`${form.name} 현장이 추가되었습니다.`)
    } catch (err: any) {
      showToast(err.message || '추가 실패')
    }
  }

  const handleEdit = async () => {
    if (!editTarget) return
    try {
      await siteApi.update(editTarget.id, { name: form.name, location: form.location, description: form.description, managers: form.managers })
      // 센서 소속 현장 변경
      // 선택된 센서 → 현재 현장으로 변경
      await Promise.all(form.selectedSensors.map((sensorId: number) =>
        sensorApi.updateSite(sensorId, editTarget.site_code)
      ))
      // 선택 해제된 센서 → 미배정 처리
      const allSensorIds = sensors.map((s: any) => s.id)
      const deselectedSensors = allSensorIds.filter((id: number) => 
        !form.selectedSensors.includes(id) && 
        sensors.find((s: any) => s.id === id)?.site_code === editTarget.site_code
      )
      await Promise.all(deselectedSensors.map((sensorId: number) =>
        sensorApi.updateSite(sensorId, '')
      ))
      // 이전 현장 센서 중 선택 해제된 것들 처리 (다른 현장 없으면 그대로)
      const updated = sites.map((s: any) => s.id === editTarget.id ? { ...s, ...form } : s)
      setSites(updated)
      await sensorApi.getAll().then((data: any[]) => setSensors(data))
      setEditTarget(null)
      showToast(`${form.name} 현장 정보가 수정되었습니다.`)
    } catch (err: any) {
      showToast(err.message || '수정 실패')
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      await siteApi.delete(deleteTarget.id)
      setSites(prev => prev.filter((s: any) => s.id !== deleteTarget.id))
      await sensorApi.getAll().then((data: any[]) => setSensors(data))
      showToast(`${deleteTarget.name} 현장이 삭제되었습니다.`)
    } catch (err: any) {
      showToast(err.message || '삭제 실패')
    } finally {
      setDeleteTarget(null)
    }
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
          {canManage && (
            <button onClick={openAdd}
              className="flex items-center gap-1.5 rounded-lg bg-brand px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-brand-hover">
              + 현장 추가
            </button>
          )}
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
                <div key={site.id} id={`site-card-${site.dbId}`} className={['geo-card flex flex-col p-5 transition-shadow hover:shadow-cardhover', site.liveStatus === 'danger' ? 'danger-flash' : ''].join(' ')}>
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
                  <button onClick={() => setSensorModal(site)} className="font-mono text-xs text-brand hover:underline">센서 보기 →</button>
                    <div className="flex gap-2">
                      {canManage && (
                        <>
                          <button onClick={() => openEdit(site)}
                          className="rounded-lg border border-line px-3 py-1.5 font-mono text-xs text-ink-sub transition-colors hover:border-brand/40 hover:bg-brand/10 hover:text-brand">편집</button>
                          <button onClick={() => setDeleteTarget(site)}
                          className="rounded-lg border border-line px-3 py-1.5 font-mono text-xs text-ink-sub transition-colors hover:border-sensor-dangerborder hover:bg-sensor-dangerbg hover:text-sensor-dangertext">삭제</button>
                        </>
                      )}
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

      {sensorModal && <SensorListModal site={sensorModal} sensors={sensors} onClose={() => setSensorModal(null)} />}
      {userModal && <UserInfoModal user={userModal} onClose={() => setUserModal(null)} />}
      {addOpen && <SiteModal mode="add" form={form} onChange={setForm} onSubmit={handleAdd} onClose={() => setAddOpen(false)} users={dbUsers} sensors={sensors} siteCode="" siteId={undefined} />}
      {editTarget && <SiteModal mode="edit" form={form} onChange={setForm} onSubmit={handleEdit} onClose={() => setEditTarget(null)} users={dbUsers} sensors={sensors} siteCode={editTarget.site_code} siteId={editTarget.dbId} />}
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

export default function SitesPage() {
  return (
    <Suspense>
      <SitesPageInner />
    </Suspense>
  )
}