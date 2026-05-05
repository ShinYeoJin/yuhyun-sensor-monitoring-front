'use client'

import { useState, useMemo, useRef, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { sensorApi, siteApi, userApi } from '@/lib/api'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { SensorTrendChart } from '@/components/charts/SensorTrendChart'
import Link from 'next/link'
import { useAuth } from '@/lib/auth-context'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://yuhyun-sensor-monitoring-back.onrender.com'

// ─── 센서 아이콘 ──────────────────────────────────────────────────────────────
function SensorIcon({ icon, isSelected, status, onClick }: {
  icon: { key: string; label: string; x: number; y: number }
  isSelected: boolean; status: string; onClick: () => void
}) {
  const color = status === 'danger' ? '#ef4444' : status === 'warning' ? '#f97316' : '#22c55e'
  return (
    <div onClick={onClick}
      style={{ position: 'absolute', left: `${icon.x * 100}%`, top: `${icon.y * 100}%`, transform: 'translate(-50%, -50%)', zIndex: isSelected ? 20 : 10, cursor: 'pointer', userSelect: 'none' }}>
      <div style={{ background: color, border: isSelected ? '2px solid #fff' : '1.5px solid rgba(255,255,255,0.7)', borderRadius: 6, padding: '3px 8px', boxShadow: '0 2px 8px rgba(0,0,0,0.35)', display: 'flex', alignItems: 'center', gap: 5, minWidth: 70 }}>
        <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'rgba(255,255,255,0.8)', display: 'inline-block' }} />
        <span style={{ color: '#fff', fontSize: 11, fontWeight: 600, fontFamily: 'monospace', whiteSpace: 'nowrap' }}>{icon.label}</span>
      </div>
    </div>
  )
}

