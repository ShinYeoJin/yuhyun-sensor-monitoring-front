'use client'

import { useState, useMemo, useRef, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { sensorApi, siteApi, userApi } from '@/lib/api'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { SensorTrendChart } from '@/components/charts/SensorTrendChart'
import Link from 'next/link'
import { useAuth } from '@/lib/auth-context'
import { QRModal } from '@/components/ui/QRModal'
import { TrendControlsBar } from '@/components/ui/TrendControlsBar'
import { MeasurementLogTable } from '@/components/ui/MeasurementLogTable'
import ThresholdGauge from '@/components/ui/ThresholdGauge'
import { SensorIcon } from '@/components/ui/SensorIcon'
import { useSensorExport } from '@/hooks/useSensorExport'
import { SiteDetailModals } from '@/components/features/sites/SiteDetailModals'
import { MeasurementSummaryCards } from '@/components/features/sensors/MeasurementSummaryCards'
import { SummaryCard } from '@/components/features/sensors/SummaryCard'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://yuhyun-sensor-monitoring-back.onrender.com'

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
  const pendingViewDetail = useRef(false)
  const pendingDepth = useRef<'1'|'2'|'3' | null>(null)

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

  const today = (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}` })()
  const [dateFrom, setDateFrom] = useState(today)
  const [dateTo, setDateTo] = useState(today)
  const [chartMode, setChartMode] = useState<'hourly' | 'daily'>('hourly')
  const [selectedHour, setSelectedHour] = useState(12)
  const [depthLabel, setDepthLabel] = useState<'1' | '2' | '3'>('1')
  const [measurements, setMeasurements] = useState<any[]>([])
  const [depth1Data, setDepth1Data] = useState<any[]>([])
  const [depth3Data, setDepth3Data] = useState<any[]>([])
  const [correctionParams, setCorrectionParams] = useState<Record<string, number>>({})
  const [criteriaEditing, setCriteriaEditing] = useState(false)
  const [criteriaInput, setCriteriaInput] = useState<{ upper: any; lower: any }>({ upper: '', lower: '' })
  const [criteriaSaving, setCriteriaSaving] = useState(false)
  const chartRef = useRef<HTMLDivElement>(null)
  const [showAddSensor, setShowAddSensor] = useState(false)
  const [showRemoveSensor, setShowRemoveSensor] = useState(false)
  const [qrSensor, setQrSensor] = useState<{ id: string; name: string } | null>(null)
  const [correctionInput, setCorrectionInput] = useState<Record<string, string>>({})
  const [correctionSaving, setCorrectionSaving] = useState(false)
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({})
  const [queryCondition, setQueryCondition] = useState({
    dateFrom: today, dateTo: today, chartMode: 'hourly' as 'hourly' | 'daily',
    selectedHour: 12, depthLabel: '1' as '1'|'2'|'3'
  })
  const [summaryPos, setSummaryPos] = useState({ x: 40, y: 40 })
  const [summaryMinimized, setSummaryMinimized] = useState(false)
  const [baselineMode, setBaselineMode] = useState<'range' | 'allTime'>('allTime')
  const [allTimeOldest, setAllTimeOldest] = useState<{ value: number; timestamp: string } | null>(null)

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
      setCorrectionParams(data.correction_params || {}); setMeasurements([]); setCriteriaEditing(false)
      if (pendingViewDetail.current) {
        // 클릭 시 지정한 depth 적용, 없으면 '1'
        setDepthLabel(pendingDepth.current || '1')
        pendingDepth.current = null
        pendingViewDetail.current = false
        setViewMode('detail')
      } else {
        setDepthLabel('1')
      }
    })
  }, [activeSensorId])

  useEffect(() => {
    if (!sensor) return
    const sc = sensor.sensor_code || ''
    const params: any = { from: queryCondition.chartMode === 'daily' ? `${queryCondition.dateFrom}T${String(queryCondition.selectedHour).padStart(2,'0')}:00:00` : `${queryCondition.dateFrom}T00:00:00`, to: queryCondition.chartMode === 'daily' ? `${queryCondition.dateTo}T${String(queryCondition.selectedHour).padStart(2,'0')}:00:59` : `${queryCondition.dateTo}T23:59:59`, limit: 2000 }
    if (sc === '80053') params.depthLabel = depthLabel
    sensorApi.getMeasurements(sensor.id, params).then((data: any[]) => {
      const corr = correctionParams[depthLabel] ?? 0
      setMeasurements(data.map((m: any) => ({ ...m, timestamp: m.measured_at, value: parseFloat(((parseFloat(m.linear_value) || parseFloat(m.value)) + corr).toFixed(4)), unit: sensor.unit || '' })))
    }).catch(() => setMeasurements([]))
  }, [sensor?.sensor_code, correctionParams, queryCondition])

  useEffect(() => {
    if (!sensor || sensor.sensor_code !== '80053' || depthLabel !== '2') { setDepth1Data([]); setDepth3Data([]); return }
    const p: any = { from: `${dateFrom}T00:00:00`, to: `${dateTo}T23:59:59`, limit: 2000 }
    const toVal = (m: any, d: string) => parseFloat(((parseFloat(m.linear_value) || parseFloat(m.value)) + (correctionParams[d] ?? 0)).toFixed(4))
    sensorApi.getMeasurements(sensor.id, { ...p, depthLabel: '1' }).then((data: any[]) => setDepth1Data(data.map(m => ({ timestamp: m.measured_at, value: toVal(m, '1') })))).catch(() => {})
    sensorApi.getMeasurements(sensor.id, { ...p, depthLabel: '3' }).then((data: any[]) => setDepth3Data(data.map(m => ({ timestamp: m.measured_at, value: toVal(m, '3') })))).catch(() => {})
  }, [sensor, depthLabel, dateFrom, dateTo, correctionParams])

  const activeMeasurements = useMemo(() => {
    if (!sensor || sensor.sensor_code !== '80053' || depthLabel !== '2') return measurements
    const toHourKey = (ts: string) => { const d = new Date(ts); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}T${String(d.getHours()).padStart(2,'0')}` }
    const d1Map = new Map(depth1Data.map(m => [toHourKey(m.timestamp), { value: m.value, timestamp: m.timestamp }]))
    const d3Map = new Map(depth3Data.map(m => [toHourKey(m.timestamp), { value: m.value, timestamp: m.timestamp }]))
    const allKeys = Array.from(new Set([...d1Map.keys(), ...d3Map.keys()])).sort()
    return allKeys.map(key => { const e1 = d1Map.get(key), e2 = d3Map.get(key); const v1 = e1?.value, v3 = e2?.value; const avg = v1 != null && v3 != null ? parseFloat(((v1 + v3) / 2).toFixed(4)) : (v1 ?? v3 ?? 0); return { timestamp: e1?.timestamp || e2?.timestamp || new Date().toISOString(), value: avg, unit: sensor?.unit || '', status: 'normal' } })
  }, [sensor, depthLabel, depth1Data, depth3Data, measurements])

  // allTime 모드: 센서 전체 기간 oldest를 별도 fetch (linear_value valid 우선)
  useEffect(() => {
    if (baselineMode !== 'allTime' || !sensor) { setAllTimeOldest(null); return }
    const sc = sensor.sensor_code || ''
    const pickOldest = (rows: any[]): any | null => {
      if (rows.length === 0) return null
      const sorted = [...rows].sort((a: any, b: any) => new Date(a.measured_at).getTime() - new Date(b.measured_at).getTime())
      if (sc === '80053') {
        const valid = sorted.find((m: any) => { const lv = parseFloat(m.linear_value); return !isNaN(lv) && lv !== 0 })
        return valid ?? sorted[0]
      }
      return sorted[0]
    }
    if (sc === '80053' && depthLabel === '2') {
      Promise.all([sensorApi.getMeasurements(sensor.id, { limit: 2000, depthLabel: '1' }), sensorApi.getMeasurements(sensor.id, { limit: 2000, depthLabel: '3' })]).then(([d1, d3]) => {
        const o1 = pickOldest(d1), o3 = pickOldest(d3)
        if (o1 && o3) {
          const v1 = (parseFloat(o1.linear_value) || parseFloat(o1.value)) + (correctionParams['1'] ?? 0)
          const v3 = (parseFloat(o3.linear_value) || parseFloat(o3.value)) + (correctionParams['3'] ?? 0)
          const avg = parseFloat(((v1 + v3) / 2).toFixed(4))
          const ts = new Date(o1.measured_at).getTime() < new Date(o3.measured_at).getTime() ? o1.measured_at : o3.measured_at
          setAllTimeOldest({ value: avg, timestamp: ts })
        }
      }).catch(() => {})
      return
    }
    const corr = correctionParams[depthLabel] ?? 0
    sensorApi.getMeasurements(sensor.id, { limit: 2000, depthLabel: sc === '80053' ? depthLabel : undefined }).then((data: any[]) => {
      const oldest = pickOldest(data)
      if (oldest) {
        const v = parseFloat(((parseFloat(oldest.linear_value) || parseFloat(oldest.value)) + corr).toFixed(4))
        setAllTimeOldest({ value: v, timestamp: oldest.measured_at })
      }
    }).catch(() => {})
  }, [baselineMode, sensor, depthLabel, correctionParams])

  // 기준값(모드에 따라 분기)
  const globalInitReading = useMemo(() => {
    if (baselineMode === 'allTime') {
      if (!allTimeOldest) return null
      return { value: allTimeOldest.value, linear_value: allTimeOldest.value, raw_value: allTimeOldest.value, timestamp: allTimeOldest.timestamp }
    }
    if (activeMeasurements.length === 0) return null
    const sorted = [...activeMeasurements]
      .filter((m: any) => m.value !== null && m.value !== undefined && !isNaN(parseFloat(String(m.value))))
      .sort((a: any, b: any) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
    if (sorted.length === 0) return null
    const oldest = sorted[0]
    const v = parseFloat(String(oldest.value))
    return { value: v, linear_value: v, raw_value: v, timestamp: oldest.timestamp }
  }, [baselineMode, allTimeOldest, activeMeasurements])

  const initValue = useMemo(() => globalInitReading?.value ?? 0, [globalInitReading])

  // 누적 변화량·실시간 요약의 기준은 측정 데이터 로그의 시간순 첫 row를 사용.
  const baselineDate = useMemo(() => {
    if (!globalInitReading?.timestamp) return ''
    const d = new Date(globalInitReading.timestamp)
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
  }, [globalInitReading])

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
    const localDateKey = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`

    const dataMap = new Map<string, any>()
    activeMeasurements.forEach(m => {
      const t = new Date(m.timestamp)
      if (t.getHours() !== queryCondition.selectedHour) return
      const key = localDateKey(t)
      if (!dataMap.has(key)) dataMap.set(key, m)
    })

    const [fy, fm, fd] = queryCondition.dateFrom.split('-').map(Number)
    const [ty, tm, td] = queryCondition.dateTo.split('-').map(Number)
    const startCur = new Date(fy, fm-1, fd, 0, 0, 0, 0)
    const endLimit = new Date(ty, tm-1, td, 23, 59, 59, 999)
    const now = new Date()
    const endActual = endLimit > now ? now : endLimit

    const slots: any[] = []
    const cur = new Date(startCur)
    while (cur <= endActual) {
      const key = localDateKey(cur)
      if (dataMap.has(key)) {
        slots.push(dataMap.get(key))
      } else {
        const gapTime = new Date(cur)
        gapTime.setHours(queryCondition.selectedHour, 0, 0, 0)
        slots.push({ timestamp: gapTime.toISOString(), value: null, unit: sensor?.unit || '', status: 'gap' })
      }
      cur.setDate(cur.getDate() + 1)
    }
    return slots
  }, [activeMeasurements, queryCondition, sensor?.unit])

  const level1Upper = useMemo(() => { if (!sensor) return null; const raw = sensor.sensor_code === '80053' ? sensor.criteria?.depthCriteria?.[depthLabel]?.upper : sensor.criteria?.level1Upper; if (raw == null || raw === '' || isNaN(Number(raw))) return null; return Number(raw) }, [sensor, depthLabel])
  const level1Lower = useMemo(() => { if (!sensor) return null; const raw = sensor.sensor_code === '80053' ? sensor.criteria?.depthCriteria?.[depthLabel]?.lower : sensor.criteria?.level1Lower; if (raw == null || raw === '' || isNaN(Number(raw))) return null; return Number(raw) }, [sensor, depthLabel])
  const latestMeasurement = useMemo(() => { if (activeMeasurements.length === 0) return null; return [...activeMeasurements].filter(m => m.value !== null).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0] }, [activeMeasurements])
  const validMeasurementValues = useMemo(() => activeMeasurements.filter(m => m.value !== null).map(m => m.value), [activeMeasurements])
  const minValue = useMemo(() => validMeasurementValues.length > 0 ? Math.min(...validMeasurementValues) : null, [validMeasurementValues])
  const maxValue = useMemo(() => validMeasurementValues.length > 0 ? Math.max(...validMeasurementValues) : null, [validMeasurementValues])

  const tableDataAsc = useMemo(() =>
    [...(queryCondition.chartMode === 'hourly' ? measurementsWithGaps : dailyReadings)]
      .sort((a,b)=>new Date(a.timestamp).getTime()-new Date(b.timestamp).getTime())
  , [queryCondition.chartMode, measurementsWithGaps, dailyReadings])
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
    if (clickedSensorId !== activeSensorId) {
      setActiveSensorId(clickedSensorId)
      pendingViewDetail.current = true
      if (clickedDepth) pendingDepth.current = clickedDepth
    } else {
      if (clickedDepth) setDepthLabel(clickedDepth)
      setViewMode('detail')
    }
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
  const handleSummaryMouseDown = (e: React.MouseEvent) => {
    const startX = e.clientX - summaryPos.x, startY = e.clientY - summaryPos.y
    const onMove = (ev: MouseEvent) => setSummaryPos({ x: ev.clientX - startX, y: ev.clientY - startY })
    const onUp = () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp) }
    window.addEventListener('mousemove', onMove); window.addEventListener('mouseup', onUp); e.preventDefault()
  }

  const tableData = useMemo(() => { const source = queryCondition.chartMode === 'hourly' ? measurementsWithGaps : dailyReadings; return [...source].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()) }, [queryCondition.chartMode, measurementsWithGaps, dailyReadings])

  const iconLabel = icons.find(i => i.key === currentIconKey)?.label || ''

  const { handleExcelDownload, handlePdfDownload } = useSensorExport({
    chartRef,
    sensor,
    iconLabel,
    chartMode,
    dateFrom,
    dateTo,
    sensorCode: sensor?.sensor_code || '',
    activeMeasurements,
    dailyReadings,
    measurementsWithGaps,
    globalInitReading,
    initValue,
    level1Upper,
    level1Lower,
    remarks: {},
  })

  // 공통 모달
  const commonModalsProps = {
    site,
    allSensors,
    siteSensors,
    icons,
    addIconSensor,
    addIconDepth,
    editingIcon,
    editingLabel,
    qrSensor,
    showAddSensor,
    showRemoveSensor,
    showDeleteIconModal,
    showAddIcon,
    onAddSensorClose: () => setShowAddSensor(false),
    onAddSensorSave: handleAddSensors,
    onRemoveSensorClose: () => setShowRemoveSensor(false),
    onRemoveSensor: handleRemoveSensor,
    onDeleteIconClose: () => setShowDeleteIconModal(false),
    onDeleteIcon: handleDeleteIcon,
    onEditIconClose: () => setEditingIcon(null),
    onEditIconLabelChange: setEditingLabel,
    onEditIconSave: handleEditIcon,
    onAddIconClose: () => setShowAddIcon(false),
    onAddIconSensorChange: setAddIconSensor,
    onAddIconDepthChange: (v: string) => setAddIconDepth(v as '1' | '2' | '3'),
    onAddIcon: handleAddIcon,
    onQrClose: () => setQrSensor(null),
  }

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
        <SiteDetailModals {...commonModalsProps} />
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
              <div className="shrink-0 px-3 py-2.5 border-b border-line bg-surface-card">
                <TrendControlsBar
                  today={today}
                  dateFrom={dateFrom}
                  dateTo={dateTo}
                  onDateFromChange={setDateFrom}
                  onDateToChange={setDateTo}
                  chartMode={chartMode}
                  onChartModeChange={setChartMode}
                  selectedHour={selectedHour}
                  onSelectedHourChange={setSelectedHour}
                  showCorrection={sensorCode === '80053'}
                  correctionInputValue={correctionInput[depthLabel] ?? (correctionParams[depthLabel] !== undefined && correctionParams[depthLabel] !== 0 ? String(correctionParams[depthLabel]) : '')}
                  onCorrectionInputChange={v => { if (!isMultiMonitor) setCorrectionInput(prev => ({ ...prev, [depthLabel]: v })) }}
                  correctionSaving={correctionSaving}
                  correctionUnit={sensor?.unit}
                  correctionReadOnly={isMultiMonitor}
                  onCorrectionApply={async () => {
                    const s = correctionInput[depthLabel] ?? ''
                    const v = s === '' ? 0 : parseFloat(s)
                    if (isNaN(v) || v < -100 || v > 100) { alert('보정값은 -100~100 사이의 숫자만 입력 가능합니다.'); return }
                    const next = { ...correctionParams, [depthLabel]: v }
                    setCorrectionSaving(true)
                    try { await sensorApi.updateInfo(Number(activeSensorId), { correction_params: next }); setCorrectionParams(next); setCorrectionInput(prev => ({ ...prev, [depthLabel]: String(v) })) } catch { } finally { setCorrectionSaving(false) }
                  }}
                  showBaseline={globalInitReading !== null}
                  baselineDate={baselineDate}
                  baselineValueText={globalInitReading !== null ? `${initValue.toFixed(4)} ${sensor?.unit || ''}` : undefined}
                  baselineMode={baselineMode}
                  onBaselineModeChange={setBaselineMode}
                  onReset={() => { setDateFrom(today); setDateTo(today); setChartMode('hourly'); setSelectedHour(12) }}
                  onQuery={() => setQueryCondition({ dateFrom, dateTo, chartMode, selectedHour, depthLabel })}
                />
              </div>

              {/* 측정값 카드 */}
              <div className="bg-surface-card">
                <MeasurementSummaryCards
                  latestValue={latestMeasurement?.value}
                  initValue={initValue}
                  minValue={minValue}
                  maxValue={maxValue}
                  sensorStatus={sensor?.status || 'normal'}
                  sensorUnit={sensor.unit}
                  globalInitReading={globalInitReading}
                />
              </div>

              {/* 정상 구간 게이지 */}
              <ThresholdGauge
                value={latestMeasurement?.value ?? null}
                lower={level1Lower}
                upper={level1Upper}
                unit={sensor.unit}
                depthLabel={sensorCode === '80053' ? (icons.find(i => i.key === `${sensor.id}:${depthLabel}`)?.label || `${depthLabel}번 수위계`) : undefined}
                baseline={globalInitReading !== null ? initValue : null}
              />

              {/* 차트 */}
              <div ref={chartRef} className="overflow-hidden shrink-0 relative" style={{ height: '380px' }}>
                <SensorTrendChart sensor={sensor} readings={chartMode === 'hourly' ? measurementsWithGaps : dailyReadings} initValue={sensorCode === '80053' ? initValue : undefined} level1Upper={level1Upper} level1Lower={level1Lower} />
                {/* 실시간 요약 카드 */}
                <SummaryCard
                  pos={summaryPos}
                  minimized={summaryMinimized}
                  onMouseDown={handleSummaryMouseDown}
                  onToggleMinimize={() => setSummaryMinimized(v => !v)}
                  curVal={latestMeasurement?.value != null ? parseFloat(String(latestMeasurement.value)) : null}
                  maxVal={maxValue}
                  minVal={minValue}
                  initValue={initValue}
                  globalInitReading={globalInitReading}
                  sensorUnit={sensor?.unit || ''}
                  sensorCode={sensorCode}
                />
              </div>

              {/* 로그 */}
              <div className="shrink-0 border-t border-line bg-surface-subtle/30 px-3 py-3">
                <MeasurementLogTable
                  tableData={tableData}
                  tableDataAsc={tableDataAsc}
                  chartMode={chartMode}
                  unit={sensor.unit}
                  sensorCode={sensorCode}
                  logLabel={sensorCode === '80053' ? (icons.find(i => i.key === `${sensor.id}:${depthLabel}`)?.label || `${depthLabel}번 수위계`) : undefined}
                  globalInitReading={globalInitReading}
                  initValue={initValue}
                  dateFrom={dateFrom}
                  dateTo={dateTo}
                  baselineDate={baselineDate}
                  correctionValue={sensorCode === '80053' ? (correctionInput[depthLabel] ?? (correctionParams[depthLabel] !== undefined && correctionParams[depthLabel] !== 0 ? String(correctionParams[depthLabel]) : '')) : undefined}
                  selectedHour={queryCondition.selectedHour}
                />
              </div>
            </>
          ) : (
            <div className="flex flex-1 items-center justify-center"><p className="font-mono text-sm text-ink-muted">센서를 선택하면 데이터가 표시됩니다</p></div>
          )}
        </div>
      </div>
      <SiteDetailModals {...commonModalsProps} />
    </div>
  )
}
