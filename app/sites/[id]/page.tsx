'use client'

import { useState, useMemo, useRef, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { sensorApi, siteApi, userApi } from '@/lib/api'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { SensorTrendChart } from '@/components/charts/SensorTrendChart'
import Link from 'next/link'
import { useAuth } from '@/lib/auth-context'
import { QRModal } from '@/components/ui/QRModal'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://yuhyun-sensor-monitoring-back.onrender.com'

function SensorIcon({ icon, isSelected, status, onMouseDown, onClick }: {
  icon: { key: string; label: string; x: number; y: number }
  isSelected: boolean; status: string
  onMouseDown: (e: React.MouseEvent) => void; onClick: () => void
}) {
  const color = status === 'danger' ? '#ef4444' : status === 'warning' ? '#f97316' : '#22c55e'
  return (
    <div onMouseDown={onMouseDown} onClick={onClick}
      style={{ position: 'absolute', left: `${icon.x * 100}%`, top: `${icon.y * 100}%`, transform: 'translate(-50%, -50%)', zIndex: isSelected ? 20 : 10, cursor: 'grab', userSelect: 'none' }}>
      <div style={{ background: color, border: isSelected ? '2px solid #fff' : '1.5px solid rgba(255,255,255,0.7)', borderRadius: 6, padding: '3px 8px', boxShadow: '0 2px 8px rgba(0,0,0,0.35)', display: 'flex', alignItems: 'center', gap: 5, minWidth: 70 }}>
        <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'rgba(255,255,255,0.8)', display: 'inline-block' }} />
        <span style={{ color: '#fff', fontSize: 11, fontWeight: 600, fontFamily: 'monospace', whiteSpace: 'nowrap' }}>{icon.label}</span>
      </div>
    </div>
  )
}

function AddSensorModal({ siteCode, allSensors, onClose, onSave }: { siteCode: string; allSensors: any[]; onClose: () => void; onSave: (ids: number[]) => void }) {
  const [selected, setSelected] = useState<number[]>([])
  const currentIds = allSensors.filter(s => s.site_code === siteCode).map(s => s.id)
  const available = allSensors.filter(s => !s.site_code || s.site_code === siteCode)
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl bg-surface-card p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-4"><h2 className="text-sm font-semibold text-ink">센서 추가</h2><button onClick={onClose} className="text-ink-muted hover:text-ink text-lg">×</button></div>
        <div className="max-h-64 overflow-y-auto space-y-1 border border-line rounded-lg p-2">
          {available.length === 0 ? <p className="px-3 py-4 text-center font-mono text-[11px] text-ink-muted">추가 가능한 센서가 없습니다.</p>
            : available.map((s: any) => { const isAlready = currentIds.includes(s.id); return (<label key={s.id} className={['flex items-center gap-3 rounded-lg px-3 py-2 cursor-pointer transition-colors', isAlready ? 'opacity-50 cursor-default' : 'hover:bg-surface-subtle'].join(' ')}><input type="checkbox" checked={selected.includes(s.id) || isAlready} disabled={isAlready} onChange={() => !isAlready && setSelected(prev => prev.includes(s.id) ? prev.filter(i => i !== s.id) : [...prev, s.id])} className="rounded border-line" /><div><p className="text-sm font-medium text-ink">{s.name}</p><p className="font-mono text-[10px] text-ink-muted">{s.sensor_type || '—'} {isAlready ? '(이미 등록됨)' : ''}</p></div></label>) })}
        </div>
        <div className="flex gap-2 mt-4"><button onClick={onClose} className="flex-1 rounded-lg border border-line py-2 font-mono text-sm text-ink-muted hover:bg-surface-subtle">취소</button><button onClick={() => onSave(selected)} disabled={selected.length === 0} className="flex-1 rounded-lg bg-brand py-2 font-mono text-sm text-white disabled:opacity-40 hover:bg-brand/90">추가</button></div>
      </div>
    </div>
  )
}

function RemoveSensorModal({ siteSensors, onClose, onRemove }: { siteSensors: any[]; onClose: () => void; onRemove: (id: number) => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl bg-surface-card p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-4"><h2 className="text-sm font-semibold text-ink">센서 삭제</h2><button onClick={onClose} className="text-ink-muted hover:text-ink text-lg">×</button></div>
        <p className="font-mono text-[11px] text-ink-muted mb-3">이 현장에서 제거할 센서를 선택하세요.</p>
        <div className="max-h-64 overflow-y-auto space-y-1 border border-line rounded-lg p-2">
          {siteSensors.length === 0 ? <p className="px-3 py-4 text-center font-mono text-[11px] text-ink-muted">등록된 센서가 없습니다.</p>
            : siteSensors.map((s: any) => (<div key={s.id} className="flex items-center justify-between rounded-lg px-3 py-2 hover:bg-surface-subtle"><div><p className="text-sm font-medium text-ink">{s.name}</p><p className="font-mono text-[10px] text-ink-muted">{s.sensor_type || '—'}</p></div><button onClick={() => onRemove(s.id)} className="rounded-md border border-red-200 px-2.5 py-1 font-mono text-[10px] text-red-400 hover:bg-red-50">제거</button></div>))}
        </div>
        <button onClick={onClose} className="mt-4 w-full rounded-lg border border-line px-4 py-2 text-sm font-medium text-ink-sub hover:bg-surface-subtle">닫기</button>
      </div>
    </div>
  )
}

