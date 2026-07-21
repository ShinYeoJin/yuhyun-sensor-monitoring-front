'use client'

import { useState, useMemo, useEffect } from 'react'
import Link from 'next/link'
import { sensorApi, userApi, siteApi } from '@/lib/api'
import { useAuth } from '@/lib/auth-context'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import { UserInfoModal } from '@/components/features/sites/UserInfoModal'
import { SensorListModal } from '@/components/features/sites/SensorListModal'
import { DeleteSiteModal } from '@/components/features/sites/DeleteSiteModal'
import { SiteCard } from '@/components/features/sites/SiteCard'
import { type SiteStatus, type ViewFilter, type SiteWithStatus, type SiteForm, statusStyle } from '@/components/features/sites/types'
import { SiteModal } from '@/components/features/sites/SiteModal'

const emptyForm: SiteForm = { name: '', location: '', description: '', managers: [], selectedSensors: [], has_floor_plan: false, latitude: undefined, longitude: undefined }



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
        dbId: site.id,
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
    setForm({ name: site.name, location: site.location || '', description: site.description || '', managers: site.managers || [], selectedSensors: currentSensors, has_floor_plan: !!site.has_floor_plan, latitude: site.latitude ?? undefined, longitude: site.longitude ?? undefined })
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
      await siteApi.update(editTarget.id, { name: form.name, location: form.location, description: form.description, managers: form.managers, latitude: form.latitude, longitude: form.longitude })
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
            <h1 className="text-[15px] font-semibold text-ink">현장 추가 및 편집</h1>
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
            {filtered.map((site: SiteWithStatus) => (
              <SiteCard
                key={site.id}
                site={site}
                dbUsers={dbUsers}
                canManage={canManage}
                onUserClick={setUserModal}
                onSensorClick={setSensorModal}
                onEdit={openEdit}
                onDelete={setDeleteTarget}
              />
            ))}
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
        <DeleteSiteModal
          deleteTarget={deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onDelete={handleDelete}
        />
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