// ─── 센서 선택 모달 ───────────────────────────────────────────────────────────
function AddSensorModal({ siteCode, allSensors, onClose, onSave }: {
  siteCode: string; allSensors: any[]; onClose: () => void; onSave: (ids: number[]) => void
}) {
  const [selected, setSelected] = useState<number[]>([])
  const currentSensorIds = allSensors.filter(s => s.site_code === siteCode).map(s => s.id)

  const toggleSensor = (id: number) => {
    setSelected(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id])
  }

  const available = allSensors.filter(s => !s.site_code || s.site_code === siteCode)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl bg-surface-card p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-ink">센서 추가</h2>
          <button onClick={onClose} className="text-ink-muted hover:text-ink text-lg">×</button>
        </div>
        <p className="font-mono text-[11px] text-ink-muted mb-3">이 현장에 추가할 센서를 선택하세요.</p>
        <div className="max-h-64 overflow-y-auto space-y-1 border border-line rounded-lg p-2">
          {available.length === 0 ? (
            <p className="px-3 py-4 text-center font-mono text-[11px] text-ink-muted">추가 가능한 센서가 없습니다.</p>
          ) : available.map((sensor: any) => {
            const isAlready = currentSensorIds.includes(sensor.id)
            const isChecked = selected.includes(sensor.id) || isAlready
            return (
              <label key={sensor.id} className={['flex items-center gap-3 rounded-lg px-3 py-2 cursor-pointer transition-colors', isAlready ? 'opacity-50 cursor-default' : 'hover:bg-surface-subtle'].join(' ')}>
                <input type="checkbox" checked={isChecked} disabled={isAlready}
                  onChange={() => !isAlready && toggleSensor(sensor.id)}
                  className="rounded border-line" />
                <div>
                  <p className="text-sm font-medium text-ink">{sensor.name}</p>
                  <p className="font-mono text-[10px] text-ink-muted">{sensor.sensor_type || '—'} {isAlready ? '(이미 등록됨)' : ''}</p>
                </div>
              </label>
            )
          })}
        </div>
        <div className="flex gap-2 mt-4">
          <button onClick={onClose} className="flex-1 rounded-lg border border-line py-2 font-mono text-sm text-ink-muted hover:bg-surface-subtle">취소</button>
          <button
            onClick={() => onSave(selected)}
            disabled={selected.length === 0}
            className="flex-1 rounded-lg bg-brand py-2 font-mono text-sm text-white disabled:opacity-40 hover:bg-brand/90">
            추가
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── 메인 페이지 ──────────────────────────────────────────────────────────────
export default function SiteDetailPage() {
  const { id } = useParams()
  const router = useRouter()
  const { user } = useAuth()
  const isMultiMonitor = user?.role === 'MultiMonitor'

  // ── 사이트 / 센서 데이터
  const [site, setSite] = useState<any>(null)
  const [allSensors, setAllSensors] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // ── 선택된 센서
  const [activeSensorId, setActiveSensorId] = useState<number | null>(null)
  const [sensor, setSensor] = useState<any>(null)

  // ── 평면도
  const floorPlanRef = useRef<HTMLDivElement>(null)
  const [floorPlanTimestamp, setFloorPlanTimestamp] = useState(Date.now())

  // ── 트렌드
  const [dateFrom, setDateFrom] = useState(() => new Date().toISOString().slice(0, 10))
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().slice(0, 10))
  const [chartMode, setChartMode] = useState<'hourly' | 'daily'>('hourly')
  const [selectedHour, setSelectedHour] = useState(12)
  const [calcMode, setCalcMode] = useState<'linear' | 'poly'>('linear')
  const [depthLabel, setDepthLabel] = useState<'1' | '2' | '3'>('1')
  const [measurements, setMeasurements] = useState<any[]>([])
  const [depth1Data, setDepth1Data] = useState<any[]>([])
  const [depth3Data, setDepth3Data] = useState<any[]>([])
  const [correctionParams, setCorrectionParams] = useState<Record<string, number>>({})
  const [initValue, setInitValue] = useState<number | null>(null)
  const [tablePage, setTablePage] = useState(1)
  const PAGE_SIZE = 15
  const today = new Date().toISOString().slice(0, 10)

  // ── 센서 추가 모달
  const [showAddSensor, setShowAddSensor] = useState(false)

  // ── 리사이즈
  const [leftWidth, setLeftWidth] = useState(220)
  const isResizingLeft = useRef(false)
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (isResizingLeft.current) {
        e.preventDefault()
        document.body.style.userSelect = 'none'
        document.body.style.cursor = 'col-resize'
        setLeftWidth(Math.max(160, Math.min(360, e.clientX)))
      }
    }
    const onUp = () => { isResizingLeft.current = false; document.body.style.userSelect = ''; document.body.style.cursor = '' }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp) }
  }, [])

  // ── 초기 데이터 로드
  useEffect(() => {
    if (!id) return
    Promise.all([siteApi.getAll(), sensorApi.getAll()])
      .then(([sitesData, sensorsData]) => {
        const found = sitesData.find((s: any) => String(s.id) === String(id))
        if (!found) { router.push('/sites'); return }
        setSite(found)
        setAllSensors(sensorsData)
        // 현장 소속 첫 번째 센서 자동 선택
        const siteSensors = sensorsData.filter((s: any) => s.site_code === found.site_code)
        if (siteSensors.length > 0) setActiveSensorId(siteSensors[0].id)
      })
      .finally(() => setLoading(false))
  }, [id])

  // ── 선택 센서 상세 로드
  useEffect(() => {
    if (!activeSensorId) return
    sensorApi.getById(activeSensorId).then((data: any) => {
      setSensor(data)
      setCorrectionParams(data.correctionParams || {})
      setDepthLabel('1')
      setMeasurements([])
    })
  }, [activeSensorId])

  // ── 측정값 로드
  useEffect(() => {
    if (!sensor) return
    const sensorCode = sensor.sensor_code || sensor.nameAbbr || ''
    const params: any = {
      from: chartMode === 'daily' ? `${dateFrom}T${String(selectedHour).padStart(2, '0')}:00:00` : dateFrom,
      to: chartMode === 'daily' ? `${dateTo}T${String(selectedHour).padStart(2, '0')}:59:59` : dateTo,
      limit: 2000,
    }
    if (sensorCode === '80053') params.depthLabel = depthLabel
    sensorApi.getMeasurements(sensor.id, params).then((data: any[]) => {
      const corr = correctionParams[depthLabel] ?? 0
      setMeasurements(data.map((m: any) => ({
        ...m,
        timestamp: m.measured_at,
        value: parseFloat(((calcMode === 'linear' ? parseFloat(m.linear_value ?? m.value) : parseFloat(m.value)) + corr).toFixed(4)),
        unit: sensor.unit || '',
      })))
    }).catch(() => setMeasurements([]))
  }, [sensor, dateFrom, dateTo, chartMode, selectedHour, calcMode, depthLabel, correctionParams])

  // ── WL-02 평균
  useEffect(() => {
    if (!sensor || sensor.sensor_code !== '80053' || depthLabel !== '2') { setDepth1Data([]); setDepth3Data([]); return }
    const params: any = { from: dateFrom, to: dateTo, limit: 2000 }
    const toVal = (m: any, d: string) => parseFloat(((calcMode === 'linear' ? parseFloat(m.linear_value ?? m.value) : parseFloat(m.value)) + (correctionParams[d] ?? 0)).toFixed(4))
    sensorApi.getMeasurements(sensor.id, { ...params, depthLabel: '1' }).then((data: any[]) => setDepth1Data(data.map(m => ({ timestamp: m.measured_at, value: toVal(m, '1') })))).catch(() => {})
    sensorApi.getMeasurements(sensor.id, { ...params, depthLabel: '3' }).then((data: any[]) => setDepth3Data(data.map(m => ({ timestamp: m.measured_at, value: toVal(m, '3') })))).catch(() => {})
  }, [sensor, depthLabel, dateFrom, dateTo, calcMode, correctionParams])

  // ── 초기값
  useEffect(() => {
    if (!sensor) return
    const sensorCode = sensor.sensor_code || ''
    sensorApi.getMeasurements(sensor.id, { limit: 2000, depthLabel: sensorCode === '80053' ? depthLabel : undefined })
      .then((data: any[]) => {
        if (data.length > 0) {
          const oldest = [...data].sort((a, b) => new Date(a.measured_at).getTime() - new Date(b.measured_at).getTime())[0]
          const corr = correctionParams[depthLabel] ?? 0
          setInitValue(parseFloat((parseFloat(oldest.linear_value ?? oldest.value) + corr).toFixed(4)))
        }
      }).catch(() => {})
  }, [sensor, depthLabel, correctionParams])

  // ── activeMeasurements (WL-02 평균 처리)
  const activeMeasurements = useMemo(() => {
    if (!sensor || sensor.sensor_code !== '80053' || depthLabel !== '2') return measurements
    const d1Map = new Map(depth1Data.map(m => [new Date(m.timestamp).toISOString().slice(0, 13), m.value]))
    const d3Map = new Map(depth3Data.map(m => [new Date(m.timestamp).toISOString().slice(0, 13), m.value]))
    const allKeys = Array.from(new Set([...d1Map.keys(), ...d3Map.keys()])).sort()
    return allKeys.map(key => {
      const v1 = d1Map.get(key), v3 = d3Map.get(key)
      const avg = v1 != null && v3 != null ? parseFloat(((v1 + v3) / 2).toFixed(4)) : (v1 ?? v3 ?? 0)
      return { timestamp: new Date(key + ':00:00.000Z').toISOString(), value: avg, unit: sensor?.unit || '', status: 'normal' }
    })
  }, [sensor, depthLabel, depth1Data, depth3Data, measurements])

  // ── measurementsWithGaps
  const measurementsWithGaps = useMemo(() => {
    if (!sensor || chartMode !== 'hourly') return activeMeasurements
    const dataMap = new Map<number, any>()
    activeMeasurements.forEach(m => { const h = new Date(m.timestamp); h.setMinutes(0, 0, 0); dataMap.set(h.getTime(), m) })
    const from = new Date(dateFrom + 'T00:00:00'), to = new Date(dateTo + 'T23:59:59'), now = new Date()
    const slots: any[] = []
    for (let d = new Date(from); d <= to; d.setHours(d.getHours() + 1)) {
      if (d > now) break
      const key = new Date(d); key.setMinutes(0, 0, 0)
      const found = dataMap.get(key.getTime())
      slots.push(found ?? { timestamp: key.toISOString(), value: null, unit: sensor?.unit || '', status: 'gap' })
    }
    return slots
  }, [activeMeasurements, sensor, chartMode, dateFrom, dateTo])

  // ── dailyReadings
  const dailyReadings = useMemo(() => {
    if (chartMode !== 'daily') return []
    const dataMap = new Map<string, any>()
    activeMeasurements.forEach(m => { const d = m.timestamp.slice(0, 10); dataMap.set(d, m) })
    const from = new Date(dateFrom), to = new Date(dateTo), now = new Date()
    const slots: any[] = []
    for (let d = new Date(from); d <= to; d.setDate(d.getDate() + 1)) {
      if (d > now) break
      const key = d.toISOString().slice(0, 10)
      const found = dataMap.get(key)
      slots.push(found ?? { timestamp: key + 'T00:00:00.000Z', value: null, unit: sensor?.unit || '', status: 'gap' })
    }
    return slots
  }, [activeMeasurements, chartMode, dateFrom, dateTo])

  // ── 관리기준
  const level1Upper = useMemo(() => {
    if (!sensor) return null
    if (sensor.sensor_code === '80053') return sensor.criteria?.depthCriteria?.[depthLabel]?.upper ?? null
    return sensor.criteria?.level1Upper ?? null
  }, [sensor, depthLabel])

  const level1Lower = useMemo(() => {
    if (!sensor) return null
    if (sensor.sensor_code === '80053') return sensor.criteria?.depthCriteria?.[depthLabel]?.lower ?? null
    return sensor.criteria?.level1Lower ?? null
  }, [sensor, depthLabel])

  const latestMeasurement = useMemo(() => {
    if (activeMeasurements.length === 0) return null
    return [...activeMeasurements].filter(m => m.value !== null).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0]
  }, [activeMeasurements])

  // ── 테이블
  const tableData = chartMode === 'hourly' ? measurementsWithGaps : dailyReadings
  const totalPages = Math.ceil(tableData.length / PAGE_SIZE)
  const pagedTable = [...tableData].reverse().slice((tablePage - 1) * PAGE_SIZE, tablePage * PAGE_SIZE)

  // ── 현장 소속 센서
  const siteSensors = useMemo(() => {
    if (!site) return []
    return allSensors.filter(s => s.site_code === site.site_code)
  }, [site, allSensors])

  // ── 아이콘 목록 (sensor_positions)
  const icons = useMemo(() => {
    if (!site?.sensor_positions) return []
    return Object.entries(site.sensor_positions as Record<string, any>).map(([key, val]: [string, any]) => ({
      key, label: val.label || key, x: val.x, y: val.y
    }))
  }, [site])

  // ── 아이콘 상태
  const iconStatuses = useMemo(() => {
    const map: Record<string, string> = {}
    icons.forEach(icon => {
      const sensorId = icon.key.includes(':') ? Number(icon.key.split(':')[0]) : Number(icon.key)
      const found = siteSensors.find(s => s.id === sensorId)
      map[icon.key] = found?.status || 'offline'
    })
    return map
  }, [icons, siteSensors])

  // ── 평면도 URL
  const floorPlanUrl = site?.has_floor_plan
    ? `${API_BASE}/api/sites/${site.id}/floor-plan-image?t=${floorPlanTimestamp}`
    : null

  // ── 아이콘 클릭 시 센서 전환
  const handleIconClick = (key: string) => {
    const sensorId = key.includes(':') ? Number(key.split(':')[0]) : Number(key)
    const depthPart = key.includes(':') ? key.split(':')[1] : null
    if (sensorId && sensorId !== activeSensorId) setActiveSensorId(sensorId)
    if (depthPart) setDepthLabel(depthPart as '1' | '2' | '3')
  }

  // ── 센서 추가 저장
  const handleAddSensors = async (ids: number[]) => {
    if (!site) return
    await Promise.all(ids.map(sensorId => sensorApi.updateSite(sensorId, site.site_code)))
    const updated = await sensorApi.getAll()
    setAllSensors(updated)
    setShowAddSensor(false)
  }

  // ── 프리셋
  const setPreset = (days: number) => {
    const to = new Date(), from = new Date()
    from.setDate(from.getDate() - (days - 1))
    setDateTo(to.toISOString().slice(0, 10))
    setDateFrom(from.toISOString().slice(0, 10))
    setTablePage(1)
  }

  const sensorCode = sensor?.sensor_code || sensor?.nameAbbr || ''

  // ── 범례 상태
  const statusNormal  = icons.filter(i => iconStatuses[i.key] === 'normal').length
  const statusWarning = icons.filter(i => iconStatuses[i.key] === 'warning').length
  const statusDanger  = icons.filter(i => iconStatuses[i.key] === 'danger').length

  if (loading) return <div className="flex h-full items-center justify-center"><p className="font-mono text-sm text-ink-muted">불러오는 중...</p></div>
  if (!site) return null

  return (
    <div className="flex h-full flex-col overflow-y-auto bg-surface-page">
      {/* 헤더 */}
      <div className="shrink-0 border-b border-line bg-surface-card/90 px-4 py-2.5 backdrop-blur-md">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Link href="/sites" className="text-sm text-ink-muted hover:text-ink">← 현장 추가 및 편집</Link>
            <span className="text-line-strong">/</span>
            <h1 className="font-mono text-[15px] font-semibold text-ink">{site.name}</h1>
          </div>
          {!isMultiMonitor && (
            <button onClick={() => setShowAddSensor(true)}
              className="flex items-center gap-1 rounded-md border border-brand/30 bg-brand/10 px-3 py-1.5 font-mono text-xs text-brand hover:bg-brand/20">
              + 센서 추가
            </button>
          )}
        </div>
      </div>

      {/* 상단: 2단 레이아웃 */}
      <div className="flex shrink-0" style={{ height: '45vh', minHeight: '260px' }}>

        {/* 좌: 현장 정보 + 센서 목록 */}
        <div style={{ width: leftWidth, minWidth: 160, maxWidth: 360 }} className="hidden lg:flex shrink-0 flex-col border-r border-line bg-surface-card overflow-y-auto">
          <div className="p-4">
            <h2 className="text-xs font-semibold text-ink mb-3">현장 정보</h2>
            <dl className="space-y-2">
              {[
                { l: '현장명', v: site.name },
                { l: '위치',  v: site.location || '—' },
                { l: '설명',  v: site.description || '—' },
              ].map(({ l, v }) => (
                <div className="flex gap-1" key={l}>
                  <dt className="w-16 shrink-0 font-mono text-[10px] text-ink-muted">{l}</dt>
                  <dd className="flex-1 font-mono text-[10px] text-ink break-all">{v}</dd>
                </div>
              ))}
            </dl>

            {/* 소속 센서 목록 */}
            <div className="mt-4">
              <p className="mb-2 font-mono text-[9px] font-semibold uppercase tracking-wider text-ink-muted">소속 센서</p>
              {siteSensors.length === 0 ? (
                <p className="font-mono text-[11px] text-ink-muted">등록된 센서 없음</p>
              ) : (
                <div className="space-y-1">
                  {siteSensors.map((s: any) => (
                    <button key={s.id} onClick={() => setActiveSensorId(s.id)}
                      className={['w-full flex items-center gap-2 rounded-lg px-2 py-1.5 text-left transition-colors font-mono text-[11px]',
                        activeSensorId === s.id ? 'bg-brand/10 text-brand font-medium' : 'text-ink-sub hover:bg-surface-subtle'
                      ].join(' ')}>
                      <span className={['w-2 h-2 rounded-full shrink-0', s.status === 'danger' ? 'bg-sensor-danger' : s.status === 'warning' ? 'bg-sensor-warning' : 'bg-sensor-normal'].join(' ')} />
                      {s.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 리사이즈 핸들 */}
        <div onMouseDown={e => { e.preventDefault(); isResizingLeft.current = true }}
          className="hidden lg:block w-1 shrink-0 cursor-col-resize bg-transparent hover:bg-brand/30 transition-colors" />

        {/* 우: 평면도 */}
        <div className="flex flex-1 flex-col min-w-0">
          <div className="shrink-0 flex items-center justify-between border-b border-line px-3 py-2">
            <h2 className="text-xs font-semibold text-ink">계측계획 평면도</h2>
          </div>
          <div className="flex-1 relative bg-surface-subtle overflow-hidden" ref={floorPlanRef}>
            {floorPlanUrl ? (
              <>
                <img src={floorPlanUrl} alt="계측계획 평면도" className="w-full h-full select-none"
                  style={{ objectFit: 'fill', background: '#f8f9fb' }} draggable={false} />
                {icons.map(icon => (
                  <SensorIcon key={icon.key} icon={icon} isSelected={
                    activeSensorId === (icon.key.includes(':') ? Number(icon.key.split(':')[0]) : Number(icon.key))
                  }
                    status={iconStatuses[icon.key] || 'offline'}
                    onClick={() => handleIconClick(icon.key)} />
                ))}
                {icons.length > 0 && (
                  <div className="absolute bottom-2 right-2 bg-surface-card/90 rounded-lg border border-line px-2.5 py-1.5 backdrop-blur-sm space-y-0.5">
                    {statusNormal  > 0 && <div className="flex items-center gap-1.5 font-mono text-[10px]"><span className="w-1.5 h-1.5 rounded-full bg-sensor-normal" />정상 ({statusNormal})</div>}
                    {statusWarning > 0 && <div className="flex items-center gap-1.5 font-mono text-[10px]"><span className="w-1.5 h-1.5 rounded-full bg-sensor-warning" />경고 ({statusWarning})</div>}
                    {statusDanger  > 0 && <div className="flex items-center gap-1.5 font-mono text-[10px]"><span className="w-1.5 h-1.5 rounded-full bg-sensor-danger" />위험 ({statusDanger})</div>}
                  </div>
                )}
              </>
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-3">
                <span className="text-5xl">🗺</span>
                <p className="font-mono text-sm text-ink-muted">평면도 이미지 준비 중</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 중단: 시간별 트렌드 */}
      {sensor ? (
        <div className="border-t border-line bg-surface-card flex flex-col shrink-0" style={{ height: '65vh', minHeight: '530px' }}>
          {/* 트렌드 헤더 */}
          <div className="shrink-0 flex items-center justify-between border-b border-line px-3 py-2">
            <h2 className="text-xs font-semibold text-ink">시간별 트렌드</h2>
            <span className="font-mono text-[11px] font-medium text-brand">{sensor.name}</span>
          </div>

          {/* 컨트롤 */}
          <div className="shrink-0 flex items-center gap-2 px-3 py-2.5 border-b border-line flex-wrap">
            <div className="flex items-center gap-1">
              {[['오늘',1],['7일',7],['30일',30]].map(([label,days])=>(
                <button key={String(label)} onClick={()=>setPreset(Number(days))}
                  className="rounded-md border border-line px-3 py-1 font-mono text-[11px] text-ink-muted hover:bg-surface-subtle hover:text-ink">{label}</button>
              ))}
            </div>
            <input type="date" value={dateFrom} max={today} onChange={e=>{setDateFrom(e.target.value);setTablePage(1)}}
              className="rounded-md border border-line bg-surface-card px-2 py-1 font-mono text-[11px] text-ink focus:outline-none" />
            <span className="font-mono text-[10px] text-ink-muted">~</span>
            <input type="date" value={dateTo} min={dateFrom} max={today} onChange={e=>{setDateTo(e.target.value);setTablePage(1)}}
              className="rounded-md border border-line bg-surface-card px-2 py-1 font-mono text-[11px] text-ink focus:outline-none" />
            <div className="w-px h-4 bg-line shrink-0" />
            <span className="font-mono text-[11px] text-ink-muted shrink-0">△ 조회 단위</span>
            <div className="flex gap-1">
              {['시간별','일별'].map(m=>(
                <button key={m} onClick={()=>setChartMode(m==='시간별'?'hourly':'daily')}
                  className={['rounded-md border px-3 py-1 font-mono text-[11px]', chartMode===(m==='시간별'?'hourly':'daily')?'border-brand/30 bg-brand/10 text-brand':'border-line text-ink-muted hover:bg-surface-subtle'].join(' ')}>{m}</button>
              ))}
            </div>
            {chartMode === 'daily' && (
              <select value={selectedHour} onChange={e=>setSelectedHour(Number(e.target.value))}
                className="rounded-md border border-line bg-surface-card px-2 py-1 font-mono text-[11px] text-ink focus:outline-none">
                {Array.from({length:24},(_,i)=>(
                  <option key={i} value={i}>{i < 12 ? `오전 ${i===0?12:i}시` : `오후 ${i===12?12:i-12}시`}</option>
                ))}
              </select>
            )}
            {sensorCode==='80053' && (
              <>
                <div className="w-px h-4 bg-line shrink-0" />
                <span className="font-mono text-[11px] text-ink-muted shrink-0">∧ 계산식</span>
                <div className="flex gap-1">
                  {(isMultiMonitor ? [['Linear','linear']] : [['Linear','linear'],['Polynomial','poly']]).map(([l,v])=>(
                    <button key={v} onClick={()=>setCalcMode(v as 'linear'|'poly')}
                      className={['rounded-md border px-3 py-1 font-mono text-[11px]', calcMode===v?'border-brand/30 bg-brand/10 text-brand':'border-line text-ink-muted hover:bg-surface-subtle'].join(' ')}>{l}</button>
                  ))}
                </div>
                <div className="w-px h-4 bg-line shrink-0" />
                <div className="flex gap-1">
                  {(['1','2','3'] as const).map(d=>{
                    const depthIcon = icons.find(i => i.key === `${sensor.id}:${d}`)
                    const btnLabel = depthIcon ? depthIcon.label : `${d}번 수위계`
                    return (
                      <button key={d} onClick={()=>setDepthLabel(d)}
                        className={['rounded-md border px-3 py-1 font-mono text-[11px]', depthLabel===d?'border-brand/30 bg-brand/10 text-brand font-medium':'border-line text-ink-muted hover:bg-surface-subtle'].join(' ')}>{btnLabel}</button>
                    )
                  })}
                </div>
              </>
            )}
          </div>

          {/* 측정값 카드 */}
          <div className="shrink-0 grid grid-cols-4 gap-1.5 px-3 py-2 border-b border-line">
            {[
              {label:'기간 내 최신값', value:latestMeasurement?.value},
              {label:'초기측정값', value:initValue},
              {label:'최솟값', value:activeMeasurements.filter(m=>m.value!==null).length>0?Math.min(...activeMeasurements.filter(m=>m.value!==null).map(m=>m.value)):null},
              {label:'최댓값', value:activeMeasurements.filter(m=>m.value!==null).length>0?Math.max(...activeMeasurements.filter(m=>m.value!==null).map(m=>m.value)):null},
            ].map(({label,value})=>(
              <div key={label} className="rounded-lg border border-line bg-surface-subtle px-2 py-1.5 text-center">
                <p className="font-mono text-[9px] text-ink-muted">{label}</p>
                <p className="font-mono text-sm font-semibold mt-0.5 text-sensor-normal">
                  {value!==null&&value!==undefined?Number(value).toFixed(2):'—'}<span className="text-[10px] text-ink-muted ml-0.5">{sensor.unit}</span>
                </p>
              </div>
            ))}
          </div>

          {/* 게이지 */}
          {(level1Lower!==null||level1Upper!==null)&&latestMeasurement&&(()=>{
            const lo = level1Lower as number, hi = level1Upper as number
            const pct = lo !== null && hi !== null ? Math.max(0, Math.min(1, (latestMeasurement.value - lo) / (hi - lo))) : 0.5
            return (
              <div className="shrink-0 px-3 py-1.5 border-b border-line">
                <div className="flex justify-between font-mono text-[9px] mb-1">
                  <span className="text-sensor-normaltext font-medium">정상 구간</span>
                  <span className="text-sensor-warningtext font-medium">경고</span>
                </div>
                <div className="relative h-2.5 rounded-full overflow-hidden" style={{background:'#f9d0d0'}}>
                  <div className="absolute left-0 top-0 h-full rounded-full bg-sensor-normal/30" style={{width:'100%'}} />
                  <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3.5 h-3.5 rounded-full border-2 border-white shadow-md transition-all"
                    style={{left:`${pct*100}%`, background: pct>=0&&pct<=1 ? '#22c55e' : '#ef4444'}} />
                </div>
              </div>
            )
          })()}

          {/* 차트 */}
          <div className="overflow-hidden" style={{ height: '460px' }}>
            <SensorTrendChart
              sensor={sensor}
              readings={chartMode==='hourly'?measurementsWithGaps:dailyReadings}
              initValue={sensorCode==='80053'?initValue??undefined:undefined}
              level1Upper={level1Upper}
              level1Lower={level1Lower}
            />
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center border-t border-line bg-surface-card">
          <div className="text-center">
            <p className="font-mono text-sm text-ink-muted">센서를 선택하면 데이터가 표시됩니다</p>
            <p className="font-mono text-[11px] text-ink-muted mt-1">평면도의 센서 아이콘 또는 좌측 목록을 클릭하세요</p>
          </div>
        </div>
      )}

      {/* 하단: 측정 데이터 로그 */}
      {sensor && (
        <div className="shrink-0 border-t border-line">
          <div className="sticky top-0 z-10 flex items-center justify-between border-b border-line bg-surface-card px-4 py-2">
            <h2 className="text-xs font-semibold text-ink">
              측정 데이터 로그
              <span className="ml-2 font-mono text-[10px] text-ink-muted">총 {tableData.length}건</span>
              {sensorCode==='80053' && (
                <span className="ml-1 font-mono text-[10px] text-brand">
                  ({icons.find(i=>i.key===`${sensor.id}:${depthLabel}`)?.label || `${depthLabel}번 수위계`})
                </span>
              )}
            </h2>
            {totalPages > 1 && (
              <div className="flex items-center gap-1">
                <button disabled={tablePage===1} onClick={()=>setTablePage(p=>p-1)} className="rounded px-2 py-0.5 font-mono text-[11px] text-ink-muted border border-line disabled:opacity-30 hover:bg-surface-subtle">←</button>
                <span className="font-mono text-[11px] text-ink-muted">{tablePage}/{totalPages}</span>
                <button disabled={tablePage===totalPages} onClick={()=>setTablePage(p=>p+1)} className="rounded px-2 py-0.5 font-mono text-[11px] text-ink-muted border border-line disabled:opacity-30 hover:bg-surface-subtle">→</button>
              </div>
            )}
          </div>
          <table className="w-full text-xs">
            <thead className="bg-surface-subtle">
              <tr>{['날짜','시각',`측정값(${sensor.unit})`,'계산상태','상태'].map(h=>(
                <th key={h} className="border-b border-line px-3 py-1.5 text-left font-mono text-[10px] font-semibold text-ink-muted">{h}</th>
              ))}</tr>
            </thead>
            <tbody>
              {pagedTable.length===0?(
                <tr><td colSpan={5} className="px-4 py-8 text-center font-mono text-xs text-ink-muted">데이터가 없습니다.</td></tr>
              ):pagedTable.map((row:any,i:number)=>{
                const isGap=row.status==='gap'||row.value===null
                const d=new Date(row.timestamp)
                return(
                  <tr key={i} className={isGap?'bg-surface-subtle/50':i%2===0?'':'bg-surface-subtle/30'}>
                    <td className="border-b border-line px-3 py-1.5 font-mono text-[11px] text-ink-muted">{d.toLocaleDateString('ko-KR',{month:'2-digit',day:'2-digit'})}</td>
                    <td className="border-b border-line px-3 py-1.5 font-mono text-[11px] text-ink-muted">{d.toLocaleTimeString('ko-KR',{hour:'2-digit',minute:'2-digit'})}</td>
                    <td className={`border-b border-line px-3 py-1.5 font-mono text-[11px] font-medium ${isGap?'text-ink-muted':'text-ink'}`}>{isGap?<span className="text-ink-muted">—</span>:`${Number(row.value).toFixed(4)} ${sensor.unit}`}</td>
                    <td className="border-b border-line px-3 py-1.5 font-mono text-[10px] text-ink-muted">{isGap?'—':(sensorCode==='80053'?`${calcMode==='linear'?'Linear':'Polynomial'} 적용`:'—')}</td>
                    <td className="border-b border-line px-3 py-1.5">{isGap?<span className="font-mono text-[10px] text-ink-muted">● 미수신</span>:<span className={`font-mono text-[10px] ${row.status==='danger'?'text-sensor-dangertext':row.status==='warning'?'text-sensor-warningtext':'text-sensor-normaltext'}`}>● {row.status==='danger'?'위험':row.status==='warning'?'주의':'정상'}</span>}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* 센서 추가 모달 */}
      {showAddSensor && (
        <AddSensorModal
          siteCode={site.site_code}
          allSensors={allSensors}
          onClose={() => setShowAddSensor(false)}
          onSave={handleAddSensors}
        />
      )}
    </div>
  )
}