export default function SiteDetailPage() {
  const { id } = useParams()
  const router = useRouter()
  const { user } = useAuth()
  const isMultiMonitor = user?.role === 'MultiMonitor'

  const [site, setSite] = useState<any>(null)
  const [allSensors, setAllSensors] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [activeSensorId, setActiveSensorId] = useState<number | null>(null)
  const [sensor, setSensor] = useState<any>(null)
  const [viewMode, setViewMode] = useState<'map' | 'detail'>('map')

  const [icons, setIcons] = useState<{ key: string; label: string; x: number; y: number }[]>([])
  const [editingIcon, setEditingIcon] = useState<{ key: string; label: string } | null>(null)
  const [editingLabel, setEditingLabel] = useState('')
  const [showDeleteIconModal, setShowDeleteIconModal] = useState(false)
  const [showAddIcon, setShowAddIcon] = useState(false)
  const [addIconSensor, setAddIconSensor] = useState<string>('')
  const [addIconDepth, setAddIconDepth] = useState<'1' | '2' | '3'>('1')
  const floorPlanRef = useRef<HTMLDivElement>(null)
  const [floorPlanTimestamp, setFloorPlanTimestamp] = useState(Date.now())
  const draggingKey = useRef<string | null>(null)
  const dragStart = useRef<{ mx: number; my: number; ix: number; iy: number } | null>(null)

  const today = new Date().toISOString().slice(0, 10)
  const [dateFrom, setDateFrom] = useState(today)
  const [dateTo, setDateTo] = useState(today)
  const [chartMode, setChartMode] = useState<'hourly' | 'daily'>('hourly')
  const [selectedHour, setSelectedHour] = useState(12)
  const [calcMode, setCalcMode] = useState<'linear' | 'poly'>('linear')
  const [depthLabel, setDepthLabel] = useState<'1' | '2' | '3'>('1')
  const [measurements, setMeasurements] = useState<any[]>([])
  const [depth1Data, setDepth1Data] = useState<any[]>([])
  const [depth3Data, setDepth3Data] = useState<any[]>([])
  const [correctionParams, setCorrectionParams] = useState<Record<string, number>>({})
  const [initValue, setInitValue] = useState<number>(0)
  const [globalInitReading, setGlobalInitReading] = useState<any>(null)
  const [criteriaEditing, setCriteriaEditing] = useState(false)
  const [criteriaInput, setCriteriaInput] = useState<{ upper: any; lower: any }>({ upper: '', lower: '' })
  const [criteriaSaving, setCriteriaSaving] = useState(false)
  const [tablePage, setTablePage] = useState(1)
  const PAGE_SIZE = 15
  const chartRef = useRef<HTMLDivElement>(null)
  const [showAddSensor, setShowAddSensor] = useState(false)
  const [showRemoveSensor, setShowRemoveSensor] = useState(false)
  const [qrSensor, setQrSensor] = useState<{ id: string; name: string } | null>(null)
  const [correctionInput, setCorrectionInput] = useState<Record<string, string>>({})
  const [correctionSaving, setCorrectionSaving] = useState(false)
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({})
  const [queryCondition, setQueryCondition] = useState({
    dateFrom: today, dateTo: today, chartMode: 'hourly' as 'hourly' | 'daily',
    selectedHour: 12, calcMode: 'linear' as 'linear' | 'poly', depthLabel: '1' as '1'|'2'|'3'
  })

  const saveIconPositions = useCallback(async (nextIcons: typeof icons) => {
    if (!site?.id) return
    const positions: Record<string, any> = {}
    nextIcons.forEach(ic => { positions[ic.key] = { label: ic.label, x: ic.x, y: ic.y } })
    await fetch(`${API_BASE}/api/sites/${site.id}/sensor-positions`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('gm_token')}` }, body: JSON.stringify({ positions }) }).catch(() => {})
  }, [site])

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!draggingKey.current || !dragStart.current || !floorPlanRef.current) return
      const rect = floorPlanRef.current.getBoundingClientRect()
      const dx = (e.clientX - dragStart.current.mx) / rect.width, dy = (e.clientY - dragStart.current.my) / rect.height
      setIcons(prev => prev.map(i => i.key === draggingKey.current ? { ...i, x: Math.max(0, Math.min(1, dragStart.current!.ix + dx)), y: Math.max(0, Math.min(1, dragStart.current!.iy + dy)) } : i))
    }
    const onUp = () => { if (!draggingKey.current) return; draggingKey.current = null; dragStart.current = null; setIcons(prev => { saveIconPositions(prev); return prev }) }
    window.addEventListener('mousemove', onMove); window.addEventListener('mouseup', onUp)
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp) }
  }, [saveIconPositions])

  useEffect(() => {
    if (!id) return
    Promise.all([siteApi.getAll(), sensorApi.getAll()]).then(([sitesData, sensorsData]) => {
      const found = sitesData.find((s: any) => String(s.id) === String(id))
      if (!found) { router.push('/sites'); return }
      setSite(found); setAllSensors(sensorsData)
      if (found.sensor_positions) setIcons(Object.entries(found.sensor_positions as Record<string, any>).map(([key, val]: any) => ({ key, label: val.label || key, x: val.x, y: val.y })))
    }).finally(() => setLoading(false))
  }, [id])

  useEffect(() => {
    if (!activeSensorId) return
    sensorApi.getById(activeSensorId).then((data: any) => {
      const fp = data.formula_params; const base = fp ? (fp['1'] || fp) : null
      setSensor({
        ...data, id: String(data.id), manageNo: data.manage_no || '',
        formulaParams: base ? { coeffA: base.A || base.coeffA || '', coeffB: base.B || base.coeffB || '', coeffC: base.C || base.coeffC || '', coeffG: base.G || base.coeffG || '', initVal: base.initVal || String(base.I || '') || '' } : { coeffA: '', coeffB: '', coeffC: '', coeffG: '', initVal: '' },
        criteria: { level1Upper: data.level1_upper != null ? parseFloat(data.level1_upper) : null, level1Lower: data.level1_lower != null ? parseFloat(data.level1_lower) : null, depthCriteria: data.depth_criteria || {} },
        siteName: data.site_name || '', installDate: data.install_date || '', location: { description: data.location_desc || '' },
        unit: data.unit || '', formula: data.formula || '', lastUpdated: data.last_measured || '', status: data.status || 'offline', site_managers: data.site_managers || '[]',
      })
      setCorrectionParams(data.correction_params || {}); setDepthLabel('1'); setMeasurements([]); setCriteriaEditing(false)
    })
  }, [activeSensorId])

  useEffect(() => {
    if (!sensor) return
    const sc = sensor.sensor_code || ''
    const params: any = { from: queryCondition.chartMode === 'daily' ? `${queryCondition.dateFrom}T${String(queryCondition.selectedHour).padStart(2,'0')}:00:00` : queryCondition.dateFrom, to: queryCondition.chartMode === 'daily' ? `${queryCondition.dateTo}T${String(queryCondition.selectedHour).padStart(2,'0')}:00:59` : queryCondition.dateTo, limit: 2000 }
    if (sc === '80053') params.depthLabel = depthLabel
    sensorApi.getMeasurements(sensor.id, params).then((data: any[]) => {
      const corr = correctionParams[depthLabel] ?? 0
      setMeasurements(data.map((m: any) => ({ ...m, timestamp: m.measured_at, value: parseFloat(((calcMode === 'linear' ? parseFloat(m.linear_value ?? m.value) : parseFloat(m.value)) + corr).toFixed(4)), unit: sensor.unit || '' })))
    }).catch(() => setMeasurements([]))
  }, [sensor?.sensor_code, correctionParams, queryCondition])

  useEffect(() => {
    if (!sensor || sensor.sensor_code !== '80053' || depthLabel !== '2') { setDepth1Data([]); setDepth3Data([]); return }
    const p: any = { from: dateFrom, to: dateTo, limit: 2000 }
    const toVal = (m: any, d: string) => parseFloat(((calcMode === 'linear' ? parseFloat(m.linear_value ?? m.value) : parseFloat(m.value)) + (correctionParams[d] ?? 0)).toFixed(4))
    sensorApi.getMeasurements(sensor.id, { ...p, depthLabel: '1' }).then((data: any[]) => setDepth1Data(data.map(m => ({ timestamp: m.measured_at, value: toVal(m, '1') })))).catch(() => {})
    sensorApi.getMeasurements(sensor.id, { ...p, depthLabel: '3' }).then((data: any[]) => setDepth3Data(data.map(m => ({ timestamp: m.measured_at, value: toVal(m, '3') })))).catch(() => {})
  }, [sensor, depthLabel, dateFrom, dateTo, calcMode, correctionParams])

  useEffect(() => {
    if (!sensor) return
    const sc = sensor.sensor_code || ''
    if (sc === '80053' && depthLabel === '2') {
      Promise.all([sensorApi.getMeasurements(sensor.id, { limit: 2000, depthLabel: '1' }), sensorApi.getMeasurements(sensor.id, { limit: 2000, depthLabel: '3' })]).then(([d1, d3]) => {
        const o1 = [...d1].sort((a: any, b: any) => new Date(a.measured_at).getTime() - new Date(b.measured_at).getTime())[0]
        const o3 = [...d3].sort((a: any, b: any) => new Date(a.measured_at).getTime() - new Date(b.measured_at).getTime())[0]
        if (o1 && o3) { const v1 = parseFloat(o1.linear_value ?? o1.value), v3 = parseFloat(o3.linear_value ?? o3.value), avg = (v1 + v3) / 2; const rawAvg = (parseFloat(o1.value) + parseFloat(o3.value)) / 2; const ts = new Date(o1.measured_at).getTime() < new Date(o3.measured_at).getTime() ? o1.measured_at : o3.measured_at; setGlobalInitReading({ value: avg, linear_value: avg, raw_value: rawAvg, timestamp: ts }); setInitValue(avg) }
      }).catch(() => {}); return
    }
    sensorApi.getMeasurements(sensor.id, { limit: 2000, depthLabel: sc === '80053' ? depthLabel : undefined }).then((data: any[]) => {
      if (data.length > 0) { const oldest = [...data].sort((a: any, b: any) => new Date(a.measured_at).getTime() - new Date(b.measured_at).getTime())[0]; const val = parseFloat(parseFloat(oldest.linear_value ?? oldest.value).toFixed(4)); const rawVal = parseFloat(oldest.raw_value ?? oldest.value); setGlobalInitReading({ value: val, linear_value: val, raw_value: rawVal, timestamp: oldest.measured_at }); setInitValue(val) }
    }).catch(() => {})
  }, [sensor, depthLabel, correctionParams])

  const activeMeasurements = useMemo(() => {
    if (!sensor || sensor.sensor_code !== '80053' || depthLabel !== '2') return measurements
    const toHourKey = (ts: string) => { const d = new Date(ts); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}T${String(d.getHours()).padStart(2,'0')}` }
    const d1Map = new Map(depth1Data.map(m => [toHourKey(m.timestamp), { value: m.value, timestamp: m.timestamp }]))
    const d3Map = new Map(depth3Data.map(m => [toHourKey(m.timestamp), { value: m.value, timestamp: m.timestamp }]))
    const allKeys = Array.from(new Set([...d1Map.keys(), ...d3Map.keys()])).sort()
    return allKeys.map(key => { const e1 = d1Map.get(key), e2 = d3Map.get(key); const v1 = e1?.value, v3 = e2?.value; const avg = v1 != null && v3 != null ? parseFloat(((v1 + v3) / 2).toFixed(4)) : (v1 ?? v3 ?? 0); return { timestamp: e1?.timestamp || e2?.timestamp || new Date().toISOString(), value: avg, unit: sensor?.unit || '', status: 'normal' } })
  }, [sensor, depthLabel, depth1Data, depth3Data, measurements])

  const measurementsWithGaps = useMemo(() => {
    if (!sensor || chartMode !== 'hourly') return activeMeasurements
    const dataMap = new Map<number, any>()
    activeMeasurements.forEach(m => { const h = new Date(m.timestamp); h.setMinutes(0, 0, 0); dataMap.set(h.getTime(), m) })
    const from = new Date(queryCondition.dateFrom + 'T00:00:00'), to = new Date(queryCondition.dateTo + 'T23:59:59'), now = new Date()
    const slots: any[] = []
    for (let d = new Date(from); d <= to; d.setHours(d.getHours() + 1)) { if (d > now) break; const key = new Date(d); key.setMinutes(0, 0, 0); slots.push(dataMap.get(key.getTime()) ?? { timestamp: key.toISOString(), value: null, unit: sensor?.unit || '', status: 'gap' }) }
    return slots
  }, [activeMeasurements, sensor, queryCondition])

  const dailyReadings = useMemo(() => {
    if (queryCondition.chartMode !== 'daily') return []
    const dataMap = new Map<string, any>()
    activeMeasurements.forEach(m => { const t = new Date(m.timestamp); if (t.getHours() === queryCondition.selectedHour) { const key = t.toISOString().slice(0, 10); if (!dataMap.has(key)) dataMap.set(key, m) } })
    const from = new Date(queryCondition.dateFrom), to = new Date(queryCondition.dateTo), now = new Date()
    const slots: any[] = []
    for (let d = new Date(from); d <= to; d.setDate(d.getDate() + 1)) { if (d > now) break; const key = d.toISOString().slice(0, 10); slots.push(dataMap.get(key) ?? { timestamp: `${key}T${String(queryCondition.selectedHour).padStart(2,'0')}:00:00.000Z`, value: null, unit: sensor?.unit || '', status: 'gap' }) }
    return slots
  }, [activeMeasurements, queryCondition, sensor?.unit])

  const level1Upper = useMemo(() => { if (!sensor) return null; const raw = sensor.sensor_code === '80053' ? sensor.criteria?.depthCriteria?.[depthLabel]?.upper : sensor.criteria?.level1Upper; if (raw == null || raw === '' || isNaN(Number(raw))) return null; return Number(raw) }, [sensor, depthLabel])
  const level1Lower = useMemo(() => { if (!sensor) return null; const raw = sensor.sensor_code === '80053' ? sensor.criteria?.depthCriteria?.[depthLabel]?.lower : sensor.criteria?.level1Lower; if (raw == null || raw === '' || isNaN(Number(raw))) return null; return Number(raw) }, [sensor, depthLabel])
  const latestMeasurement = useMemo(() => { if (activeMeasurements.length === 0) return null; return [...activeMeasurements].filter(m => m.value !== null).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0] }, [activeMeasurements])
  const formulaDisplay = useMemo(() => { if (!sensor) return '—'; if (sensor.sensor_code === '80053') return 'Linear:G*(I-X)*0.703 / Poly:(A*X²+B*X+C)*0.703'; return sensor.formula || '—' }, [sensor])
  const sensorCode = sensor?.sensor_code || ''
  const siteSensors = useMemo(() => { if (!site) return []; return allSensors.filter(s => s.site_code === site.site_code) }, [site, allSensors])
  const iconStatuses = useMemo(() => { const map: Record<string, string> = {}; icons.forEach(icon => { const sid = icon.key.split(':')[0]; map[icon.key] = siteSensors.find((s: any) => String(s.id) === sid)?.status || 'offline' }); return map }, [icons, siteSensors])
  const floorPlanUrl = site?.has_floor_plan ? `${API_BASE}/api/sites/${site.id}/floor-plan-image?t=${floorPlanTimestamp}` : null
  const statusNormal = icons.filter(i => iconStatuses[i.key] === 'normal').length
  const statusWarning = icons.filter(i => iconStatuses[i.key] === 'warning').length
  const statusDanger = icons.filter(i => iconStatuses[i.key] === 'danger').length
  const currentIconKey = sensorCode === '80053' ? `${sensor?.id}:${depthLabel}` : String(sensor?.id)

  const sensorGroups = useMemo(() => {
    const groups: Record<string, any[]> = {}
    siteSensors.forEach((s: any) => { const type = s.name?.replace(/[-–]\s*[\dA-Za-z].*$/, '').trim() || s.sensor_type || '기타'; if (!groups[type]) groups[type] = []; groups[type].push(s) })
    return groups
  }, [siteSensors])

  const handleIconMouseDown = useCallback((key: string, e: React.MouseEvent) => {
    if (isMultiMonitor) return
    e.preventDefault(); e.stopPropagation()
    const icon = icons.find(i => i.key === key); if (!icon) return
    draggingKey.current = key; dragStart.current = { mx: e.clientX, my: e.clientY, ix: icon.x, iy: icon.y }
  }, [icons, isMultiMonitor])

  const handleIconClick = useCallback((key: string) => {
    if (draggingKey.current) return
    const parts = key.split(':'); const clickedSensorId = Number(parts[0]); const clickedDepth = parts[1] as '1'|'2'|'3'|undefined
    if (clickedSensorId !== activeSensorId) setActiveSensorId(clickedSensorId)
    if (clickedDepth) setDepthLabel(clickedDepth)
    setViewMode('detail')
  }, [activeSensorId])

  const handleAddIcon = async () => {
    if (!addIconSensor) return
    const s = allSensors.find((s: any) => String(s.id) === addIconSensor); if (!s) return
    const is80053 = s.sensor_code === '80053'; const key = is80053 ? `${addIconSensor}:${addIconDepth}` : addIconSensor
    const label = is80053 ? `${addIconDepth}번 수위계` : (s.name || String(s.id))
    if (icons.find(i => i.key === key)) { setShowAddIcon(false); return }
    const next = [...icons, { key, label, x: 0.5, y: 0.5 }]; setIcons(next); setShowAddIcon(false); await saveIconPositions(next)
  }

  const handleDeleteIcon = useCallback((key: string) => { const next = icons.filter(i => i.key !== key); setIcons(next); saveIconPositions(next) }, [icons, saveIconPositions])
  const handleEditIcon = useCallback((key: string, newLabel: string) => { if (!newLabel.trim()) return; const next = icons.map(i => i.key === key ? { ...i, label: newLabel.trim() } : i); setIcons(next); saveIconPositions(next); setEditingIcon(null); setEditingLabel('') }, [icons, saveIconPositions])
  const handleAddSensors = async (ids: number[]) => { if (!site) return; await Promise.all(ids.map(sensorId => sensorApi.updateSite(sensorId, site.site_code))); const updated = await sensorApi.getAll(); setAllSensors(updated); setShowAddSensor(false) }
  const handleRemoveSensor = async (sensorId: number) => {
    await sensorApi.updateSite(sensorId, '')
    const nextIcons = icons.filter(i => Number(i.key.split(':')[0]) !== sensorId)
    setIcons(nextIcons); await saveIconPositions(nextIcons)
    const updated = await sensorApi.getAll(); setAllSensors(updated)
    if (activeSensorId === sensorId) { const remaining = updated.filter((s: any) => s.site_code === site.site_code); setActiveSensorId(remaining.length > 0 ? remaining[0].id : null); setSensor(null) }
    setShowRemoveSensor(false)
  }
  const setPreset = (days: number) => { const to = new Date(), from = new Date(); from.setDate(from.getDate() - (days - 1)); setDateTo(to.toISOString().slice(0, 10)); setDateFrom(from.toISOString().slice(0, 10)); setTablePage(1) }
  const tableData = useMemo(() => { const source = queryCondition.chartMode === 'hourly' ? measurementsWithGaps : dailyReadings; return [...source].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()) }, [queryCondition.chartMode, measurementsWithGaps, dailyReadings])
  const totalPages = Math.ceil(tableData.length / PAGE_SIZE)
  const pagedTable = tableData.slice((tablePage - 1) * PAGE_SIZE, tablePage * PAGE_SIZE)

  const handleExcelDownload = async () => {
    if (!sensor) return
    const iconLabel = icons.find(i => i.key === currentIconKey)?.label || ''
    let chartBase64: string | null = null
    if (chartRef.current) { try { const svgEl = chartRef.current.querySelector('svg'); if (svgEl) { const w = svgEl.clientWidth || 800, h = svgEl.clientHeight || 300; const svgData = new XMLSerializer().serializeToString(svgEl); const svgUrl = URL.createObjectURL(new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' })); await new Promise<void>(resolve => { const img = new Image(); img.width = w; img.height = h; img.onload = () => { try { const canvas = document.createElement('canvas'); canvas.width = w; canvas.height = h; const ctx = canvas.getContext('2d')!; ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, w, h); ctx.drawImage(img, 0, 0, w, h); const dataUrl = canvas.toDataURL('image/png'); if (dataUrl && dataUrl.startsWith('data:image/png;base64,') && dataUrl.length > 100) chartBase64 = dataUrl } catch { }; URL.revokeObjectURL(svgUrl); resolve() }; img.onerror = () => { URL.revokeObjectURL(svgUrl); resolve() }; img.src = svgUrl }) } } catch { chartBase64 = null } }
    const excelSourceRows = chartMode === 'hourly' ? activeMeasurements : dailyReadings
    const sortedRows = [...excelSourceRows].sort((a: any, b: any) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
    const initDate = globalInitReading ? new Date(globalInitReading.timestamp) : (sortedRows.length > 0 ? new Date(sortedRows[0].timestamp) : new Date())
    const initRowData = globalInitReading ? { timestamp: globalInitReading.timestamp, value: initValue, isInitRow: true } : null
    const firstInRange = sortedRows[0]
    const initAlreadyInRows = initRowData && firstInRange && Math.abs(new Date(initRowData.timestamp).getTime() - new Date(firstInRange.timestamp).getTime()) < 60000
    const allRows = (initRowData && !initAlreadyInRows) ? [initRowData, ...sortedRows] : sortedRows
    const ExcelJSModule = await import('exceljs') as any; const ExcelJS = ExcelJSModule.default ?? ExcelJSModule
    const wb2 = new ExcelJS.Workbook(); const ws2 = wb2.addWorksheet(sensor.manageNo || sensor.name || '측정데이터')
    const DARK = 'FFD9D9D9', MID = 'FFD9D9D9', WHITE = 'FFFFFFFF', BLACK = 'FF000000', RED = 'FFC00000', BLUE = 'FF2F5496', YELL = 'FFFFF2CC', ALT = 'FFEEF4FB'
    const thin = { style: 'thin' as const, color: { argb: 'FF000000' } }, med = { style: 'medium' as const, color: { argb: DARK } }
    const TB = { top: thin, left: thin, bottom: thin, right: thin }, MB = { top: med, left: med, bottom: med, right: med }
    const fill = (argb: string) => ({ type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb } })
    const font = (bold = false, sz = 9, argb = BLACK) => ({ name: '맑은 고딕', size: sz, bold, color: { argb } })
    const aln = (h: 'center' | 'left' | 'right' = 'center', v: 'middle' | 'top' | 'bottom' = 'middle', wrap = false) => ({ horizontal: h, vertical: v, wrapText: wrap })
    ws2.columns = [{ width: 22 }, { width: 8 }, { width: 16 }, { width: 14 }, { width: 16 }, { width: 18 }]
    const setH = (r: number, h: number) => { ws2.getRow(r).height = h }
    setH(1, 28); setH(2, 4); setH(3, 18); setH(4, 18)
    const CR_START = 5, CR_END = 14
    for (let r = CR_START; r <= CR_END; r++) setH(r, 18)
    setH(CR_END + 1, 14); setH(CR_END + 2, 4); setH(CR_END + 3, 18); setH(CR_END + 4, 18); setH(CR_END + 5, 18); setH(CR_END + 6, 3)
    const DS = CR_END + 7; allRows.forEach((_: any, i: number) => setH(DS + i, 17))
    ws2.mergeCells('A1:F1'); const t = ws2.getCell('A1'); t.value = 'Water Level Meter Report'; t.font = font(true, 15, BLACK); t.fill = fill(WHITE); t.alignment = aln(); t.border = MB
    const infoRows = [['현   장   명', sensor.siteName||'—', '계측기 No.', iconLabel || sensor.manageNo||'—'], ['설 치 현 황', sensor.installDate ? `설치일자 (${sensor.installDate.slice(0, 10)})` : '—', '초기측정일', initDate.toLocaleString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: true })]]
    infoRows.forEach(([l1, v1, l2, v2]: any, i: number) => { const r = 3 + i; ws2.mergeCells(r, 2, r, 3); ws2.mergeCells(r, 5, r, 6); const setC = (col: number, val: string, fnt: any, fil: any, al: any) => { const c = ws2.getCell(r, col); c.value = val; c.font = fnt; c.fill = fil; c.alignment = al; c.border = TB }; setC(1, l1, font(true, 9, BLACK), fill(DARK), aln()); setC(2, v1, font(false, 8, BLACK), fill(WHITE), aln('left')); setC(4, l2, font(true, 9, BLACK), fill(DARK), aln()); setC(5, v2, font(false, 8, BLACK), fill(WHITE), aln('left')) })
    if (chartBase64) { try { const b64data = (chartBase64 as string).split(',')[1]; if (b64data && b64data.length > 0) { const imgId = wb2.addImage({ base64: b64data, extension: 'png' }); ws2.addImage(imgId, { tl: { col: 0, row: CR_START - 1 } as any, br: { col: 6, row: CR_END } as any, editAs: 'oneCell' }) } } catch { } }
    const legendRow = CR_END + 1
    ws2.mergeCells(legendRow, 1, legendRow, 2); const lgLine = ws2.getCell(legendRow, 1); lgLine.value = '── ' + (iconLabel || sensor.manageNo || sensor.name); lgLine.font = { name: '맑은 고딕', size: 9, color: { argb: 'FF2F5496' } }; lgLine.alignment = { horizontal: 'center', vertical: 'middle' }
    ws2.mergeCells(legendRow, 3, legendRow, 4); const lgLower = ws2.getCell(legendRow, 3); lgLower.value = '- - - 1차 하한기준'; lgLower.font = { name: '맑은 고딕', size: 9, color: { argb: 'FFC00000' } }; lgLower.alignment = { horizontal: 'center', vertical: 'middle' }
    ws2.mergeCells(legendRow, 5, legendRow, 6); const lgUpper = ws2.getCell(legendRow, 5); lgUpper.value = '- - - 1차 상한기준'; lgUpper.font = { name: '맑은 고딕', size: 9, color: { argb: 'FFE07000' } }; lgUpper.alignment = { horizontal: 'center', vertical: 'middle' }
    const H1 = CR_END + 3, H2 = CR_END + 4, H3 = CR_END + 5
    const mhdr = (r1: number, c1: number, r2: number, c2: number, val: string, sz = 9, bg = DARK) => { ws2.mergeCells(r1, c1, r2, c2); const c = ws2.getCell(r1, c1); c.value = val; c.font = font(true, sz, BLACK); c.fill = fill(bg); c.alignment = aln('center', 'middle', true); c.border = TB }
    mhdr(H1, 1, H3, 1, '측  정  일'); mhdr(H1, 2, H3, 2, '경과일'); mhdr(H1, 3, H1, 5, sensor.manageNo || sensor.name); mhdr(H1, 6, H3, 6, '비  고'); mhdr(H2, 3, H2, 3, `지하수위 G.L(${sensor.unit})`, 8, MID); mhdr(H2, 4, H2, 5, '변화량(m)', 8, MID)
    const setHdr = (r: number, c: number, val: string, sz = 7, bg = MID) => { const cell = ws2.getCell(r, c); cell.value = val; cell.font = font(true, sz, BLACK); cell.fill = fill(bg); cell.alignment = aln('center', 'middle', true); cell.border = TB }
    ws2.getCell(H3, 3).fill = fill(MID); ws2.getCell(H3, 3).border = TB; setHdr(H3, 4, '전측정치대비'); setHdr(H3, 5, '초기치대비')
    allRows.forEach((row: any, i: number) => {
      const isFirst = !!(row.isInitRow) || (i === 0 && !initRowData)
      const r = DS + i, rf = isFirst ? YELL : (i % 2 === 0 ? ALT : WHITE), base = { fill: fill(rf), border: TB, alignment: aln() }
      const setD = (c: number, val: any, fnt: any, numFmt?: string) => { const cell = ws2.getCell(r, c); cell.value = val; cell.font = fnt; Object.assign(cell, base); if (numFmt) cell.numFmt = numFmt }
      const curDate = new Date(row.timestamp), curMid = new Date(curDate.getFullYear(), curDate.getMonth(), curDate.getDate()), initMid = new Date(initDate.getFullYear(), initDate.getMonth(), initDate.getDate())
      const elapsed = Math.round((curMid.getTime() - initMid.getTime()) / 86400000)
      setD(1, curDate.toLocaleString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: true }), font(false, 9, BLACK))
      if (row.value === null) { setD(2, '—', font(false, 9, BLACK)); setD(3, '미수신', font(false, 9, BLACK)); setD(4, '—', font(false, 9, BLACK)); setD(5, '—', font(false, 9, BLACK)); const cn = ws2.getCell(r, 6); cn.value = ''; cn.font = font(false, 9, BLACK); cn.fill = fill(rf); cn.border = TB; cn.alignment = aln() }
      else { const curVal = parseFloat(parseFloat(String(row.value)).toFixed(4)); const prevValid = allRows.slice(0, i).reverse().find((x: any) => x.value !== null); const prevVal = prevValid ? parseFloat(parseFloat(String(prevValid.value)).toFixed(4)) : curVal; const prevDiff = parseFloat((curVal - prevVal).toFixed(4)), initDiff = parseFloat((curVal - parseFloat(initValue.toFixed(4))).toFixed(4)); setD(2, elapsed, font(false, 9, BLACK)); setD(3, curVal, font(false, 9, BLACK), '0.0000'); if (isFirst) { setD(4, 0, font(false, 9, BLACK), '0.0000'); setD(5, 0, font(false, 9, BLACK), '0.0000') } else { setD(4, prevDiff, font(false, 9, prevDiff < 0 ? RED : BLUE), '+0.0000;-0.0000;0.0000'); setD(5, initDiff, font(false, 9, initDiff < 0 ? RED : BLUE), '+0.0000;-0.0000;0.0000') }; const cn = ws2.getCell(r, 6); cn.value = isFirst ? '초기치' : ''; cn.font = font(isFirst, 9, isFirst ? RED : BLACK); cn.fill = fill(isFirst ? YELL : rf); cn.border = TB; cn.alignment = aln() }
    })
    ws2.pageSetup.paperSize = 9; ws2.pageSetup.orientation = 'portrait'; ws2.pageSetup.fitToPage = true; ws2.pageSetup.fitToWidth = 1; ws2.pageSetup.fitToHeight = 0
    const buf = await wb2.xlsx.writeBuffer(), blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), url = URL.createObjectURL(blob), a = document.createElement('a')
    a.href = url; a.download = `${iconLabel || sensor.manageNo || sensor.name}_${dateFrom}_${dateTo}.xlsx`; a.click(); URL.revokeObjectURL(url)
  }

  const handlePdfDownload = async () => {
    if (!sensor) return
    const iconLabel = icons.find(i => i.key === currentIconKey)?.label || ''
    const doc = new jsPDF('p', 'mm', 'a4'), pageWidth = doc.internal.pageSize.getWidth()
    const fontRes = await fetch('/NanumGothic.ttf'), fontBuffer = await fontRes.arrayBuffer(), uint8 = new Uint8Array(fontBuffer)
    let bin = ''; for (let i = 0; i < uint8.byteLength; i++) bin += String.fromCharCode(uint8[i])
    const fb = btoa(bin); doc.addFileToVFS('NanumGothic.ttf', fb); doc.addFont('NanumGothic.ttf', 'NanumGothic', 'normal'); doc.addFont('NanumGothic.ttf', 'NanumGothic', 'bold'); doc.setFont('NanumGothic', 'normal')
    const managers: string[] = (() => { try { return JSON.parse(sensor.site_managers || '[]') } catch { return [] } })()
    let mt = '—'
    if (managers.length > 0) { try { const u = await userApi.getList(); mt = managers.map((m: string) => { const f = u.find((x: any) => x.username === m); return f ? `${f.username} (${f.role})` : m }).join(', ') } catch { mt = managers.join(', ') } }
    const pdfSourceRows = chartMode === 'hourly' ? activeMeasurements : dailyReadings
    const pdfSortedRows = [...pdfSourceRows].sort((a: any, b: any) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
    const pdfInitDate = globalInitReading ? new Date(globalInitReading.timestamp) : (pdfSortedRows.length > 0 ? new Date(pdfSortedRows[0].timestamp) : new Date())
    const pdfInitRowData = globalInitReading ? { timestamp: globalInitReading.timestamp, value: initValue, isInitRow: true } : null
    const pdfFirstInRange = pdfSortedRows[0]
    const pdfInitAlreadyInRows = pdfInitRowData && pdfFirstInRange && Math.abs(new Date(pdfInitRowData.timestamp).getTime() - new Date(pdfFirstInRange.timestamp).getTime()) < 60000
    const pdfAllRows = (pdfInitRowData && !pdfInitAlreadyInRows) ? [pdfInitRowData, ...pdfSortedRows] : pdfSortedRows
    doc.setFontSize(16); doc.text('Water Level Meter Report', pageWidth / 2, 20, { align: 'center' })
    autoTable(doc, { startY: 28, head: [], body: [['현장명', sensor.siteName || '—', '계측기 No.', iconLabel || sensor.manageNo || '—'], ['설치현황', sensor.installDate ? `설치일자 (${sensor.installDate.slice(0, 10)})` : '—', '초기측정일', pdfInitDate.toLocaleString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: true })]], theme: 'grid', styles: { fontSize: 9, cellPadding: 2, font: 'NanumGothic' }, columnStyles: { 0: { fillColor: [240, 240, 240], cellWidth: 20 }, 1: { cellWidth: 50 }, 2: { fillColor: [240, 240, 240], cellWidth: 20 }, 3: { cellWidth: 50 } } })
    const cy = (doc as any).lastAutoTable.finalY + 5
    const chartData = [...(chartMode === 'hourly' ? measurementsWithGaps : dailyReadings)].sort((a: any, b: any) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
    if (chartData.length > 0) {
      const chartX = 20, chartY = cy, chartW = pageWidth - 30, chartH = 60
      const values = chartData.filter((r: any) => r.value !== null).map((r: any) => parseFloat(r.value))
      const refVals = [...(level1Lower !== null ? [level1Lower as number] : []), ...(level1Upper !== null ? [level1Upper as number] : [])]
      const allVals = [...values, ...refVals]; if (allVals.length === 0) { doc.save(`${iconLabel || sensor.manageNo || sensor.name}_${dateFrom}_${dateTo}.pdf`); return }
      const minVal = Math.min(...allVals), maxVal = Math.max(...allVals), padding = (maxVal - minVal) * 0.15 || 1, yMin = minVal - padding, yMax = maxVal + padding, range = yMax - yMin
      doc.setFillColor(255, 255, 255); doc.setDrawColor(200, 200, 200); doc.setLineWidth(0.3); doc.rect(chartX, chartY, chartW, chartH, 'FD')
      for (let s = 0; s <= 4; s++) { const yVal = yMax - (range / 4) * s, yPos = chartY + (chartH / 4) * s; doc.setDrawColor(230, 230, 230); doc.setLineWidth(0.2); doc.line(chartX, yPos, chartX + chartW, yPos); doc.setFontSize(5); doc.setTextColor(100, 100, 100); doc.text(yVal.toFixed(2), chartX - 1, yPos + 1, { align: 'right' }) }
      doc.text(`G.L(${sensor.unit})`, chartX + 1, chartY + 4)
      if (level1Lower !== null) { const refY = chartY + chartH - ((level1Lower as number - yMin) / range) * chartH; if (refY >= chartY && refY <= chartY + chartH) { doc.setDrawColor(192, 0, 0); doc.setLineWidth(0.5); let x = chartX; while (x < chartX + chartW) { doc.line(x, refY, Math.min(x + 3, chartX + chartW), refY); x += 5 }; doc.setFontSize(5); doc.setTextColor(192, 0, 0); doc.text(`1차 하한기준 (${level1Lower})`, chartX + chartW - 1, refY - 1, { align: 'right' }) } }
      if (level1Upper !== null) { const refY = chartY + chartH - ((level1Upper as number - yMin) / range) * chartH; if (refY >= chartY && refY <= chartY + chartH) { doc.setDrawColor(224, 112, 0); doc.setLineWidth(0.5); let x = chartX; while (x < chartX + chartW) { doc.line(x, refY, Math.min(x + 3, chartX + chartW), refY); x += 5 }; doc.setFontSize(5); doc.setTextColor(224, 112, 0); doc.text(`1차 상한기준 (${level1Upper})`, chartX + chartW - 1, refY - 1, { align: 'right' }) } }
      doc.setDrawColor(34, 150, 100); doc.setLineWidth(0.6)
      for (let i = 1; i < chartData.length; i++) { const pv = chartData[i - 1].value, cv = chartData[i].value; if (pv === null || cv === null) continue; const x1 = chartX + ((i - 1) / (chartData.length - 1)) * chartW, x2 = chartX + (i / (chartData.length - 1)) * chartW, y1 = chartY + chartH - ((parseFloat(pv) - yMin) / range) * chartH, y2 = chartY + chartH - ((parseFloat(cv) - yMin) / range) * chartH; doc.line(x1, y1, x2, y2) }
      doc.setFillColor(34, 150, 100)
      chartData.forEach((r: any, i: number) => { if (r.value === null) return; const x = chartX + (i / (chartData.length - 1 || 1)) * chartW, y = chartY + chartH - ((parseFloat(r.value) - yMin) / range) * chartH, s = 1.2; doc.triangle(x, y - s, x + s, y, x, y + s, 'F'); doc.triangle(x, y - s, x - s, y, x, y + s, 'F') })
      doc.setFontSize(5); doc.setTextColor(120, 120, 120)
      const maxLabels = Math.min(6, chartData.length), labelStep = Math.ceil(chartData.length / maxLabels)
      for (let i = 0; i < chartData.length; i += labelStep) { const x = chartX + (i / (chartData.length - 1 || 1)) * chartW; doc.text(new Date(chartData[i].timestamp).toLocaleDateString('ko-KR', { month: '2-digit', day: '2-digit' }), x, chartY + chartH + 4, { align: 'center' }) }
      const legendY = chartY + chartH + 10, centerX = chartX + chartW / 2
      doc.setFontSize(6); doc.setDrawColor(34, 150, 100); doc.setLineWidth(1.0); doc.line(centerX - 52, legendY, centerX - 44, legendY); doc.setTextColor(34, 150, 100); doc.text(`── ${iconLabel || sensor.manageNo || sensor.name}`, centerX - 42, legendY + 0.5)
      if (level1Lower !== null) { doc.setDrawColor(192, 0, 0); doc.setLineWidth(0.6); let lx = centerX - 3; while (lx < centerX + 5) { doc.line(lx, legendY, Math.min(lx + 3, centerX + 5), legendY); lx += 5 }; doc.setTextColor(192, 0, 0); doc.text('- - - 1차 하한기준', centerX + 7, legendY + 0.5) }
      if (level1Upper !== null) { doc.setDrawColor(224, 112, 0); doc.setLineWidth(0.6); let lx = centerX + 42; while (lx < centerX + 50) { doc.line(lx, legendY, Math.min(lx + 3, centerX + 50), legendY); lx += 5 }; doc.setTextColor(224, 112, 0); doc.text('- - - 1차 상한기준', centerX + 52, legendY + 0.5) }
      doc.setTextColor(0, 0, 0)
    }
    autoTable(doc, { startY: cy + 75, head: [['측정일', '경과일', `지하수위 G.L(${sensor.unit})`, '전측정대비', '초기치대비', '비고']], body: pdfAllRows.map((r: any, i: number) => { const rd = new Date(r.timestamp), cm = new Date(rd.getFullYear(), rd.getMonth(), rd.getDate()), im = new Date(pdfInitDate.getFullYear(), pdfInitDate.getMonth(), pdfInitDate.getDate()), el = Math.round((cm.getTime() - im.getTime()) / 86400000), dateOnlyKey = rd.toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' }), dk = rd.toLocaleString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: true }); if (r.value === null) return [dk, '—', '미수신', '—', '—', '']; const cv = parseFloat(parseFloat(String(r.value)).toFixed(4)), prevValid = pdfAllRows.slice(0, i).reverse().find((x: any) => x.value !== null), pv = prevValid ? parseFloat(parseFloat(String(prevValid.value)).toFixed(4)) : cv, pd = parseFloat((cv - pv).toFixed(4)), id_ = parseFloat((cv - initValue).toFixed(4)), isFirst = !!(r.isInitRow) || (i === 0 && !pdfInitRowData); return [dk, el, cv.toFixed(4), isFirst ? '0.0000' : (pd > 0 ? `+${pd}` : String(pd)), isFirst ? '0.0000' : (id_ > 0 ? `+${id_}` : String(id_)), isFirst ? '초기치' : (dateOnlyKey ? '' : '')] }), theme: 'grid', headStyles: { fillColor: [60, 80, 120], textColor: 255, fontSize: 8, font: 'NanumGothic', fontStyle: 'normal' }, styles: { fontSize: 8, cellPadding: 2, font: 'NanumGothic' } })
    doc.save(`${iconLabel || sensor.manageNo || sensor.name}_${dateFrom}_${dateTo}.pdf`)
  }

  // 공통 모달
  const CommonModals = () => (
    <>
      {showAddSensor && <AddSensorModal siteCode={site.site_code} allSensors={allSensors} onClose={() => setShowAddSensor(false)} onSave={handleAddSensors} />}
      {showRemoveSensor && <RemoveSensorModal siteSensors={siteSensors} onClose={() => setShowRemoveSensor(false)} onRemove={handleRemoveSensor} />}
      {showDeleteIconModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/30 backdrop-blur-sm p-4" onClick={() => setShowDeleteIconModal(false)}>
          <div className="w-full max-w-sm rounded-2xl bg-surface-card p-5 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3"><h3 className="text-sm font-semibold text-ink">아이콘 삭제</h3><button onClick={() => setShowDeleteIconModal(false)} className="text-ink-muted hover:text-ink">✕</button></div>
            <div className="space-y-1 max-h-48 overflow-y-auto">{icons.map(icon => (<div key={icon.key} className="flex items-center justify-between rounded-lg px-3 py-2 hover:bg-surface-subtle"><span className="font-mono text-sm text-ink">{icon.label}</span><button onClick={() => { handleDeleteIcon(icon.key); setShowDeleteIconModal(false) }} className="rounded-md border border-red-200 px-2.5 py-1 font-mono text-[10px] text-red-400 hover:bg-red-50">삭제</button></div>))}</div>
            <button onClick={() => setShowDeleteIconModal(false)} className="mt-4 w-full rounded-lg border border-line px-4 py-2 text-sm font-medium text-ink-sub hover:bg-surface-subtle">닫기</button>
          </div>
        </div>
      )}
      {editingIcon && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/30 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-2xl bg-surface-card p-5 shadow-2xl">
            <h3 className="mb-3 text-sm font-semibold text-ink">아이콘 이름 수정</h3>
            <input type="text" value={editingLabel} onChange={e => setEditingLabel(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') handleEditIcon(editingIcon.key, editingLabel) }} className="w-full rounded-lg border border-line bg-surface-subtle px-3 py-2 text-sm text-ink outline-none focus:border-brand/50 focus:ring-2 focus:ring-brand/10" placeholder="새 이름 입력" autoFocus />
            <div className="mt-3 flex gap-2"><button onClick={() => setEditingIcon(null)} className="flex-1 rounded-lg border border-line px-4 py-2 text-sm font-medium text-ink-sub hover:bg-surface-subtle">취소</button><button onClick={() => handleEditIcon(editingIcon.key, editingLabel)} disabled={!editingLabel.trim()} className="flex-1 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white disabled:opacity-50">저장</button></div>
          </div>
        </div>
      )}
      {showAddIcon && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/30 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-2xl bg-surface-card p-5 shadow-2xl">
            <h3 className="mb-3 text-sm font-semibold text-ink">센서 아이콘 추가</h3>
            <div className="space-y-3">
              <div><label className="mb-1.5 block font-mono text-[10px] font-semibold uppercase tracking-wider text-ink-muted">센서 선택</label><select value={addIconSensor} onChange={e => setAddIconSensor(e.target.value)} className="w-full rounded-lg border border-line bg-surface-subtle px-3 py-2 text-sm text-ink outline-none focus:border-brand/50"><option value="">센서를 선택하세요</option>{siteSensors.map((s: any) => (<option key={s.id} value={String(s.id)}>{s.name}</option>))}</select></div>
              {allSensors.find((s: any) => String(s.id) === addIconSensor)?.sensor_code === '80053' && (<div><label className="mb-1.5 block font-mono text-[10px] font-semibold uppercase tracking-wider text-ink-muted">Depth 선택</label><div className="flex gap-2">{(['1', '2', '3'] as const).map(d => (<button key={d} onClick={() => setAddIconDepth(d)} className={['flex-1 rounded-lg border py-2 font-mono text-sm', addIconDepth === d ? 'border-brand/30 bg-brand/10 text-brand' : 'border-line text-ink-muted hover:bg-surface-subtle'].join(' ')}>{d}번</button>))}</div></div>)}
            </div>
            <div className="mt-4 flex gap-2"><button onClick={() => setShowAddIcon(false)} className="flex-1 rounded-lg border border-line px-4 py-2 text-sm font-medium text-ink-sub hover:bg-surface-subtle">취소</button><button onClick={handleAddIcon} disabled={!addIconSensor} className="flex-1 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white disabled:opacity-50">추가</button></div>
          </div>
        </div>
      )}
      {qrSensor && <QRModal sensorId={qrSensor.id} sensorName={qrSensor.name} onClose={() => setQrSensor(null)} />}
    </>
  )

  if (loading) return <div className="flex h-full items-center justify-center"><p className="font-mono text-sm text-ink-muted">불러오는 중...</p></div>
  if (!site) return null

  // ─── 뷰 1: 평면도 전체 화면 ──────────────────────────────────────────────
  if (viewMode === 'map') {
    return (
      <div className="flex h-full flex-col bg-surface-page">
        <div className="shrink-0 border-b border-line bg-surface-card/90 px-4 py-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Link href="/sites" className="text-sm text-ink-muted hover:text-ink">← 현장 추가 및 편집</Link>
              <span className="text-line-strong">/</span>
              <h1 className="font-mono text-[15px] font-semibold text-ink">{site.name}</h1>
            </div>
            {!isMultiMonitor && (
              <div className="flex items-center gap-2">
                <span className="font-mono text-[10px] text-ink-muted shrink-0">노드 제어</span>
                <button onClick={() => setShowAddSensor(true)} className="flex items-center gap-1 rounded-md border border-brand/30 bg-brand/10 px-3 py-1.5 font-mono text-xs text-brand hover:bg-brand/20">+ 추가</button>
                <button onClick={() => setShowRemoveSensor(true)} className="flex items-center gap-1 rounded-md border border-red-200 bg-red-50 px-3 py-1.5 font-mono text-xs text-red-400 hover:bg-red-100">− 삭제</button>
              </div>
            )}
          </div>
        </div>
        <div className="flex flex-1 flex-col min-w-0 overflow-hidden">
          <div className="shrink-0 flex items-center justify-between border-b border-line px-3 py-2">
            <div className="flex items-center gap-2">
              <h2 className="text-xs font-semibold text-ink">계측계획 평면도</h2>
              {!isMultiMonitor && <span className="font-mono text-[10px] text-ink-muted hidden sm:inline">(센서를 드래그하여 이동)</span>}
            </div>
            {!isMultiMonitor && (
              <div className="flex items-center gap-1">
                <span className="font-mono text-[10px] text-ink-muted shrink-0">센서 아이콘</span>
                <button onClick={() => setShowAddIcon(true)} className="flex items-center gap-1 rounded-md border border-brand/30 bg-brand/10 px-2.5 py-1 font-mono text-[10px] text-brand hover:bg-brand/20">+ 추가</button>
                {icons.length > 0 && (<><button onClick={() => { const icon = icons.find(i => i.key === currentIconKey) || icons[0]; if (icon) { setEditingIcon({ key: icon.key, label: icon.label }); setEditingLabel(icon.label) } }} className="flex items-center gap-1 rounded-md border border-line bg-surface-card px-2.5 py-1 font-mono text-[10px] text-ink-muted hover:border-brand/40 hover:text-brand">✏️ 수정</button><button onClick={() => setShowDeleteIconModal(true)} className="flex items-center gap-1 rounded-md border border-line bg-surface-card px-2.5 py-1 font-mono text-[10px] text-ink-muted hover:border-red-400/40 hover:text-red-400">🗑️ 삭제</button></>)}
                <div className="w-px h-4 bg-line" />
                <label className="cursor-pointer rounded-md border border-line bg-surface-card px-2 py-1 font-mono text-[10px] text-ink-muted hover:border-brand/40 hover:text-brand">
                  📎 평면도 변경
                  <input type="file" accept="image/jpeg,image/png,image/gif,image/webp,application/pdf" className="hidden" onChange={async (e) => { const file = e.target.files?.[0]; if (!file) return; const formData = new FormData(); formData.append('file', file); try { const res = await fetch(`${API_BASE}/api/sites/${site.id}/floor-plan`, { method: 'POST', headers: { Authorization: `Bearer ${localStorage.getItem('gm_token')}` }, body: formData }); const data = await res.json(); if (data.success) { setSite((prev: any) => ({ ...prev, has_floor_plan: true })); setFloorPlanTimestamp(Date.now()) } else alert('업로드 실패') } catch { alert('업로드 중 오류') } }} />
                </label>
              </div>
            )}
          </div>
          <div className="flex-1 relative bg-surface-subtle overflow-hidden" ref={floorPlanRef}>
            {floorPlanUrl ? (
              <>
                <img src={floorPlanUrl} alt="계측계획 평면도" className="w-full h-full select-none" style={{ objectFit: 'fill', background: '#f8f9fb' }} draggable={false} />
                {icons.map(icon => (<SensorIcon key={icon.key} icon={icon} isSelected={icon.key === currentIconKey} status={iconStatuses[icon.key] || 'offline'} onMouseDown={e => handleIconMouseDown(icon.key, e)} onClick={() => handleIconClick(icon.key)} />))}
                {icons.length > 0 && (
                  <div className="absolute bottom-2 right-2 bg-surface-card/90 rounded-lg border border-line px-2.5 py-1.5 backdrop-blur-sm space-y-0.5">
                    {statusNormal > 0 && <div className="flex items-center gap-1.5 font-mono text-[10px]"><span className="w-1.5 h-1.5 rounded-full bg-sensor-normal" />정상 ({statusNormal})</div>}
                    {statusWarning > 0 && <div className="flex items-center gap-1.5 font-mono text-[10px]"><span className="w-1.5 h-1.5 rounded-full bg-sensor-warning" />경고 ({statusWarning})</div>}
                    {statusDanger > 0 && <div className="flex items-center gap-1.5 font-mono text-[10px]"><span className="w-1.5 h-1.5 rounded-full bg-sensor-danger" />위험 ({statusDanger})</div>}
                  </div>
                )}
              </>
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-3">
                <span className="text-5xl">🗺</span>
                <p className="font-mono text-sm text-ink-muted">평면도 이미지 준비 중</p>
                <p className="font-mono text-[10px] text-ink-muted">PNG, JPG, PDF 업로드 가능</p>
              </div>
            )}
          </div>
        </div>
        <CommonModals />
      </div>
    )
  }

  // ─── 뷰 2: 센서 상세 (아이콘 클릭 후) ────────────────────────────────────
  return (
    <div className="flex h-full flex-col overflow-hidden bg-surface-page">
      {/* 헤더 */}
      <div className="shrink-0 border-b border-line bg-surface-card/90 px-4 py-2.5">
        <div className="flex items-center justify-between">
          <button onClick={() => setViewMode('map')} className="flex items-center gap-1.5 text-sm text-ink-muted hover:text-ink">← 도면으로 돌아가기</button>
          {sensor && (
            <div className="flex items-center gap-2">
              <button onClick={handleExcelDownload} className="flex items-center gap-1 rounded-md border border-line bg-surface-card px-3 py-1.5 font-mono text-xs text-ink-muted hover:border-brand/40 hover:text-brand">📊 Excel</button>
              <button onClick={handlePdfDownload} className="flex items-center gap-1 rounded-md border border-line bg-surface-card px-3 py-1.5 font-mono text-xs text-ink-muted hover:border-brand/40 hover:text-brand">📄 PDF</button>
              <button onClick={() => { const s = allSensors.find((s: any) => String(s.id) === String(activeSensorId)); if (s) setQrSensor({ id: s.id, name: s.name }) }} className="flex items-center gap-1 rounded-md border border-line bg-surface-card px-3 py-1.5 font-mono text-xs text-ink-muted hover:border-brand/40 hover:text-brand">📱 QR</button>
            </div>
          )}
        </div>
      </div>

      {/* 본문 */}
      <div className="flex flex-1 overflow-hidden">
        {/* 좌측 트리 */}
        <div className="w-52 shrink-0 border-r border-line bg-surface-card overflow-y-auto flex flex-col">
          <div className="p-3 flex-1 space-y-3">
            {Object.entries(sensorGroups).map(([groupName, sensors]) => (
              <div key={groupName}>
                <button onClick={() => setCollapsedGroups(prev => ({ ...prev, [groupName]: !prev[groupName] }))}
                  className="w-full flex items-center justify-between px-1 mb-1 hover:opacity-70">
                  <p className="font-mono text-[9px] font-semibold uppercase tracking-wider text-ink-muted">{groupName}</p>
                  <span className="font-mono text-[9px] text-ink-muted">{collapsedGroups[groupName] ? '▶' : '▼'}</span>
                </button>
                {!collapsedGroups[groupName] && (
                <div className="space-y-0.5">
                  {sensors.map((s: any) => {
                    if (s.sensor_code === '80053') {
                      const sensorIcons = icons.filter(i => i.key.startsWith(`${s.id}:`))
                      return sensorIcons.map(icon => {
                        const depth = icon.key.split(':')[1] as '1'|'2'|'3'
                        const isActive = activeSensorId === s.id && depthLabel === depth
                        return (
                          <button key={icon.key} onClick={() => { setActiveSensorId(s.id); setDepthLabel(depth) }}
                            className={['w-full flex items-center gap-2 rounded-lg px-2 py-1.5 text-left font-mono text-[11px] transition-colors', isActive ? 'bg-brand/10 text-brand font-medium' : 'text-ink-sub hover:bg-surface-subtle'].join(' ')}>
                            <span className={['w-2 h-2 rounded-full shrink-0', s.status === 'danger' ? 'bg-sensor-danger' : s.status === 'warning' ? 'bg-sensor-warning' : 'bg-sensor-normal'].join(' ')} />
                            {icon.label}
                          </button>
                        )
                      })
                    }
                    const isActive = activeSensorId === s.id
                    return (
                      <button key={s.id} onClick={() => setActiveSensorId(s.id)}
                        className={['w-full flex items-center gap-2 rounded-lg px-2 py-1.5 text-left font-mono text-[11px] transition-colors', isActive ? 'bg-brand/10 text-brand font-medium' : 'text-ink-sub hover:bg-surface-subtle'].join(' ')}>
                        <span className={['w-2 h-2 rounded-full shrink-0', s.status === 'danger' ? 'bg-sensor-danger' : s.status === 'warning' ? 'bg-sensor-warning' : 'bg-sensor-normal'].join(' ')} />
                        {s.name}
                      </button>
                    )
                  })}
                </div>
                )}
              </div>
            ))}
          </div>
          {/* 센서 정보 (하단) */}
          {sensor && (
            <div className="border-t border-line p-3 shrink-0">
              <div className="flex items-center justify-between mb-2">
                <p className="font-mono text-[9px] font-semibold uppercase tracking-wider text-ink-muted">센서 정보</p>
                <StatusBadge status={sensor.status} />
              </div>
              <dl className="space-y-1">
                {[{ l: '관리번호', v: icons.find(i => i.key === currentIconKey)?.label || '' }, { l: '센서명', v: sensor.name }, { l: '현장', v: sensor.siteName || '—' }, { l: '설치 위치', v: sensor.location?.description || '—' }].map(({ l, v }) => (
                  <div className="flex gap-1" key={l}><dt className="w-14 shrink-0 font-mono text-[10px] text-ink-muted">{l}</dt><dd className="flex-1 font-mono text-[10px] text-ink break-all">{v}</dd></div>
                ))}
              </dl>
            </div>
          )}
        </div>

        {/* 우측: 트렌드 + 로그 */}
        <div className="flex flex-1 flex-col min-w-0 overflow-y-auto">
          {sensor ? (
            <>
              {/* 컨트롤 */}
              <div className="shrink-0 flex items-center gap-2 px-3 py-2.5 border-b border-line flex-wrap bg-surface-card">
                <div className="flex items-center gap-1">{[['오늘', 1], ['7일', 7], ['30일', 30]].map(([label, days]) => (<button key={String(label)} onClick={() => setPreset(Number(days))} className="rounded-md border border-line px-3 py-1 font-mono text-[11px] text-ink-muted hover:bg-surface-subtle hover:text-ink">{label}</button>))}</div>
                <input type="date" value={dateFrom} max={today} onChange={e => { setDateFrom(e.target.value); setTablePage(1) }} className="rounded-md border border-line bg-surface-card px-2 py-1 font-mono text-[11px] text-ink focus:outline-none" />
                <span className="font-mono text-[10px] text-ink-muted">~</span>
                <input type="date" value={dateTo} min={dateFrom} max={today} onChange={e => { setDateTo(e.target.value); setTablePage(1) }} className="rounded-md border border-line bg-surface-card px-2 py-1 font-mono text-[11px] text-ink focus:outline-none" />
                <div className="w-px h-4 bg-line shrink-0" />
                <span className="font-mono text-[11px] text-ink-muted shrink-0">△ 조회 단위</span>
                <div className="flex gap-1">{['시간별', '일별'].map(m => (<button key={m} onClick={() => setChartMode(m === '시간별' ? 'hourly' : 'daily')} className={['rounded-md border px-3 py-1 font-mono text-[11px]', chartMode === (m === '시간별' ? 'hourly' : 'daily') ? 'border-brand/30 bg-brand/10 text-brand' : 'border-line text-ink-muted hover:bg-surface-subtle'].join(' ')}>{m}</button>))}</div>
                {chartMode === 'daily' && (<select value={selectedHour} onChange={e => setSelectedHour(Number(e.target.value))} className="rounded-md border border-line bg-surface-card px-2 py-1 font-mono text-[11px] text-ink focus:outline-none">{Array.from({ length: 24 }, (_, i) => (<option key={i} value={i}>{i < 12 ? `오전 ${i === 0 ? 12 : i}시` : `오후 ${i === 12 ? 12 : i - 12}시`}</option>))}</select>)}
                {sensorCode === '80053' && (<><div className="w-px h-4 bg-line shrink-0" /><span className="font-mono text-[11px] text-ink-muted shrink-0">∧ 계산식</span><div className="flex gap-1">{(isMultiMonitor ? [['Linear', 'linear']] : [['Linear', 'linear'], ['Polynomial', 'poly']]).map(([l, v]) => (<button key={v} onClick={() => setCalcMode(v as 'linear' | 'poly')} className={['rounded-md border px-3 py-1 font-mono text-[11px]', calcMode === v ? 'border-brand/30 bg-brand/10 text-brand' : 'border-line text-ink-muted hover:bg-surface-subtle'].join(' ')}>{l}</button>))}</div><div className="w-px h-4 bg-line shrink-0" /></>)}
                {sensorCode === '80053' && (
                  <div className="flex items-center gap-1">
                    <span className="font-mono text-[11px] text-ink shrink-0 font-medium">보정값</span>
                    <input type="number" step="0.01" min="-100" max="100" placeholder="0.00" value={correctionInput[depthLabel] ?? (correctionParams[depthLabel] !== undefined && correctionParams[depthLabel] !== 0 ? String(correctionParams[depthLabel]) : '')} onChange={e => setCorrectionInput(prev => ({ ...prev, [depthLabel]: e.target.value }))} onWheel={e => e.currentTarget.blur()} className="w-20 rounded-md border border-line bg-surface-card px-2 py-0.5 font-mono text-[10px] text-ink text-right focus:outline-none focus:ring-1 focus:ring-brand/40" />
                    <span className="font-mono text-[11px] text-ink-muted shrink-0">{sensor?.unit}</span>
                    <button disabled={correctionSaving} onClick={async () => { const s = correctionInput[depthLabel] ?? '', v = s === '' ? 0 : parseFloat(s); if (isNaN(v) || v < -100 || v > 100) { alert('보정값은 -100~100 사이의 숫자만 입력 가능합니다.'); return }; const next = { ...correctionParams, [depthLabel]: v }; setCorrectionSaving(true); try { await sensorApi.updateInfo(Number(activeSensorId), { correction_params: next }); setCorrectionParams(next); setCorrectionInput(prev => ({ ...prev, [depthLabel]: String(v) })) } catch { } finally { setCorrectionSaving(false) } }} className="rounded-md bg-sensor-normal px-2 py-0.5 font-mono text-[10px] text-white disabled:opacity-50 whitespace-nowrap">{correctionSaving ? '저장중' : '✓ 적용'}</button>
                  </div>
                )}
                <button onClick={() => setQueryCondition({ dateFrom, dateTo, chartMode, selectedHour, calcMode, depthLabel })} className="rounded-md bg-brand px-4 py-1 font-mono text-[11px] text-white hover:bg-brand/90">조회</button>
              </div>

              {/* 측정값 카드 */}
              <div className="shrink-0 grid grid-cols-4 gap-1.5 px-3 py-2 border-b border-line bg-surface-card">
                {[{ label: '기간 내 최신값', value: latestMeasurement?.value }, { label: '초기측정값', value: initValue }, { label: '최솟값', value: activeMeasurements.filter(m => m.value !== null).length > 0 ? Math.min(...activeMeasurements.filter(m => m.value !== null).map(m => m.value)) : null }, { label: '최댓값', value: activeMeasurements.filter(m => m.value !== null).length > 0 ? Math.max(...activeMeasurements.filter(m => m.value !== null).map(m => m.value)) : null }].map(({ label, value }) => (
                  <div key={label} className="rounded-lg border border-line bg-surface-subtle px-2 py-1.5 text-center">
                    <p className="font-mono text-[9px] text-ink-muted">{label}</p>
                    <p className="font-mono text-sm font-semibold mt-0.5 text-sensor-normal">{value !== null && value !== undefined ? Number(value).toFixed(2) : '—'}<span className="text-[10px] text-ink-muted ml-0.5">{sensor.unit}</span></p>
                  </div>
                ))}
              </div>

              {/* 정상 구간 게이지 */}
              {(level1Lower !== null || level1Upper !== null) && latestMeasurement && (() => { const lo = level1Lower as number, hi = level1Upper as number, pct = Math.max(0, Math.min(1, (latestMeasurement.value - lo) / (hi - lo))); return (<div className="shrink-0 px-3 py-1.5 border-b border-line bg-surface-card"><div className="flex justify-between font-mono text-[9px] mb-1"><span className="text-sensor-normaltext font-medium">정상 구간</span><span className="text-sensor-warningtext font-medium">경고</span></div><div className="relative h-2.5 rounded-full overflow-hidden" style={{ background: '#f9d0d0' }}><div className="absolute left-0 top-0 h-full rounded-full bg-sensor-normal/30" style={{ width: '100%' }} /><div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3.5 h-3.5 rounded-full border-2 border-white shadow-md transition-all" style={{ left: `${pct * 100}%`, background: pct >= 0 && pct <= 1 ? '#22c55e' : '#ef4444' }} /></div></div>) })()}

              {/* 차트 */}
              <div ref={chartRef} className="overflow-hidden shrink-0" style={{ height: '380px' }}>
                <SensorTrendChart sensor={sensor} readings={chartMode === 'hourly' ? measurementsWithGaps : dailyReadings} initValue={sensorCode === '80053' ? initValue : undefined} level1Upper={level1Upper} level1Lower={level1Lower} />
              </div>

              {/* 로그 */}
              <div className="shrink-0 border-t border-line">
                <div className="sticky top-0 z-10 flex items-center justify-between border-b border-line bg-surface-card px-4 py-2">
                  <h2 className="text-xs font-semibold text-ink">측정 데이터 로그<span className="ml-2 font-mono text-[10px] text-ink-muted">총 {tableData.length}건</span>{sensorCode === '80053' && <span className="ml-1 font-mono text-[10px] text-brand">({icons.find(i => i.key === `${sensor.id}:${depthLabel}`)?.label || `${depthLabel}번 수위계`})</span>}</h2>
                  {totalPages > 1 && (<div className="flex items-center gap-1"><button disabled={tablePage === 1} onClick={() => setTablePage(p => p - 1)} className="rounded px-2 py-0.5 font-mono text-[11px] text-ink-muted border border-line disabled:opacity-30 hover:bg-surface-subtle">←</button><span className="font-mono text-[11px] text-ink-muted">{tablePage}/{totalPages}</span><button disabled={tablePage === totalPages} onClick={() => setTablePage(p => p + 1)} className="rounded px-2 py-0.5 font-mono text-[11px] text-ink-muted border border-line disabled:opacity-30 hover:bg-surface-subtle">→</button></div>)}
                </div>
                <table className="w-full text-xs">
                  <thead className="bg-surface-subtle"><tr>{['날짜', '시각', `측정값(${sensor.unit})`, '계산상태', '상태'].map(h => (<th key={h} className="border-b border-line px-3 py-1.5 text-left font-mono text-[10px] font-semibold text-ink-muted">{h}</th>))}</tr></thead>
                  <tbody>{pagedTable.length === 0 ? (<tr><td colSpan={5} className="px-4 py-8 text-center font-mono text-xs text-ink-muted">데이터가 없습니다.</td></tr>) : pagedTable.map((row: any, i: number) => { const isGap = row.status === 'gap' || row.value === null, d = new Date(row.timestamp); return (<tr key={i} className={isGap ? 'bg-surface-subtle/50' : i % 2 === 0 ? '' : 'bg-surface-subtle/30'}><td className="border-b border-line px-3 py-1.5 font-mono text-[11px] text-ink-muted">{d.toLocaleDateString('ko-KR', { month: '2-digit', day: '2-digit' })}</td><td className="border-b border-line px-3 py-1.5 font-mono text-[11px] text-ink-muted">{d.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}</td><td className={`border-b border-line px-3 py-1.5 font-mono text-[11px] font-medium ${isGap ? 'text-ink-muted' : 'text-ink'}`}>{isGap ? <span className="text-ink-muted">—</span> : `${Number(row.value).toFixed(4)} ${sensor.unit}`}</td><td className="border-b border-line px-3 py-1.5 font-mono text-[10px] text-ink-muted">{isGap ? '—' : (sensorCode === '80053' ? `${calcMode === 'linear' ? 'Linear' : 'Polynomial'} 적용` : '—')}</td><td className="border-b border-line px-3 py-1.5">{isGap ? <span className="font-mono text-[10px] text-ink-muted">● 미수신</span> : <span className={`font-mono text-[10px] ${row.status === 'danger' ? 'text-sensor-dangertext' : row.status === 'warning' ? 'text-sensor-warningtext' : 'text-sensor-normaltext'}`}>● {row.status === 'danger' ? '위험' : row.status === 'warning' ? '주의' : '정상'}</span>}</td></tr>) })}</tbody>
                </table>
              </div>
            </>
          ) : (
            <div className="flex flex-1 items-center justify-center"><p className="font-mono text-sm text-ink-muted">센서를 선택하면 데이터가 표시됩니다</p></div>
          )}
        </div>
      </div>
      <CommonModals />
    </div>
  )
}
