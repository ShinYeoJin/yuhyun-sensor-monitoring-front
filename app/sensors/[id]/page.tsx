'use client'

import { useState, useMemo, useRef, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { getThresholds } from '@/lib/mock-data'
import { sensorApi, userApi } from '@/lib/api'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { SensorTrendChart } from '@/components/charts/SensorTrendChart'
import { QRModal } from '@/components/ui/QRModal'
import Link from 'next/link'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { useAuth } from '@/lib/auth-context'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://yuhyun-sensor-monitoring-back.onrender.com'

function dateDiffDays(from: string, to: string): number {
  const a = new Date(from + 'T00:00:00'), b = new Date(to + 'T00:00:00')
  return Math.round((b.getTime() - a.getTime()) / 86400000)
}

// ─── 센서 아이콘 ─────────────────────────────────────────────────────────────
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
        <span style={{ width: 7, height: 7, borderRadius: '50%', background: status === 'danger' ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.8)', display: 'inline-block', animation: status === 'danger' ? 'pulse 1.2s infinite' : 'none' }} />
        <span style={{ color: '#fff', fontSize: 11, fontWeight: 600, fontFamily: 'monospace', whiteSpace: 'nowrap' }}>{icon.label}</span>
      </div>
    </div>
  )
}

export default function SensorDetailPage() {
  const params = useParams()
  const id = Array.isArray(params.id) ? params.id[0] : params.id
  const [sensor, setSensor] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [measurements, setMeasurements] = useState<any[]>([])
  const { user } = useAuth()
  const isMultiMonitor = user?.role === 'MultiMonitor'
  const today = new Date().toISOString().slice(0, 10)

  useEffect(() => {
    if (!id) return
    sensorApi.getById(Number(id)).then((data: any) => {
      setSensor({
        id: String(data.id), manageNo: data.manage_no || '', name: data.name, nameAbbr: data.sensor_code,
        field: data.field || '공통', formula: data.formula || '', unit: data.unit || '',
        threshold: { normalMax: data.threshold_normal_max ?? '', warningMax: data.threshold_warning_max ?? '', dangerMin: data.threshold_danger_min ?? '' },
        formulaParams: data.formula_params ? {
          coeffA: data.formula_params.coeffA || '', coeffB: data.formula_params.coeffB || '',
          coeffC: data.formula_params.coeffC || '', coeffG: data.formula_params.coeffG || '',
          initVal: data.formula_params.initVal || '',
        } : { coeffA: '', coeffB: '', coeffC: '', coeffG: '', initVal: '' },
        criteria: {
          level1Upper: data.level1_upper ?? '', level1Lower: data.level1_lower ?? '',
          level2Upper: data.level2_upper ?? '', level2Lower: data.level2_lower ?? '',
        },
        siteId: data.site_code || '', siteDbId: data.site_db_id || null, siteName: data.site_name || '',
        installDate: data.install_date || '', location: { description: data.location_desc || '' },
        status: data.status || 'offline', currentValue: data.current_value ? parseFloat(data.current_value) : 0,
        lastUpdated: data.last_measured || new Date().toISOString(),
        site_managers: data.site_managers || '[]',
        floor_plan_url: data.has_floor_plan ? 'exists' : null,
        site_floor_plan_url: data.has_site_floor_plan ? 'exists' : null,
        sensor_positions: data.sensor_positions || {}, readings: [],
      })
      setSensorCode(data.sensor_code || '')
      setCorrectionParams(data.correction_params || {})
    }).catch(() => setSensor(null)).finally(() => setLoading(false))
  }, [id])

  // ─── 현장 센서 목록 ────────────────────────────────────────────────────────
  const [allSensors, setAllSensors] = useState<any[]>([])
  useEffect(() => { sensorApi.getAll().then((d: any[]) => setAllSensors(d)).catch(() => {}) }, [])

  // ─── 아이콘 상태 ───────────────────────────────────────────────────────────
  const [icons, setIcons] = useState<{ key: string; label: string; x: number; y: number }[]>([])
  const [floorPlanTimestamp, setFloorPlanTimestamp] = useState<number>(Date.now())
  const floorPlanRef = useRef<HTMLDivElement>(null)
  const draggingKey = useRef<string | null>(null)
  const dragStart = useRef<{ mx: number; my: number; ix: number; iy: number } | null>(null)
  const [showAddIcon, setShowAddIcon] = useState(false)
  const [addIconSensor, setAddIconSensor] = useState<string>('')
  const [addIconDepth, setAddIconDepth] = useState<string>('1')

  useEffect(() => {
    if (!sensor?.sensor_positions) return
    const pos = sensor.sensor_positions
    const loaded = Object.entries(pos).map(([key, val]: any) => ({ key, label: val.label || key, x: val.x, y: val.y }))
    setIcons(loaded)
  }, [sensor?.sensor_positions])

  const saveIconPositions = useCallback(async (nextIcons: typeof icons) => {
    if (!sensor?.siteDbId) return
    const positions: Record<string, any> = {}
    nextIcons.forEach(ic => { positions[ic.key] = { label: ic.label, x: ic.x, y: ic.y } })
    await fetch(`${API_BASE}/api/sites/${sensor.siteDbId}/sensor-positions`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('gm_token')}` },
      body: JSON.stringify({ positions }),
    }).catch(() => {})
  }, [sensor])

  const handleIconMouseDown = useCallback((key: string, e: React.MouseEvent) => {
    if (isMultiMonitor) return
    e.preventDefault(); e.stopPropagation()
    const icon = icons.find(i => i.key === key); if (!icon) return
    draggingKey.current = key
    dragStart.current = { mx: e.clientX, my: e.clientY, ix: icon.x, iy: icon.y }
  }, [icons, isMultiMonitor])

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!draggingKey.current || !dragStart.current || !floorPlanRef.current) return
      const rect = floorPlanRef.current.getBoundingClientRect()
      const dx = (e.clientX - dragStart.current.mx) / rect.width
      const dy = (e.clientY - dragStart.current.my) / rect.height
      setIcons(prev => prev.map(i => i.key === draggingKey.current ? { ...i, x: Math.max(0, Math.min(1, dragStart.current!.ix + dx)), y: Math.max(0, Math.min(1, dragStart.current!.iy + dy)) } : i))
    }
    const onUp = () => {
      if (!draggingKey.current) return
      const key = draggingKey.current
      draggingKey.current = null; dragStart.current = null
      setIcons(prev => { saveIconPositions(prev); return prev })
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp) }
  }, [saveIconPositions])

  const handleIconClick = useCallback((key: string) => {
    if (draggingKey.current) return
    const parts = key.split(':')
    const clickedSensorId = parts[0]; const clickedDepth = parts[1] as '1' | '2' | '3' | undefined
    if (clickedSensorId !== String(sensor?.id)) { window.location.href = `/sensors/${clickedSensorId}`; return }
    if (clickedDepth) setDepthLabel(clickedDepth)
  }, [sensor])

  const handleAddIcon = async () => {
    if (!addIconSensor) return
    const s = allSensors.find((s: any) => String(s.id) === addIconSensor); if (!s) return
    const is80053 = s.sensor_code === '80053'
    const key = is80053 ? `${addIconSensor}:${addIconDepth}` : addIconSensor
    const label = is80053 ? `${s.name || s.manage_no} ${addIconDepth}번` : (s.name || s.manage_no)
    if (icons.find(i => i.key === key)) { setShowAddIcon(false); return }
    const next = [...icons, { key, label, x: 0.5, y: 0.5 }]
    setIcons(next); setShowAddIcon(false)
    await saveIconPositions(next)
  }

  const handleDeleteIcon = async (key: string) => {
    const next = icons.filter(i => i.key !== key)
    setIcons(next); await saveIconPositions(next)
  }

  const iconStatuses = useMemo(() => {
    const map: Record<string, string> = {}
    icons.forEach(ic => {
      const sid = ic.key.split(':')[0]
      map[ic.key] = allSensors.find((s: any) => String(s.id) === sid)?.status || 'offline'
    })
    return map
  }, [icons, allSensors])

  const siteSensors = useMemo(() => {
    if (!sensor?.siteId) return allSensors
    return allSensors.filter((s: any) => s.site_code === sensor.siteId)
  }, [allSensors, sensor?.siteId])

  // ─── 상태 ─────────────────────────────────────────────────────────────────
  const [sensorCode, setSensorCode] = useState<string>('')
  const [dateFrom, setDateFrom] = useState(today)
  const [dateTo,   setDateTo]   = useState(today)
  const [chartMode, setChartMode] = useState<'hourly' | 'daily'>('hourly')
  const [depthLabel, setDepthLabel] = useState<'1' | '2' | '3'>('1')
  const [calcMode,   setCalcMode]   = useState<'poly' | 'linear'>('linear')
  const [correctionParams, setCorrectionParams] = useState<Record<string, number>>({})
  const [correctionInput,  setCorrectionInput]  = useState<Record<string, string>>({})
  const [correctionSaving, setCorrectionSaving] = useState(false)
  const [qrOpen, setQrOpen] = useState(false)
  const [printOpen, setPrintOpen] = useState(false)
  const [tablePage, setTablePage] = useState(1)
  const [remarks, setRemarks] = useState<Record<string, string>>({})
  const TABLE_PAGE_SIZE = 15
  const chartRef = useRef<HTMLDivElement>(null)
  const printRef = useRef<HTMLDivElement>(null)

  // ─── 측정값 로딩 ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!id || !sensorCode) return
    sensorApi.getMeasurements(Number(id), {
      from: dateFrom, to: dateTo, limit: 2000,
      depthLabel: sensorCode === '80053' ? depthLabel : undefined,
    }).then((data: any[]) => {
      const corr = correctionParams[depthLabel] ?? 0
      const mapped = data.map((m: any) => ({
        timestamp: m.measured_at,
        value: parseFloat(((calcMode === 'poly' ? parseFloat(m.value) : parseFloat(m.linear_value ?? m.value)) + corr).toFixed(4)),
        unit: sensor?.unit || '', status: 'normal',
      }))
      setMeasurements(mapped.reverse())
    }).catch(() => {})
  }, [id, sensorCode, dateFrom, dateTo, depthLabel, calcMode, correctionParams])

  const [globalInitReading, setGlobalInitReading] = useState<any>(null)
  useEffect(() => {
    if (!id || !sensorCode) return
    sensorApi.getMeasurements(Number(id), { limit: 2000, depthLabel: sensorCode === '80053' ? depthLabel : undefined })
      .then((data: any[]) => {
        if (data.length > 0) {
          const oldest = [...data].sort((a: any, b: any) => new Date(a.measured_at).getTime() - new Date(b.measured_at).getTime())[0]
          const corr = correctionParams[depthLabel] ?? 0
          setGlobalInitReading({ value: parseFloat(oldest.value) + corr, linear_value: parseFloat(oldest.linear_value ?? oldest.value) + corr, timestamp: oldest.measured_at })
        }
      }).catch(() => {})
  }, [id, sensorCode, depthLabel, correctionParams])

  // ─── 데이터 공백 구간 처리 ────────────────────────────────────────────────
  const measurementsWithGaps = useMemo(() => {
    if (measurements.length === 0) return []
    const sorted = [...measurements].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
    const dataMap = new Map<number, any>()
    sorted.forEach(m => {
      const t = new Date(m.timestamp)
      dataMap.set(new Date(t.getFullYear(), t.getMonth(), t.getDate(), t.getHours()).getTime(), m)
    })
    const first = new Date(sorted[0].timestamp), last = new Date(sorted[sorted.length - 1].timestamp)
    const slotFrom = new Date(first.getFullYear(), first.getMonth(), first.getDate(), first.getHours())
    const slotTo   = new Date(last.getFullYear(), last.getMonth(), last.getDate(), last.getHours())
    const slots: any[] = []
    let cur = new Date(slotFrom)
    while (cur <= slotTo) {
      const key = cur.getTime()
      slots.push(dataMap.has(key) ? dataMap.get(key) : { timestamp: cur.toISOString(), value: null, unit: sensor?.unit || '', status: 'gap' })
      cur = new Date(cur.getTime() + 3600000)
    }
    return slots
  }, [measurements, sensor?.unit])

  const dailyReadings = useMemo(() => {
    const map = new Map<string, any>()
    const sorted = [...measurements].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
    sorted.forEach(m => {
      const date = new Date(m.timestamp).toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' })
      map.set(date, m)
    })
    return Array.from(map.values())
  }, [measurements])

  // ─── 1차 상하한 ───────────────────────────────────────────────────────────
  const { level1Upper, level1Lower } = useMemo(() => {
    if (sensorCode === '80053' && globalInitReading) {
      const iv = parseFloat(String(calcMode === 'linear' ? (globalInitReading.linear_value ?? globalInitReading.value) : globalInitReading.value))
      return { level1Upper: parseFloat((iv + 4).toFixed(2)), level1Lower: parseFloat((iv - 4).toFixed(2)) }
    }
    return {
      level1Upper: sensor?.criteria?.level1Upper !== '' && sensor?.criteria?.level1Upper != null ? parseFloat(sensor.criteria.level1Upper) : null,
      level1Lower: sensor?.criteria?.level1Lower !== '' && sensor?.criteria?.level1Lower != null ? parseFloat(sensor.criteria.level1Lower) : null,
    }
  }, [sensorCode, globalInitReading, calcMode, sensor])

  const initValue = useMemo(() => {
    if (!globalInitReading) return 0
    return parseFloat(String(sensorCode === '80053' && calcMode === 'linear' ? (globalInitReading.linear_value ?? globalInitReading.value) : globalInitReading.value))
  }, [globalInitReading, sensorCode, calcMode])

  const latestMeasurement = useMemo(() => {
    if (measurements.length === 0) return null
    return [...measurements].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0]
  }, [measurements])

  const { thresholdWarning, thresholdDanger } = sensor ? getThresholds(sensor) : { thresholdWarning: 0, thresholdDanger: 0 }

  const setPreset = (days: number) => {
    const from = new Date(); from.setDate(from.getDate() - (days - 1))
    setDateFrom(from.toISOString().slice(0, 10)); setDateTo(today); setTablePage(1)
  }

  // ─── 엑셀 ─────────────────────────────────────────────────────────────────
  const handleExcelDownload = async () => {
    let chartBase64: string | null = null
    if (chartRef.current) {
      try {
        const svgEl = chartRef.current.querySelector('svg')
        if (svgEl) {
          const svgData = new XMLSerializer().serializeToString(svgEl)
          const svgUrl  = URL.createObjectURL(new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' }))
          await new Promise<void>(resolve => {
            const img = new Image(); const scale = 3
            img.onload = () => {
              const canvas = document.createElement('canvas')
              canvas.width = svgEl.clientWidth * scale; canvas.height = svgEl.clientHeight * scale
              const ctx = canvas.getContext('2d')!
              ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, canvas.width, canvas.height)
              ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
              chartBase64 = canvas.toDataURL('image/png', 1.0)
              URL.revokeObjectURL(svgUrl); resolve()
            }
            img.onerror = () => { URL.revokeObjectURL(svgUrl); resolve() }
            img.src = svgUrl
          })
        }
      } catch {}
    }
    const managerUsernames: string[] = (() => { try { return JSON.parse(sensor.site_managers || '[]') } catch { return [] } })()
    let managerText = '—'
    if (managerUsernames.length > 0) {
      try {
        const users = await userApi.getList()
        managerText = managerUsernames.map((u: string) => { const f = users.find((x: any) => x.username === u); return f ? `${f.username} (${f.role})` : u }).join(', ')
      } catch { managerText = managerUsernames.join(', ') }
    }
    const excelSourceRows = dateFrom === dateTo ? measurements : dailyReadings
    const sortedRows = [...excelSourceRows].sort((a: any, b: any) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
    const initDate = globalInitReading ? new Date(globalInitReading.timestamp) : (sortedRows.length > 0 ? new Date(sortedRows[0].timestamp) : new Date())
    const ExcelJSModule = await import('exceljs') as any
    const ExcelJS = ExcelJSModule.default ?? ExcelJSModule
    const wb2 = new ExcelJS.Workbook(); const ws2 = wb2.addWorksheet(sensor.manageNo || sensor.name || '측정데이터')
    const DARK = 'FFD9D9D9', MID = 'FFD9D9D9', WHITE = 'FFFFFFFF', BLACK = 'FF000000', RED = 'FFC00000', BLUE = 'FF2F5496', YELL = 'FFFFF2CC', ALT = 'FFEEF4FB'
    const thin = { style: 'thin' as const, color: { argb: 'FF000000' } }, med = { style: 'medium' as const, color: { argb: DARK } }
    const TB = { top: thin, left: thin, bottom: thin, right: thin }, MB = { top: med, left: med, bottom: med, right: med }
    const fill = (argb: string) => ({ type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb } })
    const font = (bold = false, sz = 9, argb = BLACK) => ({ name: '맑은 고딕', size: sz, bold, color: { argb } })
    const aln  = (h: 'center'|'left'|'right' = 'center', v: 'middle'|'top'|'bottom' = 'middle', wrap = false) => ({ horizontal: h, vertical: v, wrapText: wrap })
    ws2.columns = [{ width: 14 }, { width: 7 }, { width: 13 }, { width: 12 }, { width: 12 }, { width: 14 }]
    const setH = (r: number, h: number) => { ws2.getRow(r).height = h }
    setH(1,28); setH(2,4); setH(3,18); setH(4,18); setH(5,18)
    const CR_START = 6, CR_END = 15
    for (let r = CR_START; r <= CR_END; r++) setH(r, 18)
    setH(CR_END+1,14); setH(CR_END+2,4); setH(CR_END+3,18); setH(CR_END+4,18); setH(CR_END+5,18); setH(CR_END+6,3)
    const DS = CR_END + 7
    sortedRows.forEach((_: any, i: number) => setH(DS+i, 17))
    ws2.mergeCells('A1:F1')
    const t = ws2.getCell('A1'); t.value = 'Water Level Meter Report'; t.font = font(true,15,BLACK); t.fill = fill(WHITE); t.alignment = aln(); t.border = MB
    const infoRows = [
      ['현   장   명', sensor.siteName||'—', '계측기 No.', sensor.manageNo||'—'],
      ['설 치 현 황', sensor.installDate?`설치일자 (${sensor.installDate.slice(0,10)})`:'—', '초기측정일', initDate.toLocaleDateString('ko-KR',{year:'numeric',month:'2-digit',day:'2-digit'})],
      ['관   리   자', managerText, '설치위치', sensor.location?.description||'—'],
    ]
    infoRows.forEach(([l1,v1,l2,v2]: any, i: number) => {
      const r = 3+i; ws2.mergeCells(r,2,r,3); ws2.mergeCells(r,5,r,6)
      const setC = (col: number, val: string, fnt: any, fil: any, al: any) => { const c = ws2.getCell(r,col); c.value=val; c.font=fnt; c.fill=fil; c.alignment=al; c.border=TB }
      setC(1,l1,font(true,9,BLACK),fill(DARK),aln()); setC(2,v1,font(false,8,BLACK),fill(WHITE),aln('left'))
      setC(4,l2,font(true,9,BLACK),fill(DARK),aln()); setC(5,v2,font(false,8,BLACK),fill(WHITE),aln('left'))
    })
    if (chartBase64) {
      const imgId = wb2.addImage({ base64: (chartBase64 as string).split(',')[1], extension: 'png' })
      ws2.addImage(imgId, { tl: { col:0, row:CR_START-1 } as any, br: { col:6, row:CR_END } as any, editAs:'oneCell' })
    }
    const legendRow = CR_END+1
    ws2.mergeCells(legendRow,1,legendRow,2); const lgLine = ws2.getCell(legendRow,1)
    lgLine.value = '── '+(sensor.manageNo||sensor.name); lgLine.font = { name:'맑은 고딕', size:9, color:{argb:'FF2F5496'} }; lgLine.alignment = { horizontal:'center', vertical:'middle' }
    ws2.mergeCells(legendRow,3,legendRow,4); const lgLower = ws2.getCell(legendRow,3)
    lgLower.value = '- - - 1차 하한기준'; lgLower.font = { name:'맑은 고딕', size:9, color:{argb:'FFC00000'} }; lgLower.alignment = { horizontal:'center', vertical:'middle' }
    ws2.mergeCells(legendRow,5,legendRow,6); const lgUpper = ws2.getCell(legendRow,5)
    lgUpper.value = '- - - 1차 상한기준'; lgUpper.font = { name:'맑은 고딕', size:9, color:{argb:'FFE07000'} }; lgUpper.alignment = { horizontal:'center', vertical:'middle' }
    const H1=CR_END+3, H2=CR_END+4, H3=CR_END+5
    const mhdr = (r1:number,c1:number,r2:number,c2:number,val:string,sz=9,bg=DARK) => { ws2.mergeCells(r1,c1,r2,c2); const c=ws2.getCell(r1,c1); c.value=val; c.font=font(true,sz,BLACK); c.fill=fill(bg); c.alignment=aln('center','middle',true); c.border=TB }
    mhdr(H1,1,H3,1,'측  정  일'); mhdr(H1,2,H3,2,'경과일'); mhdr(H1,3,H1,5,sensor.manageNo||sensor.name); mhdr(H1,6,H3,6,'비  고')
    mhdr(H2,3,H2,3,`지하수위 G.L(${sensor.unit})`,8,MID); mhdr(H2,4,H2,5,'변화량(m)',8,MID)
    const setHdr = (r:number,c:number,val:string,sz=7,bg=MID) => { const cell=ws2.getCell(r,c); cell.value=val; cell.font=font(true,sz,BLACK); cell.fill=fill(bg); cell.alignment=aln('center','middle',true); cell.border=TB }
    ws2.getCell(H3,3).fill=fill(MID); ws2.getCell(H3,3).border=TB; setHdr(H3,4,'전측정치대비'); setHdr(H3,5,'초기치대비')
    sortedRows.forEach((row:any,i:number) => {
      const r=DS+i, isFirst=i===0, rf=isFirst?YELL:(i%2===0?ALT:WHITE), base={fill:fill(rf),border:TB,alignment:aln()}
      const setD = (c:number,val:any,fnt:any,numFmt?:string) => { const cell=ws2.getCell(r,c); cell.value=val; cell.font=fnt; Object.assign(cell,base); if(numFmt) cell.numFmt=numFmt }
      const curDate=new Date(row.timestamp), curMid=new Date(curDate.getFullYear(),curDate.getMonth(),curDate.getDate()), initMid=new Date(initDate.getFullYear(),initDate.getMonth(),initDate.getDate())
      const elapsed=Math.round((curMid.getTime()-initMid.getTime())/86400000)
      const curVal=parseFloat(parseFloat(String(row.value)).toFixed(2)), prevVal=i>0?parseFloat(parseFloat(String(sortedRows[i-1].value)).toFixed(2)):curVal
      const prevDiff=parseFloat((curVal-prevVal).toFixed(2)), initDiff=parseFloat((curVal-parseFloat(initValue.toFixed(2))).toFixed(2))
      setD(1,curDate.toLocaleDateString('ko-KR',{year:'numeric',month:'2-digit',day:'2-digit'}),font(false,9,BLACK))
      setD(2,elapsed,font(false,9,BLACK)); setD(3,curVal,font(false,9,BLACK),'0.00')
      if(isFirst){setD(4,0,font(false,9,BLACK),'0.00');setD(5,0,font(false,9,BLACK),'0.00')}
      else{setD(4,prevDiff,font(false,9,prevDiff<0?RED:BLUE),'+0.00;-0.00;0.00');setD(5,initDiff,font(false,9,initDiff<0?RED:BLUE),'+0.00;-0.00;0.00')}
      const dateKey=curDate.toLocaleDateString('ko-KR',{year:'numeric',month:'2-digit',day:'2-digit'})
      const note=remarks[dateKey]||(isFirst?'초기치':''); const cn=ws2.getCell(r,6); cn.value=note; cn.font=font(isFirst,9,isFirst?RED:BLACK); cn.fill=fill(isFirst?YELL:rf); cn.border=TB; cn.alignment=aln()
    })
    ws2.pageSetup.paperSize=9; ws2.pageSetup.orientation='portrait'; ws2.pageSetup.fitToPage=true; ws2.pageSetup.fitToWidth=1; ws2.pageSetup.fitToHeight=0
    const buf=await wb2.xlsx.writeBuffer(), blob=new Blob([buf],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}), url=URL.createObjectURL(blob), a=document.createElement('a')
    a.href=url; a.download=`${sensor.manageNo||sensor.name}_${dateFrom}_${dateTo}.xlsx`; a.click(); URL.revokeObjectURL(url)
  }

  // ─── PDF ──────────────────────────────────────────────────────────────────
  const handlePdfDownload = async () => {
    const doc = new jsPDF('p','mm','a4'), pageWidth = doc.internal.pageSize.getWidth()
    const fontRes=await fetch('/NanumGothic.ttf'), fontBuffer=await fontRes.arrayBuffer(), uint8=new Uint8Array(fontBuffer)
    let bin=''; for(let i=0;i<uint8.byteLength;i++) bin+=String.fromCharCode(uint8[i])
    const fb=btoa(bin); doc.addFileToVFS('NanumGothic.ttf',fb); doc.addFont('NanumGothic.ttf','NanumGothic','normal'); doc.addFont('NanumGothic.ttf','NanumGothic','bold'); doc.setFont('NanumGothic','normal')
    const managers=(() => { try{return JSON.parse((sensor as any).site_managers||'[]')}catch{return []} })()
    let mt='—'; if(managers.length>0){try{const u=await userApi.getList();mt=managers.map((m:string)=>{const f=u.find((x:any)=>x.username===m);return f?`${f.username} (${f.role})`:m}).join(', ')}catch{mt=managers.join(', ')}}
    const pdfSourceRows=dateFrom===dateTo?measurements:dailyReadings
    const pdfSortedRows=[...pdfSourceRows].sort((a:any,b:any)=>new Date(a.timestamp).getTime()-new Date(b.timestamp).getTime())
    const pdfInitDate=globalInitReading?new Date(globalInitReading.timestamp):(pdfSortedRows.length>0?new Date(pdfSortedRows[0].timestamp):new Date())
    doc.setFontSize(16); doc.text('Water Level Meter Report',pageWidth/2,20,{align:'center'})
    autoTable(doc,{startY:28,head:[],body:[['현장명',sensor.siteName||'—','계측기 No.',sensor.manageNo||'—'],['설치현황',sensor.installDate?`설치일자 (${sensor.installDate.slice(0,10)})`:'—','초기측정일',pdfInitDate.toLocaleDateString('ko-KR',{year:'numeric',month:'2-digit',day:'2-digit'})],['관리자',mt,'설치위치',sensor.location?.description||'—']],theme:'grid',styles:{fontSize:9,cellPadding:2,font:'NanumGothic'},columnStyles:{0:{fillColor:[240,240,240],cellWidth:25},1:{cellWidth:65},2:{fillColor:[240,240,240],cellWidth:25},3:{cellWidth:65}}})
    const cy=(doc as any).lastAutoTable.finalY+5
    autoTable(doc,{startY:cy+55,head:[['측정일','경과일',`지하수위 G.L(${sensor.unit})`,'전측정대비','초기치대비','비고']],body:pdfSortedRows.map((r:any,i:number)=>{const cv=parseFloat(parseFloat(String(r.value)).toFixed(2)),pv=i>0?parseFloat(parseFloat(String(pdfSortedRows[i-1].value)).toFixed(2)):cv,pd=parseFloat((cv-pv).toFixed(2)),id_=parseFloat((cv-initValue).toFixed(2)),rd=new Date(r.timestamp),cm=new Date(rd.getFullYear(),rd.getMonth(),rd.getDate()),im=new Date(pdfInitDate.getFullYear(),pdfInitDate.getMonth(),pdfInitDate.getDate()),el=Math.round((cm.getTime()-im.getTime())/86400000),dk=rd.toLocaleDateString('ko-KR',{year:'numeric',month:'2-digit',day:'2-digit'});return[dk,el,cv.toFixed(2),i===0?'0.00':(pd>0?`+${pd}`:String(pd)),i===0?'0.00':(id_>0?`+${id_}`:String(id_)),i===0?'초기치':(remarks[dk]||'')]}),theme:'grid',headStyles:{fillColor:[60,80,120],textColor:255,fontSize:8,font:'NanumGothic',fontStyle:'normal'},styles:{fontSize:8,cellPadding:2,font:'NanumGothic'}})
    doc.save(`${sensor.manageNo||sensor.name}_${dateFrom}_${dateTo}.pdf`)
  }

  // ─── 테이블 ───────────────────────────────────────────────────────────────
  const tableData = useMemo(() => {
    const source = chartMode === 'hourly' ? measurementsWithGaps : dailyReadings
    return [...source].sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
  }, [chartMode, measurementsWithGaps, dailyReadings])

  const totalPages = Math.ceil(tableData.length / TABLE_PAGE_SIZE)
  const pagedTable = tableData.slice((tablePage-1)*TABLE_PAGE_SIZE, tablePage*TABLE_PAGE_SIZE)

  const formulaDisplay = useMemo(() => {
    if (sensorCode !== '80053') return sensor?.formula || '—'
    return `Linear:G*(I-X)*0.703 / Poly:(A*X²+B*X+C)*0.703`
  }, [sensorCode, sensor])

  if (loading) return <div className="flex h-full items-center justify-center bg-surface-page"><p className="font-mono text-sm text-ink-muted">센서 정보 불러오는 중...</p></div>
  if (!sensor) return <div className="flex h-full items-center justify-center bg-surface-page"><p className="font-mono text-sm text-ink-muted">센서를 찾을 수 없습니다.</p></div>

  const hasFloorPlan = !!(sensor.floor_plan_url || sensor.site_floor_plan_url)
  const floorPlanUrl = hasFloorPlan ? `${API_BASE}/api/sensors/${sensor.id}/floor-plan-image?t=${floorPlanTimestamp}` : null
  const statusNormal = icons.filter(i=>iconStatuses[i.key]==='normal').length
  const statusWarning = icons.filter(i=>iconStatuses[i.key]==='warning').length
  const statusDanger  = icons.filter(i=>iconStatuses[i.key]==='danger').length
  const currentIconKey = sensorCode === '80053' ? `${sensor.id}:${depthLabel}` : sensor.id

  return (
    <div className="flex h-full flex-col overflow-hidden bg-surface-page">
      {/* 헤더 */}
      <div className="shrink-0 border-b border-line bg-surface-card/90 px-4 py-2.5 backdrop-blur-md">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Link href="/sensors" className="text-sm text-ink-muted hover:text-ink">← 센서 목록</Link>
            <span className="text-line-strong">/</span>
            <h1 className="font-mono text-[15px] font-semibold text-ink">{sensor.manageNo || sensor.id}</h1>
            <span className="font-mono text-xs text-ink-muted">{sensor.nameAbbr}</span>
            <StatusBadge status={sensor.status} />
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setPrintOpen(true)} className="flex items-center gap-1 rounded-md border border-line bg-surface-card px-3 py-1.5 font-mono text-xs text-ink-muted hover:border-brand/40 hover:text-brand">📊 Excel / PDF</button>
            <button onClick={() => setQrOpen(true)} className="flex items-center gap-1 rounded-md border border-line bg-surface-card px-3 py-1.5 font-mono text-xs text-ink-muted hover:border-brand/40 hover:text-brand">QR</button>
          </div>
        </div>
      </div>

      {/* 3단 레이아웃 */}
      <div className="flex flex-1 min-h-0">

        {/* 좌: 센서 정보 */}
        <div className="hidden lg:flex w-52 shrink-0 flex-col border-r border-line bg-surface-card overflow-y-auto">
          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-semibold text-ink">센서 정보</h2>
              <StatusBadge status={sensor.status} />
            </div>
            <dl className="space-y-2">
              {[
                { l: '관리번호', v: sensor.manageNo || '—' },
                { l: '센서명',   v: sensor.name },
                { l: '현장',     v: sensor.siteName || '—' },
                { l: '설치 위치', v: sensor.location.description || '—' },
                { l: '설치일',   v: sensor.installDate ? new Date(sensor.installDate).toLocaleDateString('ko-KR') : '—' },
                { l: '측정단위', v: sensor.unit || '—' },
                { l: '측정주기', v: '01:00' },
              ].map(({ l, v }) => (
                <div key={l} className="flex gap-1">
                  <dt className="w-16 shrink-0 font-mono text-[10px] text-ink-muted">{l}</dt>
                  <dd className="flex-1 font-mono text-[10px] text-ink break-all">{v}</dd>
                </div>
              ))}
              <div className="flex gap-1">
                <dt className="w-16 shrink-0 font-mono text-[10px] text-ink-muted">계산식</dt>
                <dd className="flex-1 font-mono text-[10px] text-ink break-all">{formulaDisplay}</dd>
              </div>
              {level1Upper !== null && (
                <div className="flex gap-1">
                  <dt className="w-16 shrink-0 font-mono text-[10px] text-ink-muted">1차 상한</dt>
                  <dd className="flex-1 font-mono text-[10px] text-ink">{(level1Upper as number).toFixed(2)} m{sensorCode==='80053'&&<span className="text-ink-muted"> (+4m)</span>}</dd>
                </div>
              )}
              {level1Lower !== null && (
                <div className="flex gap-1">
                  <dt className="w-16 shrink-0 font-mono text-[10px] text-ink-muted">1차 하한</dt>
                  <dd className="flex-1 font-mono text-[10px] text-ink">{(level1Lower as number).toFixed(2)} m{sensorCode==='80053'&&<span className="text-ink-muted"> (-4m)</span>}</dd>
                </div>
              )}
              <div className="flex gap-1">
                <dt className="w-16 shrink-0 font-mono text-[10px] text-ink-muted">마지막 수신</dt>
                <dd className="flex-1 font-mono text-[10px] text-ink">{sensor.lastUpdated?new Date(sensor.lastUpdated).toLocaleString('ko-KR',{month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'}):'—'}</dd>
              </div>
            </dl>

            {sensorCode === '80053' && (
              <div className="mt-3 rounded-lg border border-line bg-surface-subtle p-2">
                <p className="mb-1.5 font-mono text-[9px] font-semibold text-ink-muted uppercase tracking-wider">계산식 상수값</p>
                <div className="grid grid-cols-2 gap-x-2 gap-y-1">
                  {[{k:'A',v:sensor.formulaParams?.coeffA},{k:'B',v:sensor.formulaParams?.coeffB},{k:'C',v:sensor.formulaParams?.coeffC},{k:'G(Linear)',v:sensor.formulaParams?.coeffG},{k:'I (초기값)',v:sensor.formulaParams?.initVal}].filter(x=>x.v).map(({k,v})=>(
                    <div key={k} className="flex gap-1">
                      <span className="font-mono text-[10px] text-ink-muted w-14 shrink-0">{k}</span>
                      <span className="font-mono text-[10px] text-ink">{v}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 중: 평면도 */}
        <div className="flex flex-1 flex-col border-r border-line min-w-0">
          <div className="shrink-0 flex items-center justify-between border-b border-line px-3 py-2">
            <div className="flex items-center gap-2">
              <h2 className="text-xs font-semibold text-ink">계측계획 평면도</h2>
              <span className="font-mono text-[10px] text-ink-muted hidden sm:inline">(센서를 드래그하여 이동)</span>
            </div>
            {!isMultiMonitor && (
              <div className="flex items-center gap-1">
                <button onClick={() => setShowAddIcon(true)} className="flex items-center gap-1 rounded-md border border-brand/30 bg-brand/10 px-2.5 py-1 font-mono text-[10px] text-brand hover:bg-brand/20">+ 추가</button>
                <label className="cursor-pointer rounded-md border border-line bg-surface-card px-2 py-1 font-mono text-[10px] text-ink-muted hover:border-brand/40 hover:text-brand">
                  📎 {hasFloorPlan ? '변경' : '업로드'}
                  <input type="file" accept="image/jpeg,image/png,image/gif,image/webp,application/pdf" className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0]; if (!file) return
                      const formData = new FormData(); formData.append('file', file)
                      try {
                        const res = await fetch(`${API_BASE}/api/sensors/${sensor.id}/floor-plan`, { method:'POST', headers:{Authorization:`Bearer ${localStorage.getItem('gm_token')}`}, body:formData })
                        const data = await res.json()
                        if (data.success) { setSensor((prev:any)=>({...prev,floor_plan_url:'exists',site_floor_plan_url:'exists'})); setFloorPlanTimestamp(Date.now()) }
                        else alert('업로드 실패: '+(data.error||'알 수 없는 오류'))
                      } catch { alert('업로드 중 오류가 발생했습니다.') }
                    }} />
                </label>
              </div>
            )}
          </div>

          <div className="flex-1 relative bg-surface-subtle overflow-hidden" ref={floorPlanRef}>
            {floorPlanUrl ? (
              <>
                <img src={floorPlanUrl} alt="계측계획 평면도" className="w-full h-full object-contain select-none" draggable={false} />
                {icons.map(icon => (
                  <SensorIcon key={icon.key} icon={icon} isSelected={icon.key === currentIconKey}
                    status={iconStatuses[icon.key] || 'offline'}
                    onMouseDown={e => handleIconMouseDown(icon.key, e)}
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
                <p className="font-mono text-[10px] text-ink-muted">PNG, JPG, PDF 업로드 가능</p>
              </div>
            )}
          </div>
        </div>

        {/* 우: 시간별 트렌드 */}
        <div className="hidden xl:flex w-80 shrink-0 flex-col overflow-y-auto bg-surface-card">
          <div className="shrink-0 flex items-center justify-between border-b border-line px-3 py-2">
            <h2 className="text-xs font-semibold text-ink">시간별 트렌드</h2>
            <span className="font-mono text-[11px] font-medium text-brand">{sensor.manageNo}</span>
          </div>

          <div className="p-3 space-y-3">
            {/* 조회 기간 */}
            <div className="rounded-lg border border-line bg-surface-subtle p-2.5">
              <p className="mb-2 font-mono text-[10px] font-semibold text-ink-muted">□ 조회 기간 설정</p>
              <div className="flex gap-1 mb-2">
                {[['오늘',1],['7일',7],['30일',30]].map(([label,days])=>(
                  <button key={String(label)} onClick={()=>setPreset(Number(days))} className="flex-1 rounded-md border border-line py-1 font-mono text-[11px] text-ink-muted hover:bg-surface-card hover:text-ink">{label}</button>
                ))}
              </div>
              <div className="flex items-center gap-1">
                <input type="date" value={dateFrom} max={today} onChange={e=>{setDateFrom(e.target.value);setTablePage(1)}} className="flex-1 rounded-md border border-line bg-surface-card px-2 py-1 font-mono text-[11px] text-ink focus:outline-none" />
                <span className="font-mono text-[10px] text-ink-muted">~</span>
                <input type="date" value={dateTo} min={dateFrom} max={today} onChange={e=>{setDateTo(e.target.value);setTablePage(1)}} className="flex-1 rounded-md border border-line bg-surface-card px-2 py-1 font-mono text-[11px] text-ink focus:outline-none" />
              </div>
            </div>

            {/* 조회 단위 + 계산식 */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <p className="mb-1 font-mono text-[10px] text-ink-muted">△ 조회 단위</p>
                <div className="flex gap-1">
                  {['시간별','일별'].map(m=>(
                    <button key={m} onClick={()=>setChartMode(m==='시간별'?'hourly':'daily')} className={['flex-1 rounded-md border py-1 font-mono text-[10px]',chartMode===(m==='시간별'?'hourly':'daily')?'border-brand/30 bg-brand/10 text-brand':'border-line text-ink-muted hover:bg-surface-subtle'].join(' ')}>{m}</button>
                  ))}
                </div>
              </div>
              {sensorCode==='80053'&&(
                <div>
                  <p className="mb-1 font-mono text-[10px] text-ink-muted">∧ 계산식 적용</p>
                  <div className="flex gap-1">
                    {[['Linear','linear'],['Polynomial','poly']].map(([l,v])=>(
                      <button key={v} onClick={()=>setCalcMode(v as 'linear'|'poly')} className={['flex-1 rounded-md border py-1 font-mono text-[10px]',calcMode===v?'border-brand/30 bg-brand/10 text-brand':'border-line text-ink-muted hover:bg-surface-subtle'].join(' ')}>{l}</button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* depth 버튼 */}
            {sensorCode==='80053'&&(
              <div className="flex gap-1">
                {(['1','2','3'] as const).map(d=>(
                  <button key={d} onClick={()=>setDepthLabel(d)} className={['flex-1 rounded-md border py-1.5 font-mono text-[10px]',depthLabel===d?'border-brand/30 bg-brand/10 text-brand font-medium':'border-line text-ink-muted hover:bg-surface-subtle'].join(' ')}>{d}번 수위계</button>
                ))}
              </div>
            )}

            {/* 측정값 카드 */}
            <div className="grid grid-cols-2 gap-1.5">
              {[
                {label:'기간 내 최신값', value:latestMeasurement?.value},
                {label:'초기측정값', value:initValue},
                {label:'최솟값', value:measurements.length>0?Math.min(...measurements.filter(m=>m.value!==null).map(m=>m.value)):null},
                {label:'최댓값', value:measurements.length>0?Math.max(...measurements.filter(m=>m.value!==null).map(m=>m.value)):null},
              ].map(({label,value})=>(
                <div key={label} className="rounded-lg border border-line bg-surface-subtle p-2 text-center">
                  <p className="font-mono text-[9px] text-ink-muted">{label}</p>
                  <p className={`font-mono text-sm font-semibold mt-0.5 ${sensor.status==='danger'?'text-sensor-danger':sensor.status==='warning'?'text-sensor-warning':'text-sensor-normal'}`}>
                    {value!==null&&value!==undefined?Number(value).toFixed(2):'—'}<span className="text-[10px] text-ink-muted ml-0.5">{sensor.unit}</span>
                  </p>
                </div>
              ))}
            </div>

            {/* 게이지 */}
            {(level1Lower!==null||level1Upper!==null)&&latestMeasurement&&(
              <div className="rounded-lg border border-line bg-surface-subtle p-2">
                <div className="flex justify-between font-mono text-[10px] text-ink-muted mb-1"><span>정상 구간</span><span>경고</span></div>
                <div className="h-2 rounded-full bg-surface-muted overflow-hidden">
                  <div className="h-full rounded-full bg-sensor-normal transition-all" style={{width:level1Upper!==null&&level1Lower!==null?`${Math.max(0,Math.min(100,((latestMeasurement.value-(level1Lower as number))/((level1Upper as number)-(level1Lower as number)))*100))}%`:'50%'}} />
                </div>
              </div>
            )}

            {/* 차트 */}
            <div ref={chartRef} className="rounded-lg border border-line bg-surface-card overflow-hidden" style={{height:160}}>
              <SensorTrendChart sensor={sensor} readings={chartMode==='hourly'?measurements:dailyReadings} initValue={sensorCode==='80053'?initValue:undefined} />
            </div>

            {/* 보정값 */}
            {sensorCode==='80053'&&(
              <div className="rounded-lg border border-line bg-surface-subtle p-2.5">
                <p className="mb-2 font-mono text-[10px] font-semibold text-ink-muted">📊 초기값(기준점) 보정</p>
                <div className="flex items-center gap-1.5">
                  <input type="number" step="0.01" min="-100" max="100" placeholder="0.00"
                    value={correctionInput[depthLabel]??(correctionParams[depthLabel]!==undefined&&correctionParams[depthLabel]!==0?String(correctionParams[depthLabel]):'')}
                    onChange={e=>setCorrectionInput(prev=>({...prev,[depthLabel]:e.target.value}))}
                    onWheel={e=>e.currentTarget.blur()}
                    className="flex-1 rounded-md border border-line bg-surface-card px-2 py-1.5 font-mono text-sm text-ink text-right focus:outline-none focus:ring-1 focus:ring-brand/40" />
                  <span className="font-mono text-xs text-ink-muted shrink-0">{sensor.unit}</span>
                  <button disabled={correctionSaving}
                    onClick={async()=>{
                      const s=correctionInput[depthLabel]??'', v=s===''?0:parseFloat(s)
                      if(isNaN(v)||v<-100||v>100){alert('보정값은 -100 ~ 100 사이의 숫자만 입력 가능합니다.');return}
                      const next={...correctionParams,[depthLabel]:v}; setCorrectionSaving(true)
                      try{await sensorApi.updateInfo(Number(id),{correction_params:next});setCorrectionParams(next);setCorrectionInput(prev=>({...prev,[depthLabel]:String(v)}))}catch{}finally{setCorrectionSaving(false)}
                    }}
                    className="rounded-md bg-sensor-normal px-2.5 py-1.5 font-mono text-[10px] text-white disabled:opacity-50 whitespace-nowrap">
                    {correctionSaving?'저장 중…':'✓ 적용하기'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 하단: 측정 데이터 로그 */}
      <div className="shrink-0 border-t border-line" style={{maxHeight:'35vh',overflowY:'auto'}}>
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-line bg-surface-card px-4 py-2">
          <h2 className="text-xs font-semibold text-ink">
            측정 데이터 로그
            <span className="ml-2 font-mono text-[10px] text-ink-muted">총 {tableData.length}건</span>
            {sensorCode==='80053'&&<span className="ml-1 font-mono text-[10px] text-brand">({depthLabel}번 수위계)</span>}
          </h2>
          {totalPages>1&&(
            <div className="flex items-center gap-1">
              <button disabled={tablePage===1} onClick={()=>setTablePage(p=>p-1)} className="rounded px-2 py-0.5 font-mono text-[11px] text-ink-muted border border-line disabled:opacity-30 hover:bg-surface-subtle">←</button>
              <span className="font-mono text-[11px] text-ink-muted">{tablePage}/{totalPages}</span>
              <button disabled={tablePage===totalPages} onClick={()=>setTablePage(p=>p+1)} className="rounded px-2 py-0.5 font-mono text-[11px] text-ink-muted border border-line disabled:opacity-30 hover:bg-surface-subtle">→</button>
            </div>
          )}
        </div>
        <table className="w-full text-xs">
          <thead className="sticky top-[37px] bg-surface-subtle">
            <tr>{['날짜','시각',`측정값(${sensor.unit})`,'계산상태','상태'].map(h=>(
              <th key={h} className="border-b border-line px-3 py-1.5 text-left font-mono text-[10px] font-semibold text-ink-muted">{h}</th>
            ))}</tr>
          </thead>
          <tbody>
            {pagedTable.length===0?(
              <tr><td colSpan={5} className="px-4 py-8 text-center font-mono text-xs text-ink-muted">데이터가 없습니다.</td></tr>
            ):pagedTable.map((row:any,i)=>{
              const isGap=row.status==='gap'||row.value===null; const d=new Date(row.timestamp)
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

      {/* 모달 */}
      {printOpen&&(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/30 backdrop-blur-sm p-4" onClick={()=>setPrintOpen(false)}>
          <div className="geo-card w-full max-w-sm p-6" onClick={e=>e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4"><h2 className="text-sm font-semibold text-ink">출력 설정</h2><button onClick={()=>setPrintOpen(false)} className="text-ink-muted hover:text-ink">✕</button></div>
            <div className="rounded-xl border border-line bg-surface-subtle p-3 text-xs text-ink-muted space-y-1 mb-4">
              <p className="font-semibold text-ink">{sensor.siteName||'현장명 없음'}</p>
              <p>{sensor.manageNo} · {sensor.name}</p>
              <p>{dateFrom} ~ {dateTo}</p>
            </div>
            <div className="flex gap-2">
              <button onClick={()=>setPrintOpen(false)} className="flex-1 rounded-lg border border-line px-4 py-2 text-sm font-medium text-ink-sub hover:border-line-strong">취소</button>
              <button onClick={()=>{setPrintOpen(false);handleExcelDownload()}} className="flex-1 rounded-lg bg-sensor-normal px-4 py-2 text-sm font-medium text-white hover:opacity-90">📊 Excel</button>
              <button onClick={()=>{setPrintOpen(false);handlePdfDownload()}} className="flex-1 rounded-lg bg-sensor-warning px-4 py-2 text-sm font-medium text-white hover:opacity-90">📄 PDF</button>
            </div>
          </div>
        </div>
      )}
      {qrOpen&&<QRModal sensor={sensor} onClose={()=>setQrOpen(false)} />}

      {/* 아이콘 추가 모달 */}
      {showAddIcon&&(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/30 backdrop-blur-sm p-4" onClick={()=>setShowAddIcon(false)}>
          <div className="geo-card w-full max-w-sm p-6" onClick={e=>e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4"><h2 className="text-sm font-semibold text-ink">센서 아이콘 추가</h2><button onClick={()=>setShowAddIcon(false)} className="text-ink-muted hover:text-ink">✕</button></div>
            <div className="space-y-3">
              <div>
                <label className="mb-1.5 block font-mono text-[10px] font-semibold uppercase tracking-wider text-ink-muted">센서 선택</label>
                <select value={addIconSensor} onChange={e=>setAddIconSensor(e.target.value)} className="w-full rounded-lg border border-line bg-surface-subtle px-3 py-2 text-sm text-ink outline-none focus:border-brand/50">
                  <option value="">센서를 선택하세요</option>
                  {siteSensors.map((s:any)=>(<option key={s.id} value={String(s.id)}>{s.manage_no||s.name} — {s.name}</option>))}
                </select>
              </div>
              {addIconSensor&&allSensors.find((s:any)=>String(s.id)===addIconSensor)?.sensor_code==='80053'&&(
                <div>
                  <label className="mb-1.5 block font-mono text-[10px] font-semibold uppercase tracking-wider text-ink-muted">Depth 선택</label>
                  <div className="flex gap-2">
                    {(['1','2','3'] as const).map(d=>(
                      <button key={d} onClick={()=>setAddIconDepth(d)} className={['flex-1 rounded-md border py-1.5 font-mono text-[11px]',addIconDepth===d?'border-brand/30 bg-brand/10 text-brand':'border-line text-ink-muted hover:bg-surface-subtle'].join(' ')}>{d}번</button>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="flex gap-2 mt-5">
              <button onClick={()=>setShowAddIcon(false)} className="flex-1 rounded-lg border border-line px-4 py-2 text-sm font-medium text-ink-sub">취소</button>
              <button onClick={handleAddIcon} disabled={!addIconSensor} className="flex-1 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white disabled:opacity-50">추가</button>
            </div>
          </div>
        </div>
      )}

      <div ref={printRef} style={{display:'none'}} />
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.3}}`}</style>
    </div>
  )
}
