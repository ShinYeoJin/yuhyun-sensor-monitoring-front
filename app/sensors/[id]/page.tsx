'use client'

import { useState, useMemo, useRef, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { formatTimestamp, getRelativeTime, getThresholds } from '@/lib/mock-data'
import { sensorApi, userApi } from '@/lib/api'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { SensorTrendChart } from '@/components/charts/SensorTrendChart'
import { QRModal } from '@/components/ui/QRModal'
import Link from 'next/link'
import type { SensorReading, UnifiedSensor } from '@/types'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import html2canvas from 'html2canvas'
import { useAuth } from '@/lib/auth-context'

function getReadingsByRange(
  sensor: UnifiedSensor,
  dateFrom: string,
  dateTo: string
): SensorReading[] {
  const { thresholdWarning, thresholdDanger } = sensor ? getThresholds(sensor) : { thresholdWarning: 0, thresholdDanger: 0 }
  const from = new Date(dateFrom + 'T00:00:00')
  const to   = new Date(dateTo   + 'T23:59:59')
  if (from > to) return []

  const INTERVAL_MIN = 15
  const dayDiff = Math.min(
    Math.round((to.getTime() - from.getTime()) / 86400000) + 1,
    30
  )
  const totalSlots = dayDiff * (24 * 60 / INTERVAL_MIN)

  const readings: SensorReading[] = []
  for (let slot = 0; slot < totalSlots; slot++) {
    const date = new Date(from)
    date.setMinutes(from.getMinutes() + slot * INTERVAL_MIN, 0, 0)
    if (date > to) break

    const progress = slot / (totalSlots - 1 || 1)
    const trend =
      sensor.status === 'danger'  ? progress * sensor.currentValue * 0.20 :
      sensor.status === 'warning' ? progress * sensor.currentValue * 0.09 : 0
    const noise = (Math.random() - 0.5) * sensor.currentValue * 0.05
    const value = Math.max(0, Math.round((sensor.currentValue * 0.83 + trend + noise) * 100) / 100)

    readings.push({
      timestamp: date.toISOString(), value, unit: sensor.unit,
      status: value >= thresholdDanger ? 'danger' : value >= thresholdWarning ? 'warning' : 'normal',
    })
  }
  return readings
}

function dateDiffDays(from: string, to: string): number {
  const a = new Date(from + 'T00:00:00')
  const b = new Date(to   + 'T00:00:00')
  return Math.round((b.getTime() - a.getTime()) / 86400000)
}

interface PrintConfig {
  title:       string
  range:       '현장총괄표' | '계측센서'
  dateFrom:    string
  dateTo:      string
  printedAt:   string
  outputScope: '모든 센서' | '지하수위계'
  interval:    string
  imgMargin:   string
  footer:      string
}

const INTERVAL_OPTIONS = [
  '모든데이터',
  '1시간 간격','2시간 간격','3시간 간격','4시간 간격',
  '5시간 간격','6시간 간격','12시간 간격','24시간 간격',
  '2일 간격','3일 간격','4일 간격','5일 간격','6일 간격','7일 간격',
]

function PrintModal({ sensor, config, onChange, onPrint, onExcel, onPdf, onClose }: {
  sensor: UnifiedSensor; config: PrintConfig
  onChange: (c: PrintConfig) => void; onPrint: () => void
  onExcel: () => void; onPdf: () => void; onClose: () => void
}) {
  const set = (key: keyof PrintConfig, val: string) => onChange({ ...config, [key]: val })
  const inputCls = 'w-full rounded-lg border border-line bg-surface-subtle px-3 py-2 text-sm text-ink outline-none transition-colors focus:border-brand/50 focus:ring-2 focus:ring-brand/10'
  const labelCls = 'mb-1.5 block font-mono text-[10px] font-semibold uppercase tracking-wider text-ink-muted'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/30 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="geo-card flex w-full max-w-xl animate-fade-in-up flex-col" style={{ maxHeight: '92vh' }}
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-line px-6 py-4">
          <h2 className="text-sm font-semibold text-ink">출력 설정</h2>
          <button onClick={onClose} className="rounded-md p-1 text-ink-muted transition-colors hover:bg-surface-subtle hover:text-ink">✕</button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          <div>
            <label className={labelCls}>총괄표 타이틀</label>
            <input type="text" value={config.title} onChange={e => set('title', e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>인쇄 범위</label>
            <div className="grid grid-cols-2 gap-2">
              {(['현장총괄표','계측센서'] as const).map(opt => (
                <button key={opt} type="button" onClick={() => set('range', opt)}
                  className={['rounded-lg border px-4 py-2.5 text-sm font-medium transition-all',
                    config.range === opt ? 'border-brand/40 bg-brand/10 text-brand' : 'border-line bg-surface-card text-ink-sub hover:border-line-strong hover:bg-surface-subtle'].join(' ')}>
                  {config.range === opt && <span className="mr-1.5">✓</span>}{opt}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className={labelCls}>기간</label>
            <div className="grid grid-cols-2 gap-3">
              <div><p className="mb-1 font-mono text-[10px] text-ink-muted">시작일</p>
                <input type="date" value={config.dateFrom} onChange={e => set('dateFrom', e.target.value)} className={inputCls} /></div>
              <div><p className="mb-1 font-mono text-[10px] text-ink-muted">종료일</p>
                <input type="date" value={config.dateTo} onChange={e => set('dateTo', e.target.value)} className={inputCls} /></div>
            </div>
          </div>
          <div>
            <label className={labelCls}>출력일시</label>
            <input type="datetime-local" value={config.printedAt} onChange={e => set('printedAt', e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>출력범위</label>
            <div className="grid grid-cols-2 gap-2">
              {(['모든 센서','지하수위계'] as const).map(opt => (
                <button key={opt} type="button" onClick={() => set('outputScope', opt)}
                  className={['rounded-lg border px-4 py-2 text-sm font-medium transition-all',
                    config.outputScope === opt ? 'border-brand/40 bg-brand/10 text-brand' : 'border-line bg-surface-card text-ink-sub hover:border-line-strong hover:bg-surface-subtle'].join(' ')}>
                  {config.outputScope === opt && <span className="mr-1.5">✓</span>}{opt}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className={labelCls}>출력대상</label>
            <select value={config.interval} onChange={e => set('interval', e.target.value)} className={inputCls}>
              {INTERVAL_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>이미지 여백</label>
              <input type="number" step="0.01" value={config.imgMargin} onChange={e => set('imgMargin', e.target.value)} placeholder="0.10" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>바닥글 회사명</label>
              <input type="text" value={config.footer} onChange={e => set('footer', e.target.value)} placeholder="회사명" className={inputCls} />
            </div>
          </div>
          <div className="rounded-xl border border-line bg-surface-subtle p-4">
            <p className="mb-3 font-mono text-[10px] font-semibold uppercase tracking-wider text-ink-muted">미리보기</p>
            <div className="rounded-lg border border-line bg-surface-card p-4 text-xs">
              <div className="border-b border-line pb-3 text-center">
                <p className="text-base font-bold text-ink">{config.title || '(타이틀 없음)'}</p>
                <p className="mt-0.5 font-mono text-[10px] text-ink-muted">
                  {config.range} · {config.dateFrom || '—'} ~ {config.dateTo || '—'}
                </p>
              </div>
              <table className="mt-2 w-full border-collapse text-[10px]">
                <tbody>
                  <tr>
                    <td className="border border-line bg-surface-subtle px-2 py-1 font-semibold text-ink-muted w-16">현장명</td>
                    <td className="border border-line px-2 py-1 text-ink">{sensor.siteName || '—'}</td>
                    <td className="border border-line bg-surface-subtle px-2 py-1 font-semibold text-ink-muted w-20">계측기 No.</td>
                    <td className="border border-line px-2 py-1 text-ink">{sensor.manageNo || '—'}</td>
                  </tr>
                  <tr>
                    <td className="border border-line bg-surface-subtle px-2 py-1 font-semibold text-ink-muted">설치현황</td>
                    <td className="border border-line px-2 py-1 text-ink">
                      {sensor.installDate ? `설치일자 (${sensor.installDate.slice(0, 10)})` : '—'}
                    </td>
                    <td className="border border-line bg-surface-subtle px-2 py-1 font-semibold text-ink-muted">초기측정일</td>
                    <td className="border border-line px-2 py-1 text-ink">{config.dateFrom || '—'}</td>
                  </tr>
                  <tr>
                    <td className="border border-line bg-surface-subtle px-2 py-1 font-semibold text-ink-muted">관리자</td>
                    <td className="border border-line px-2 py-1 text-ink">—</td>
                    <td className="border border-line bg-surface-subtle px-2 py-1 font-semibold text-ink-muted">설치위치</td>
                    <td className="border border-line px-2 py-1 text-ink">{sensor.location?.description || '—'}</td>
                  </tr>
                </tbody>
              </table>
              <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 font-mono text-[10px]">
                <span className="text-ink-muted">출력기간</span>
                <span className="text-ink">{config.dateFrom} ~ {config.dateTo}</span>
                <span className="text-ink-muted">출력일시</span>
                <span className="text-ink">{config.printedAt || '—'}</span>
              </div>
              <div className="mt-3 border-t border-line pt-2 text-center font-mono text-[10px] text-ink-muted">
                {config.footer || '회사명'}
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-2 border-t border-line px-6 py-4">
          <button onClick={onClose} className="flex-1 rounded-lg border border-line px-4 py-2 text-sm font-medium text-ink-sub transition-colors hover:border-line-strong hover:text-ink">취소</button>
          <button onClick={onExcel} className="flex-1 rounded-lg bg-sensor-normal px-4 py-2 text-sm font-medium text-white transition-colors hover:opacity-90">📊 엑셀</button>
          <button onClick={onPdf} className="flex-1 rounded-lg bg-sensor-warning px-4 py-2 text-sm font-medium text-white transition-colors hover:opacity-90">📄 PDF</button>
          <button onClick={onPrint} className="flex-1 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-hover">🖨 인쇄</button>
        </div>
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

  const today = new Date().toISOString().slice(0, 10)

  useEffect(() => {
    if (!id) return
    sensorApi.getById(Number(id)).then((data: any) => {
      setSensor({
        id: String(data.id),
        manageNo: data.manage_no || '',
        name: data.name,
        nameEn: '',
        nameAbbr: data.sensor_code,
        field: data.field || '공통',
        measureMethod: '해당없음',
        formula: data.formula || '(A*X+B)',
        group: '',
        unit: data.unit || '',
        unitName: '',
        description: data.location_desc || '',
        combination: '',
        decimalPoint: '2',
        pointerInfo: '',
        remark: '',
        threshold: {
          normalMax: data.threshold_normal_max ?? '',
          warningMax: data.threshold_warning_max ?? '',
          dangerMin: data.threshold_danger_min ?? '',
        },
        operation: { measureCycle: '01:00', actionAfterMeasure: '저장송신', actionBeforeMeasure: '자동' },
        formulaParams: data.formula_params ? {
          coeffA: data.formula_params.coeffA || '',
          coeffB: data.formula_params.coeffB || '',
          coeffC: data.formula_params.coeffC || '',
          coeffD: data.formula_params.coeffD || '',
          coeffE: data.formula_params.coeffE || '',
          initVal: data.formula_params.initVal || '',
          currentTemp: data.formula_params.currentTemp || '',
          tempCoeff: data.formula_params.tempCoeff || '',
          initTemp: data.formula_params.initTemp || '',
          extRef: data.formula_params.extRef || '',
        } : { coeffA: '', coeffB: '', coeffC: '', coeffD: '', coeffE: '', initVal: '', currentTemp: '', tempCoeff: '', initTemp: '', extRef: '' },
        criteria: {
          level1Upper: data.level1_upper ?? '',
          level1Lower: data.level1_lower ?? '',
          level2Upper: data.level2_upper ?? '',
          level2Lower: data.level2_lower ?? '',
          criteriaUnit: data.criteria_unit ?? '',
          criteriaUnitName: data.criteria_unit_name ?? '',
          noAlarm: false,
          noSms: false,
        },
        siteId: data.site_code || '',
        siteName: data.site_name || '',
        installDate: data.install_date || '',
        location: { lat: 0, lng: 0, description: data.location_desc || '' },
        status: data.status || 'offline',
        currentValue: data.current_value ? parseFloat(data.current_value) : 0,
        batteryLevel: 100,
        lastUpdated: data.last_measured || new Date().toISOString(),
        site_managers: data.site_managers || '[]',
        floor_plan_url: data.floor_plan_url || null,
        site_floor_plan_url: data.site_floor_plan_url || null,
        readings: [],
      })
    }).catch(() => setSensor(null))
    .finally(() => setLoading(false))
  }, [id])

  const [dateFrom, setDateFrom] = useState(today)
  const [dateTo,   setDateTo]   = useState(today)
  const [chartMode, setChartMode] = useState<'hourly' | 'daily'>('hourly')
  const [depthLabel, setDepthLabel] = useState<'1' | '2' | '3'>('1')
  const [calcMode, setCalcMode] = useState<'poly' | 'linear'>('linear')

  useEffect(() => {
    if (!id) return
    sensorApi.getMeasurements(Number(id), {
      from: dateFrom,
      to: dateTo,
      limit: 2000,
      depthLabel: sensor?.nameAbbr === '80053' ? depthLabel : undefined,
    }).then((data: any[]) => {
      const mapped = data.map((m: any) => ({
        timestamp: m.measured_at,
        value: calcMode === 'poly' ? parseFloat(m.value) : parseFloat(m.linear_value ?? m.value),
        unit: sensor?.unit || '',
        status: 'normal',
      }))
      setMeasurements(mapped.reverse())
    }).catch(() => {})
  }, [id, sensor?.unit, dateFrom, dateTo, depthLabel, calcMode])

  const [globalInitReading, setGlobalInitReading] = useState<any>(null)

  useEffect(() => {
    if (!id) return
    sensorApi.getMeasurements(Number(id), {
      limit: 2000,
      depthLabel: sensor?.nameAbbr === '80053' ? depthLabel : undefined,
    }).then((data: any[]) => {
      if (data.length > 0) {
        const oldest = [...data].sort((a: any, b: any) =>
          new Date(a.measured_at).getTime() - new Date(b.measured_at).getTime()
        )[0]
        setGlobalInitReading({
          value: oldest.value,
          linear_value: oldest.linear_value ?? oldest.value,
          timestamp: oldest.measured_at,
        })
      }
    }).catch(() => {})
  }, [id, depthLabel, sensor?.nameAbbr])

  const [qrOpen,    setQrOpen]    = useState(false)
  const [tablePage, setTablePage] = useState(1)
  const [remarks,   setRemarks]   = useState<Record<string, string>>({})
  const TABLE_PAGE_SIZE = 15
  const [printOpen, setPrintOpen] = useState(false)
  const printRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<HTMLDivElement>(null)

  const [printConfig, setPrintConfig] = useState<PrintConfig>({
    title: '계측 모니터링 현황 보고서', range: '계측센서',
    dateFrom: dateFrom, dateTo: dateTo,
    printedAt: new Date().toISOString().slice(0, 16),
    outputScope: '모든 센서', interval: '모든데이터',
    imgMargin: '0.10', footer: '',
  })

  const isValidRange = !!sensor && dateFrom <= dateTo && dateTo <= today
  const dayCount = isValidRange ? dateDiffDays(dateFrom, dateTo) + 1 : 0
  const isToday  = dateFrom === today && dateTo === today
  const readings = measurements

  const dailyReadings = useMemo(() => {
    const map = new Map<string, any>()
    const sorted = [...measurements].sort((a, b) =>
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    )
    sorted.forEach(m => {
      const date = new Date(m.timestamp).toLocaleDateString('ko-KR', {
        year: 'numeric', month: '2-digit', day: '2-digit'
      })
      map.set(date, m)
    })
    return Array.from(map.values())
  }, [measurements])

  const dailyTableData = useMemo(() => {
    if (dailyReadings.length === 0) return []
    const sorted = [...dailyReadings].sort((a, b) =>
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    )
    const firstValue = sorted[0].value
    const firstDate  = new Date(sorted[0].timestamp)
    return sorted.map((r, i) => {
      const currentDate = new Date(r.timestamp)
      const curMid   = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate())
      const initMid  = new Date(firstDate.getFullYear(), firstDate.getMonth(), firstDate.getDate())
      const elapsed  = Math.round((curMid.getTime() - initMid.getTime()) / 86400000)
      const prevValue = i > 0 ? sorted[i - 1].value : r.value
      const dateKey = currentDate.toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' })
      return {
        ...r,
        elapsed,
        prevDiff: parseFloat((r.value - prevValue).toFixed(2)),
        initDiff: parseFloat((r.value - firstValue).toFixed(2)),
        dateKey,
      }
    })
  }, [dailyReadings])

  const { user } = useAuth()
  const isMultiMonitor = user?.role === 'MultiMonitor'

  const { thresholdWarning, thresholdDanger } = sensor ? getThresholds(sensor) : { thresholdWarning: 0, thresholdDanger: 0 }
  const overThreshold = sensor ? sensor.currentValue > thresholdDanger : false
  const nearThreshold = sensor ? sensor.currentValue > thresholdWarning : false
  const maxScale      = thresholdDanger * 1.5 || 100

  const valueColorClass =
    sensor?.status === 'danger'  ? 'text-sensor-danger'  :
    sensor?.status === 'warning' ? 'text-sensor-warning' :
    sensor?.status === 'offline' ? 'text-ink-muted'      :
    'text-sensor-normal'

  const handlePrint = () => { setPrintOpen(false); setTimeout(() => window.print(), 300) }

  const handleExcelDownload = async () => {
    let chartBase64: string | null = null
    if (chartRef.current) {
      try {
        const svgEl = chartRef.current.querySelector('svg')
        if (svgEl) {
          const svgData = new XMLSerializer().serializeToString(svgEl)
          const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' })
          const svgUrl  = URL.createObjectURL(svgBlob)
          await new Promise<void>((resolve) => {
            const img = new Image()
            const scale = 3
            img.onload = () => {
              const canvas = document.createElement('canvas')
              canvas.width  = svgEl.clientWidth  * scale
              canvas.height = svgEl.clientHeight * scale
              const ctx = canvas.getContext('2d')!
              ctx.fillStyle = '#ffffff'
              ctx.fillRect(0, 0, canvas.width, canvas.height)
              ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
              chartBase64 = canvas.toDataURL('image/png', 1.0)
              URL.revokeObjectURL(svgUrl)
              resolve()
            }
            img.onerror = () => { URL.revokeObjectURL(svgUrl); resolve() }
            img.src = svgUrl
          })
        } else {
          const canvas = await html2canvas(chartRef.current, {
            scale: 3, backgroundColor: '#ffffff', useCORS: true,
          })
          chartBase64 = canvas.toDataURL('image/png', 1.0)
        }
      } catch { chartBase64 = null }
    }

    const managerUsernames: string[] = (() => {
      try { return JSON.parse(sensor.site_managers || '[]') } catch { return [] }
    })()
    let managerText = '—'
    if (managerUsernames.length > 0) {
      try {
        const users = await userApi.getList()
        managerText = managerUsernames.map((uname: string) => {
          const u = users.find((x: any) => x.username === uname)
          return u ? `${u.username} (${u.role})` : uname
        }).join(', ')
      } catch { managerText = managerUsernames.join(', ') }
    }

    const sortedRows = [...dailyReadings].sort((a: any, b: any) =>
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    )
    const initValue = sortedRows.length > 0 ? parseFloat(String(sortedRows[0].value)) : 0
    const initDate  = sortedRows.length > 0 ? new Date(sortedRows[0].timestamp) : new Date()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ExcelJSModule = await import('exceljs') as any
    const ExcelJS = ExcelJSModule.default ?? ExcelJSModule
    const wb2 = new ExcelJS.Workbook()
    const ws2 = wb2.addWorksheet(sensor.manageNo || sensor.name || '측정데이터')

    const DARK = 'FF1F3864', MID = 'FF2F5496', WHITE = 'FFFFFFFF'
    const BLACK = 'FF000000', RED = 'FFC00000', BLUE = 'FF2F5496'
    const YELL = 'FFFFF2CC', ALT = 'FFEEF4FB'
    const thin = { style: 'thin' as const, color: { argb: 'FF000000' } }
    const med  = { style: 'medium' as const, color: { argb: DARK } }
    const TB = { top: thin, left: thin, bottom: thin, right: thin }
    const MB = { top: med,  left: med,  bottom: med,  right: med  }
    const fill = (argb: string) => ({ type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb } })
    const font = (bold = false, sz = 9, argb = BLACK) => ({ name: '맑은 고딕', size: sz, bold, color: { argb } })
    const aln  = (h: 'center' | 'left' | 'right' = 'center', v: 'middle' | 'top' | 'bottom' = 'middle', wrap = false) => ({ horizontal: h, vertical: v, wrapText: wrap })

    ws2.columns = [{ width: 14 }, { width: 7 }, { width: 13 }, { width: 12 }, { width: 12 }, { width: 14 }]

    const setH = (r: number, h: number) => { ws2.getRow(r).height = h }
    setH(1, 28); setH(2, 4); setH(3, 18); setH(4, 18); setH(5, 18)
    const CR_START = 6
    const CR_END = 15
    for (let r = CR_START; r <= CR_END; r++) setH(r, 18)
    setH(CR_END + 1, 14)
    setH(CR_END + 2, 4); setH(CR_END + 3, 18); setH(CR_END + 4, 18); setH(CR_END + 5, 18); setH(CR_END + 6, 3)
    const DS = CR_END + 7
    sortedRows.forEach((_: any, i: number) => setH(DS + i, 17))

    ws2.mergeCells('A1:F1')
    const t = ws2.getCell('A1')
    t.value = 'Water Level Meter Report'; t.font = font(true, 15, WHITE); t.fill = fill(DARK); t.alignment = aln(); t.border = MB

    const infoRows = [
      ['현   장   명', sensor.siteName || '—',          '계측기 No.', sensor.manageNo || '—'],
      ['설 치 현 황',  sensor.installDate ? `설치일자 (${sensor.installDate.slice(0, 10)})` : '—', '초기측정일', initDate.toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' })],
      ['관   리   자', managerText,                      '설치위치',   sensor.location?.description || '—'],
    ]
    infoRows.forEach(([l1, v1, l2, v2]: any, i: number) => {
      const r = 3 + i
      ws2.mergeCells(r, 2, r, 3); ws2.mergeCells(r, 5, r, 6)
      const setC = (col: number, val: string, fnt: any, fil: any, al: any) => {
        const c = ws2.getCell(r, col); c.value = val; c.font = fnt; c.fill = fil; c.alignment = al; c.border = TB
      }
      setC(1, l1, font(true, 9, WHITE), fill(MID), aln())
      setC(2, v1, font(false, 9, BLACK), fill(WHITE), aln('left'))
      setC(4, l2, font(true, 9, WHITE), fill(MID), aln())
      setC(5, v2, font(false, 9, BLACK), fill(WHITE), aln('left'))
    })

    if (chartBase64) {
      const imgId = wb2.addImage({ base64: chartBase64.split(',')[1], extension: 'png' })
      ws2.addImage(imgId, {
        tl: { col: 0, row: CR_START - 1 } as any,
        br: { col: 6, row: CR_END } as any,
        editAs: 'oneCell',
      })
    }

    const legendRow = CR_END + 1
    ws2.mergeCells(legendRow, 1, legendRow, 3)
    const lgLine = ws2.getCell(legendRow, 1)
    lgLine.value = '── ' + (sensor.manageNo || sensor.name)
    lgLine.font = { name: '맑은 고딕', size: 9, color: { argb: 'FF2F5496' } }
    lgLine.alignment = { horizontal: 'center', vertical: 'middle' }

    ws2.mergeCells(legendRow, 4, legendRow, 6)
    const lgRef = ws2.getCell(legendRow, 4)
    lgRef.value = '- - - 1차 관리기준'
    lgRef.font = { name: '맑은 고딕', size: 9, color: { argb: 'FFC00000' } }
    lgRef.alignment = { horizontal: 'center', vertical: 'middle' }

    const H1 = CR_END + 3, H2 = CR_END + 4, H3 = CR_END + 5
    const mhdr = (r1: number, c1: number, r2: number, c2: number, val: string, sz = 9, bg = DARK) => {
      ws2.mergeCells(r1, c1, r2, c2)
      const c = ws2.getCell(r1, c1); c.value = val; c.font = font(true, sz, WHITE); c.fill = fill(bg); c.alignment = aln('center', 'middle', true); c.border = TB
    }
    mhdr(H1, 1, H3, 1, '측  정  일'); mhdr(H1, 2, H3, 2, '경과일')
    mhdr(H1, 3, H1, 5, sensor.manageNo || sensor.name); mhdr(H1, 6, H3, 6, '비  고')
    mhdr(H2, 3, H2, 3, `지하수위 G.L(${sensor.unit})`, 8, MID)
    mhdr(H2, 4, H2, 5, '변화량(m)', 8, MID)
    const setHdr = (r: number, c: number, val: string, sz = 7, bg = MID) => {
      const cell = ws2.getCell(r, c); cell.value = val; cell.font = font(true, sz, WHITE); cell.fill = fill(bg); cell.alignment = aln('center', 'middle', true); cell.border = TB
    }
    ws2.getCell(H3, 3).fill = fill(MID); ws2.getCell(H3, 3).border = TB
    setHdr(H3, 4, '전측정치대비'); setHdr(H3, 5, '초기치대비')

    sortedRows.forEach((row: any, i: number) => {
      const r = DS + i
      const isFirst = i === 0
      const rf = isFirst ? YELL : (i % 2 === 0 ? ALT : WHITE)
      const base = { fill: fill(rf), border: TB, alignment: aln() }
      const setD = (c: number, val: any, fnt: any, numFmt?: string) => {
        const cell = ws2.getCell(r, c); cell.value = val; cell.font = fnt; Object.assign(cell, base)
        if (numFmt) cell.numFmt = numFmt
      }
      const curDate  = new Date(row.timestamp)
      const curMidnight  = new Date(curDate.getFullYear(), curDate.getMonth(), curDate.getDate())
      const initMidnight = new Date(initDate.getFullYear(), initDate.getMonth(), initDate.getDate())
      const elapsed  = Math.round((curMidnight.getTime() - initMidnight.getTime()) / 86400000)
      const curVal   = parseFloat(parseFloat(String(row.value)).toFixed(2))
      const prevVal  = i > 0 ? parseFloat(parseFloat(String(sortedRows[i - 1].value)).toFixed(2)) : curVal
      const prevDiff = parseFloat((curVal - prevVal).toFixed(2))
      const initDiff = parseFloat((curVal - parseFloat(initValue.toFixed(2))).toFixed(2))

      setD(1, curDate.toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' }), font(false, 9, BLACK))
      setD(2, elapsed, font(false, 9, BLACK))
      setD(3, curVal,  font(false, 9, BLACK), '0.00')
      if (isFirst) {
        setD(4, 0, font(false, 9, BLACK), '0.00')
        setD(5, 0, font(false, 9, BLACK), '0.00')
      } else {
        setD(4, prevDiff, font(false, 9, prevDiff < 0 ? RED : BLUE), '+0.00;-0.00;0.00')
        setD(5, initDiff, font(false, 9, initDiff < 0 ? RED : BLUE), '+0.00;-0.00;0.00')
      }
      const dateKey = curDate.toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' })
      const note = remarks[dateKey] || (isFirst ? '초기치' : '')
      const cn = ws2.getCell(r, 6); cn.value = note; cn.font = font(isFirst, 9, isFirst ? RED : BLACK)
      cn.fill = fill(isFirst ? YELL : rf); cn.border = TB; cn.alignment = aln()
    })

    ws2.pageSetup.paperSize = 9; ws2.pageSetup.orientation = 'portrait'
    ws2.pageSetup.fitToPage = true; ws2.pageSetup.fitToWidth = 1; ws2.pageSetup.fitToHeight = 0

    const buf  = await wb2.xlsx.writeBuffer()
    const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a'); a.href = url
    a.download = `${sensor.manageNo || sensor.name}_${dateFrom}_${dateTo}.xlsx`
    a.click(); URL.revokeObjectURL(url)
  }

  const handlePdfDownload = async () => {
    const doc = new jsPDF('p', 'mm', 'a4')
    const pageWidth = doc.internal.pageSize.getWidth()

    const fontRes = await fetch('/NanumGothic.ttf')
    const fontBuffer = await fontRes.arrayBuffer()
    const uint8Array = new Uint8Array(fontBuffer)
    let binary = ''
    for (let i = 0; i < uint8Array.byteLength; i++) {
      binary += String.fromCharCode(uint8Array[i])
    }
    const fontBase64 = btoa(binary)
    doc.addFileToVFS('NanumGothic.ttf', fontBase64)
    doc.addFont('NanumGothic.ttf', 'NanumGothic', 'normal')
    doc.addFont('NanumGothic.ttf', 'NanumGothic', 'bold')
    doc.setFont('NanumGothic', 'normal')

    const managers = (() => {
      try { return JSON.parse((sensor as any).site_managers || '[]') } catch { return [] }
    })()
    let managerText = '—'
    if (managers.length > 0) {
      try {
        const users = await userApi.getList()
        managerText = managers.map((username: string) => {
          const user = users.find((u: any) => u.username === username)
          return user ? `${user.username} (${user.role})` : username
        }).join(', ')
      } catch { managerText = managers.join(', ') }
    }

    const pdfInitDateStr = globalInitReading
      ? new Date(globalInitReading.timestamp).toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' })
      : dateFrom

    doc.setFontSize(16)
    doc.text('Water Level Meter Report', pageWidth / 2, 20, { align: 'center' })

    autoTable(doc, {
      startY: 28,
      head: [],
      body: [
        ['현장명',  sensor.siteName || '—',                                                        '계측기 No.', sensor.manageNo || '—'],
        ['설치현황', sensor.installDate ? `설치일자 (${sensor.installDate.slice(0, 10)})` : '—', '초기측정일', pdfInitDateStr],
        ['관리자',  managerText,                                                                     '설치위치',   sensor.location?.description || '—'],
      ],
      theme: 'grid',
      styles: { fontSize: 9, cellPadding: 2, font: 'NanumGothic' },
      columnStyles: {
        0: { fillColor: [240, 240, 240], cellWidth: 25 },
        1: { cellWidth: 65 },
        2: { fillColor: [240, 240, 240], cellWidth: 25 },
        3: { cellWidth: 65 },
      },
    })

    const currentY = (doc as any).lastAutoTable.finalY + 5
    const chartData = [...(chartMode === 'hourly' ? measurements : dailyReadings)].sort((a: any, b: any) =>
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    )

    // 1차 관리기준 값
    const level1Lower = sensor.criteria?.level1Lower !== '' && sensor.criteria?.level1Lower != null
      ? parseFloat(sensor.criteria.level1Lower) : null
    const level1Upper = sensor.criteria?.level1Upper !== '' && sensor.criteria?.level1Upper != null
      ? parseFloat(sensor.criteria.level1Upper) : null

    if (chartData.length > 0) {
      const chartX = 15, chartY = currentY, chartW = pageWidth - 30, chartH = 50

      doc.setDrawColor(180, 180, 180); doc.setLineWidth(0.3)
      doc.rect(chartX, chartY, chartW, chartH)

      const values = chartData.map((r: any) => parseFloat(r.value))
      const refVals = [
        ...(level1Lower !== null && !isNaN(level1Lower) ? [level1Lower] : []),
        ...(level1Upper !== null && !isNaN(level1Upper) ? [level1Upper] : []),
      ]
      const allVals = [...values, ...refVals]
      const minVal = Math.min(...allVals), maxVal = Math.max(...allVals)
      const padding = (maxVal - minVal) * 0.1 || 1
      const yMin = minVal - padding, yMax = maxVal + padding, range = yMax - yMin

      // 격자선
      doc.setDrawColor(220, 220, 220); doc.setLineWidth(0.2)
      for (let g = 1; g <= 3; g++) {
        const gy = chartY + (chartH / 4) * g
        doc.line(chartX, gy, chartX + chartW, gy)
        doc.setFontSize(5); doc.setTextColor(120, 120, 120)
        doc.text((yMax - (range / 4) * g).toFixed(2), chartX - 1, gy + 1, { align: 'right' })
      }
      doc.setFontSize(5); doc.setTextColor(120, 120, 120)
      doc.text(yMax.toFixed(2), chartX - 1, chartY + 2, { align: 'right' })
      doc.text(yMin.toFixed(2), chartX - 1, chartY + chartH + 1, { align: 'right' })

      // 1차 하한선 (빨간색)
      if (level1Lower !== null && !isNaN(level1Lower)) {
        const refY = chartY + chartH - ((level1Lower - yMin) / range) * chartH
        if (refY >= chartY && refY <= chartY + chartH) {
          doc.setDrawColor(192, 0, 0); doc.setLineWidth(0.4)
          let x = chartX
          while (x < chartX + chartW) {
            doc.line(x, refY, Math.min(x + 3, chartX + chartW), refY); x += 5
          }
          doc.setFontSize(5); doc.setTextColor(192, 0, 0)
          doc.text('1차 하한기준', chartX + chartW - 1, refY - 1, { align: 'right' })
        }
      }

      // 1차 상한선 (주황색)
      if (level1Upper !== null && !isNaN(level1Upper)) {
        const refY = chartY + chartH - ((level1Upper - yMin) / range) * chartH
        if (refY >= chartY && refY <= chartY + chartH) {
          doc.setDrawColor(224, 112, 0); doc.setLineWidth(0.4)
          let x = chartX
          while (x < chartX + chartW) {
            doc.line(x, refY, Math.min(x + 3, chartX + chartW), refY); x += 5
          }
          doc.setFontSize(5); doc.setTextColor(224, 112, 0)
          doc.text('1차 상한기준', chartX + chartW - 1, refY - 1, { align: 'right' })
        }
      }

      // 데이터 선
      doc.setDrawColor(34, 150, 100); doc.setLineWidth(0.5); doc.setTextColor(0, 0, 0)
      for (let i = 1; i < chartData.length; i++) {
        const x1 = chartX + ((i - 1) / (chartData.length - 1)) * chartW
        const x2 = chartX + (i / (chartData.length - 1)) * chartW
        const y1 = chartY + chartH - ((parseFloat(chartData[i - 1].value) - yMin) / range) * chartH
        const y2 = chartY + chartH - ((parseFloat(chartData[i].value) - yMin) / range) * chartH
        doc.line(x1, y1, x2, y2)
      }

      // X축 날짜 레이블
      doc.setFontSize(5); doc.setTextColor(120, 120, 120)
      const labelCount = Math.min(5, chartData.length)
      for (let l = 0; l < labelCount; l++) {
        const idx = Math.round((l / (labelCount - 1 || 1)) * (chartData.length - 1))
        const x = chartX + (idx / (chartData.length - 1 || 1)) * chartW
        doc.text(new Date(chartData[idx].timestamp).toLocaleDateString('ko-KR', { month: '2-digit', day: '2-digit' }), x, chartY + chartH + 4, { align: 'center' })
      }
      doc.setTextColor(0, 0, 0)

      // 범례 — 가운데 정렬
      const legendY = chartY + chartH + 10
      const centerX = chartX + chartW / 2
      doc.setFontSize(7)

      // 센서명 범례
      const leftLegendX = centerX - 50
      doc.setDrawColor(34, 150, 100); doc.setLineWidth(0.8)
      doc.line(leftLegendX, legendY, leftLegendX + 8, legendY)
      doc.setTextColor(34, 150, 100)
      doc.text(`── ${sensor.manageNo || sensor.name}`, leftLegendX + 10, legendY + 0.5)

      // 1차 하한 범례
      if (level1Lower !== null && !isNaN(level1Lower)) {
        const lx1 = centerX - 5
        doc.setDrawColor(192, 0, 0); doc.setLineWidth(0.6)
        let lx = lx1
        while (lx < lx1 + 8) { doc.line(lx, legendY, Math.min(lx + 3, lx1 + 8), legendY); lx += 5 }
        doc.setTextColor(192, 0, 0)
        doc.text('1차 하한기준', lx1 + 10, legendY + 0.5)
      }

      // 1차 상한 범례
      if (level1Upper !== null && !isNaN(level1Upper)) {
        const lx2 = centerX + 35
        doc.setDrawColor(224, 112, 0); doc.setLineWidth(0.6)
        let lx = lx2
        while (lx < lx2 + 8) { doc.line(lx, legendY, Math.min(lx + 3, lx2 + 8), legendY); lx += 5 }
        doc.setTextColor(224, 112, 0)
        doc.text('1차 상한기준', lx2 + 10, legendY + 0.5)
      }
      doc.setTextColor(0, 0, 0)
    }

    // PDF 표
    const pdfSortedRows = [...dailyReadings].sort((a: any, b: any) =>
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    )
    const pdfInitVal  = pdfSortedRows.length > 0 ? parseFloat(parseFloat(String(pdfSortedRows[0].value)).toFixed(2)) : 0
    const pdfInitDate = pdfSortedRows.length > 0 ? new Date(pdfSortedRows[0].timestamp) : new Date()

    const tableStartY = currentY + 65
    autoTable(doc, {
      startY: tableStartY,
      head: [['측정일', '경과일', `지하수위 G.L(${sensor.unit})`, '전측정대비', '초기치대비', '비고']],
      body: pdfSortedRows.map((r: any, i: number) => {
        const curVal   = parseFloat(parseFloat(String(r.value)).toFixed(2))
        const prevVal  = i > 0 ? parseFloat(parseFloat(String(pdfSortedRows[i - 1].value)).toFixed(2)) : curVal
        const prevDiff = parseFloat((curVal - prevVal).toFixed(2))
        const initDiff = parseFloat((curVal - pdfInitVal).toFixed(2))
        const rDate    = new Date(r.timestamp)
        const curMid   = new Date(rDate.getFullYear(), rDate.getMonth(), rDate.getDate())
        const initMid  = new Date(pdfInitDate.getFullYear(), pdfInitDate.getMonth(), pdfInitDate.getDate())
        const elapsed  = Math.round((curMid.getTime() - initMid.getTime()) / 86400000)
        const dateKey  = new Date(r.timestamp).toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' })
        return [
          dateKey,
          elapsed,
          curVal.toFixed(2),
          i === 0 ? '0.00' : (prevDiff > 0 ? `+${prevDiff}` : String(prevDiff)),
          i === 0 ? '0.00' : (initDiff > 0 ? `+${initDiff}` : String(initDiff)),
          i === 0 ? '초기치' : (remarks[dateKey] || ''),
        ]
      }),
      theme: 'grid',
      headStyles: { fillColor: [60, 80, 120], textColor: 255, fontSize: 8, font: 'NanumGothic', fontStyle: 'normal' },
      styles: { fontSize: 8, cellPadding: 2, font: 'NanumGothic' },
    })

    doc.save(`${sensor.manageNo || sensor.name}_${dateFrom}_${dateTo}.pdf`)
  }

  const setPreset = (days: number) => {
    const from = new Date()
    from.setDate(from.getDate() - (days - 1))
    setDateFrom(from.toISOString().slice(0, 10))
    setDateTo(today)
    setTablePage(1)
  }

  if (loading) return (
    <div className="flex h-full items-center justify-center bg-surface-page">
      <p className="font-mono text-sm text-ink-muted">센서 정보 불러오는 중...</p>
    </div>
  )

  if (!sensor) return (
    <div className="flex h-full items-center justify-center bg-surface-page">
      <p className="font-mono text-sm text-ink-muted">센서를 찾을 수 없습니다.</p>
    </div>
  )

  return (
    <div className="flex-1 overflow-y-auto bg-surface-page">

      <div className="sticky top-0 z-10 border-b border-line bg-surface-card/90 px-6 py-3 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <Link href="/sensors" className="text-sm text-ink-muted transition-colors hover:text-ink">← 센서 목록</Link>
          <span className="text-line-strong">/</span>
          <h1 className="font-mono text-[15px] font-semibold text-ink">{sensor.manageNo || sensor.id}</h1>
          <span className="font-mono text-xs text-ink-muted">{sensor.name}</span>
          <StatusBadge status={sensor.status} />
        </div>
      </div>

      <div ref={printRef} style={{ display: 'none' }} />

      <div className="space-y-5 p-6">

        {sensor.status === 'danger' && (
          <div className="rounded-xl border border-sensor-dangerborder bg-sensor-dangerbg px-5 py-4 danger-flash">
            <p className="flex items-center gap-2 font-semibold text-sensor-dangertext">
              <span className="pulse-danger" />위험 — 임계값 초과 감지
            </p>
            <p className="mt-1 text-sm text-sensor-dangertext/80">
              현재값 <strong>{sensor.currentValue} {sensor.unit}</strong>이(가) 위험 임계값
              <strong> {thresholdDanger} {sensor.unit}</strong>을 초과하였습니다. 즉시 현장 점검을 실시하세요.
            </p>
          </div>
        )}
        {sensor.status === 'warning' && (
          <div className="rounded-xl border border-sensor-warningborder bg-sensor-warningbg px-5 py-4">
            <p className="flex items-center gap-2 font-semibold text-sensor-warningtext">⚠ 주의 — 모니터링 강화 필요</p>
            <p className="mt-1 text-sm text-sensor-warningtext/80">
              현재값 <strong>{sensor.currentValue} {sensor.unit}</strong>이(가) 주의 임계값에 도달했습니다.
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <div className="geo-card p-5">
            <h2 className="mb-4 text-sm font-semibold text-ink">센서 정보</h2>
            <dl className="space-y-3 text-sm">
              {[
                { label: '관리번호',  value: sensor.manageNo || '—' },
                { label: '센서명',    value: sensor.name },
                { label: '현장',      value: sensor.siteName || '—' },
                { label: '설치 위치', value: sensor.location.description || '—' },
                { label: '설치일',    value: sensor.installDate ? new Date(sensor.installDate).toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' }) : '—' },
                { label: '측정단위',  value: sensor.unit || '—' },
                { label: '측정주기',  value: sensor.operation?.measureCycle || '—' },
                { label: '계산식',    value: sensor.formula || '—' },
                { label: '1차 상한',  value: sensor.criteria?.level1Upper ? `${sensor.criteria.level1Upper} ${sensor.criteria.criteriaUnit || ''}`.trim() : '—' },
                { label: '1차 하한',  value: sensor.criteria?.level1Lower ? `${sensor.criteria.level1Lower} ${sensor.criteria.criteriaUnit || ''}`.trim() : '—' },
                { label: '2차 상한',  value: sensor.criteria?.level2Upper ? `${sensor.criteria.level2Upper} ${sensor.criteria.criteriaUnit || ''}`.trim() : '—' },
                { label: '2차 하한',  value: sensor.criteria?.level2Lower ? `${sensor.criteria.level2Lower} ${sensor.criteria.criteriaUnit || ''}`.trim() : '—' },
                ...(!isMultiMonitor ? [{ label: '마지막 수신', value: `${formatTimestamp(sensor.lastUpdated)} (${getRelativeTime(sensor.lastUpdated)})` }] : []),
              ].map(item => (
                <div key={item.label} className="flex items-start gap-3">
                  <dt className="w-28 shrink-0 font-mono text-xs text-ink-muted">{item.label}</dt>
                  <dd className="font-medium text-ink break-all">{item.value}</dd>
                </div>
              ))}

              {/* 계산식 상수값 표시 */}
              {sensor.formulaParams && Object.values(sensor.formulaParams).some((v: any) => v) && (
                <div className="mt-2 rounded-lg border border-line bg-surface-subtle px-3 py-2.5">
                  <p className="mb-2 font-mono text-[10px] font-semibold uppercase tracking-wider text-ink-muted">계산식 상수값</p>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                    {[
                      { key: 'A', val: sensor.formulaParams.coeffA },
                      { key: 'B', val: sensor.formulaParams.coeffB },
                      { key: 'C', val: sensor.formulaParams.coeffC },
                      { key: 'D', val: sensor.formulaParams.coeffD },
                      { key: 'E', val: sensor.formulaParams.coeffE },
                      { key: 'I (초기값)', val: sensor.formulaParams.initVal },
                      { key: 'Tc (현재온도)', val: sensor.formulaParams.currentTemp },
                      { key: 'Tco (온도계수)', val: sensor.formulaParams.tempCoeff },
                      { key: 'Ti (초기온도)', val: sensor.formulaParams.initTemp },
                      { key: 'R (외부참조)', val: sensor.formulaParams.extRef },
                    ].filter(item => item.val).map(item => (
                      <div key={item.key} className="flex items-center gap-2">
                        <span className="font-mono text-[10px] text-ink-muted w-24 shrink-0">{item.key}</span>
                        <span className="font-mono text-[11px] font-medium text-ink">{item.val}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {(sensor.criteria?.noAlarm || sensor.criteria?.noSms) && (
                <div className="flex gap-2 pt-1">
                  {sensor.criteria.noAlarm && <span className="rounded-full border border-sensor-warningborder bg-sensor-warningbg px-2.5 py-0.5 font-mono text-[11px] text-sensor-warningtext">알람 미적용</span>}
                  {sensor.criteria.noSms   && <span className="rounded-full border border-alarm-infoborder bg-alarm-infobg px-2.5 py-0.5 font-mono text-[11px] text-alarm-infotext">No SMS</span>}
                </div>
              )}
            </dl>
          </div>

          <div className="geo-card p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-ink">계측계획 평면도</h2>
              {!isMultiMonitor && (
                <label className="cursor-pointer rounded-md border border-line bg-surface-card px-2.5 py-1 font-mono text-[10px] text-ink-muted transition-colors hover:border-brand/40 hover:text-brand">
                  📎 {sensor.floor_plan_url || sensor.site_floor_plan_url ? '변경' : '업로드'}
                  <input type="file" accept="image/jpeg,image/png,image/gif,image/webp,application/pdf" className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0]
                      if (!file) return
                      const formData = new FormData()
                      formData.append('file', file)
                      try {
                        const token = localStorage.getItem('gm_token')
                        const apiBase = process.env.NEXT_PUBLIC_API_URL || 'https://yuhyun-sensor-monitoring-back.onrender.com'
                        const res = await fetch(
                          `${apiBase}/api/sensors/${sensor.id}/floor-plan`,
                          { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: formData }
                        )
                        const data = await res.json()
                        if (data.success) {
                          setSensor((prev: any) => ({ ...prev, floor_plan_url: data.floor_plan_url }))
                        } else {
                          alert('업로드 실패: ' + (data.error || '알 수 없는 오류'))
                        }
                      } catch { alert('업로드 중 오류가 발생했습니다.') }
                    }}
                  />
                </label>
              )}
            </div>
            {(() => {
              const floorPlanUrl = sensor.floor_plan_url || sensor.site_floor_plan_url || null
              return floorPlanUrl ? (
                <div className="rounded-xl border border-line overflow-hidden bg-surface-subtle">
                  <img
                    src={floorPlanUrl}
                    alt="계측계획 평면도"
                    className="w-full object-contain"
                    style={{ maxHeight: '400px' }}
                  />
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-line bg-surface-subtle flex flex-col items-center justify-center gap-3 py-16">
                  <span className="text-4xl">🗺</span>
                  <p className="font-mono text-sm text-ink-muted">평면도 이미지 준비 중</p>
                  <p className="font-mono text-[10px] text-ink-muted">PNG, JPG, PDF 업로드 가능</p>
                  {!isMultiMonitor && (
                    <label className="cursor-pointer rounded-lg border border-brand/40 bg-brand/10 px-4 py-2 font-mono text-[11px] text-brand transition-colors hover:bg-brand/20">
                      📎 평면도 업로드
                      <input type="file" accept="image/jpeg,image/png,image/gif,image/webp,application/pdf" className="hidden"
                        onChange={async (e) => {
                          const file = e.target.files?.[0]
                          if (!file) return
                          const formData = new FormData()
                          formData.append('file', file)
                          try {
                            const token = localStorage.getItem('gm_token')
                            const apiBase = process.env.NEXT_PUBLIC_API_URL || 'https://yuhyun-sensor-monitoring-back.onrender.com'
                            const res = await fetch(
                              `${apiBase}/api/sensors/${sensor.id}/floor-plan`,
                              { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: formData }
                            )
                            const data = await res.json()
                            if (data.success) {
                              setSensor((prev: any) => ({ ...prev, floor_plan_url: data.floor_plan_url }))
                            } else {
                              alert('업로드 실패: ' + (data.error || '알 수 없는 오류'))
                            }
                          } catch { alert('업로드 중 오류가 발생했습니다.') }
                        }}
                      />
                    </label>
                  )}
                </div>
              )
            })()}
          </div>
        </div>

        <div className="geo-card p-5">
          {/* 날짜 선택 + 출력/QR 버튼 */}
          <div className="mb-4 flex flex-wrap items-center gap-2 border-b border-line pb-4">
            <div className="flex gap-1">
              {[
                { label: '오늘',  days: 1  },
                { label: '7일',   days: 7  },
                { label: '30일',  days: 30 },
                { label: '90일',  days: 90 },
              ].map(p => (
                <button key={p.label} onClick={() => setPreset(p.days)}
                  className={[
                    'rounded-md px-2.5 py-1 font-mono text-[11px] font-medium transition-all border',
                    dateFrom === new Date(new Date().setDate(new Date().getDate() - p.days + 1)).toISOString().slice(0,10) && dateTo === today
                      ? 'border-brand/40 bg-brand/10 text-brand'
                      : 'border-line text-ink-muted hover:border-line-strong hover:text-ink-sub',
                  ].join(' ')}>
                  {p.label}
                </button>
              ))}
            </div>

            <span className="text-ink-muted">|</span>

            <div className="flex items-center gap-1.5 rounded-lg border border-line bg-surface-card px-3 py-1 shadow-card">
              <span className="font-mono text-[10px] text-ink-muted">시작</span>
              <input type="date" value={dateFrom} max={today}
                onChange={e => { setDateFrom(e.target.value); setTablePage(1) }}
                className="font-mono text-xs text-ink outline-none bg-transparent" />
            </div>
            <span className="font-mono text-xs text-ink-muted">~</span>
            <div className={[
              'flex items-center gap-1.5 rounded-lg border px-3 py-1 shadow-card',
              !isValidRange ? 'border-sensor-dangerborder bg-sensor-dangerbg' : 'border-line bg-surface-card',
            ].join(' ')}>
              <span className="font-mono text-[10px] text-ink-muted">종료</span>
              <input type="date" value={dateTo} min={dateFrom} max={today}
                onChange={e => { setDateTo(e.target.value); setTablePage(1) }}
                className="font-mono text-xs text-ink outline-none bg-transparent" />
            </div>

            {isValidRange && (
              <span className="rounded-full border border-line bg-surface-subtle px-2.5 py-1 font-mono text-[11px] text-ink-muted">
                {dayCount}일 · {readings.length}개 포인트
              </span>
            )}
            {!isValidRange && (
              <span className="font-mono text-[11px] text-sensor-dangertext">종료일이 시작일보다 앞설 수 없습니다.</span>
            )}

            <div className="ml-auto flex items-center gap-2">
              <button onClick={() => { setPrintConfig(c => ({ ...c, dateFrom, dateTo })); setPrintOpen(true) }}
                className="flex items-center gap-1.5 rounded-lg border border-line bg-surface-card px-4 py-1.5 font-mono text-sm text-ink-sub shadow-card transition-colors hover:border-brand/40 hover:bg-brand/10 hover:text-brand">
                🖨 출력
              </button>
              <button onClick={() => setQrOpen(true)}
                className="flex items-center gap-1.5 rounded-lg border border-line bg-surface-card px-4 py-1.5 font-mono text-sm text-ink-sub shadow-card transition-colors hover:border-brand/40 hover:bg-brand/10 hover:text-brand">
                ⊞ QR
              </button>
            </div>
          </div>

          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-sm font-semibold text-ink">
                {chartMode === 'hourly' ? '시간별' : '일별'} 트렌드
                {isToday ? ' — 오늘' : ` — ${dateFrom} ~ ${dateTo}`}
              </h2>
              <p className="mt-0.5 font-mono text-[10px] text-ink-muted">
                {isValidRange
                  ? `${dayCount}일 · ${chartMode === 'hourly' ? readings.length : dailyReadings.length}개 포인트`
                  : '날짜 범위를 확인해 주세요.'}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {sensor.nameAbbr === '80053' && (
                <>
                  <div className="flex gap-1 rounded-lg border border-line bg-surface-subtle p-1">
                    {(['1', '2', '3'] as const).map(d => (
                      <button key={d} onClick={() => setDepthLabel(d)}
                        className={['rounded-md px-4 py-1.5 font-mono text-[13px] font-medium transition-all',
                          depthLabel === d ? 'bg-surface-card text-brand shadow-card' : 'text-ink-muted hover:text-ink-sub'].join(' ')}>
                        {d}번
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-1 rounded-lg border border-line bg-surface-subtle p-1">
                    {(['poly', 'linear'] as const).map(mode => (
                      <button key={mode} onClick={() => setCalcMode(mode)}
                        className={['rounded-md px-3 py-1 font-mono text-[11px] font-medium transition-all',
                          calcMode === mode ? 'bg-surface-card text-brand shadow-card' : 'text-ink-muted hover:text-ink-sub'].join(' ')}>
                        {mode === 'poly' ? 'Poly' : 'Linear'}
                      </button>
                    ))}
                  </div>
                </>
              )}
              <div className="flex gap-1 rounded-lg border border-line bg-surface-subtle p-1">
                {(['hourly', 'daily'] as const).map(mode => (
                  <button key={mode} onClick={() => setChartMode(mode)}
                    className={['rounded-md px-3 py-1 font-mono text-[11px] font-medium transition-all',
                      chartMode === mode ? 'bg-surface-card text-brand shadow-card' : 'text-ink-muted hover:text-ink-sub'].join(' ')}>
                    {mode === 'hourly' ? '시간별' : '일별'}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => {
                    const diff = dateDiffDays(dateFrom, dateTo)
                    const newTo   = new Date(dateFrom); newTo.setDate(newTo.getDate() - 1)
                    const newFrom = new Date(newTo);    newFrom.setDate(newFrom.getDate() - diff)
                    setDateFrom(newFrom.toISOString().slice(0, 10))
                    setDateTo(newTo.toISOString().slice(0, 10))
                  }}
                  className="rounded-md px-2.5 py-1.5 font-mono text-xs text-ink-muted border border-line transition-colors hover:bg-surface-subtle hover:text-ink">
                  ← 이전
                </button>
                <button
                  disabled={dateTo >= today}
                  onClick={() => {
                    const diff = dateDiffDays(dateFrom, dateTo)
                    const newFrom = new Date(dateTo); newFrom.setDate(newFrom.getDate() + 1)
                    const newTo   = new Date(newFrom); newTo.setDate(newTo.getDate() + diff)
                    const capTo = newTo.toISOString().slice(0, 10) > today ? today : newTo.toISOString().slice(0, 10)
                    setDateFrom(newFrom.toISOString().slice(0, 10))
                    setDateTo(capTo)
                  }}
                  className="rounded-md px-2.5 py-1.5 font-mono text-xs text-ink-muted border border-line transition-colors hover:bg-surface-subtle hover:text-ink disabled:opacity-30 disabled:cursor-not-allowed">
                  다음 →
                </button>
              </div>
            </div>
          </div>

          {/* 계측 현황 요약 */}
          <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-xl border border-line bg-surface-subtle py-3 px-2 text-center">
              <p className="font-mono text-[10px] text-ink-muted">
                {sensor.nameAbbr === '80053' ? '기간 내 최신값' : '현재 측정값'}
              </p>
              <p className={`mt-1 font-mono text-lg font-semibold ${valueColorClass}`}>
                {sensor.status === 'offline' ? '—'
                  : measurements.length > 0 && sensor.nameAbbr === '80053'
                    ? parseFloat(String(
                        calcMode === 'linear'
                          ? (measurements[0].linear_value ?? measurements[0].value)
                          : measurements[0].value
                      )).toFixed(2)
                    : sensor.currentValue}
                <span className="ml-1 text-xs font-normal text-ink-muted">{sensor.unit}</span>
              </p>
            </div>
            {globalInitReading && (
              <div className="rounded-xl border border-line bg-surface-subtle py-3 px-2 text-center">
                <p className="font-mono text-[10px] text-ink-muted">초기측정값</p>
                <p className="mt-1 font-mono text-lg font-semibold text-ink">
                  {parseFloat(String(
                    sensor.nameAbbr === '80053' && calcMode === 'linear'
                      ? (globalInitReading.linear_value ?? globalInitReading.value)
                      : globalInitReading.value
                  )).toFixed(2)}
                  <span className="ml-1 text-xs font-normal text-ink-muted">{sensor.unit}</span>
                </p>
                <p className="font-mono text-[9px] text-ink-muted">
                  {new Date(globalInitReading.timestamp).toLocaleDateString('ko-KR', { month: '2-digit', day: '2-digit' })}
                  {' '}{new Date(globalInitReading.timestamp).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            )}
            {measurements.length > 0 && sensor.status !== 'offline' && (
              <>
                <div className="rounded-xl border border-line bg-surface-subtle py-3 px-2 text-center">
                  <p className="font-mono text-[10px] text-ink-muted">최솟값</p>
                  <p className="mt-1 font-mono text-lg font-semibold text-sensor-normal">
                    {Math.min(...measurements.map((r: any) => parseFloat(r.value))).toFixed(2)}
                    <span className="ml-1 text-xs font-normal text-ink-muted">{sensor.unit}</span>
                  </p>
                </div>
                <div className="rounded-xl border border-line bg-surface-subtle py-3 px-2 text-center">
                  <p className="font-mono text-[10px] text-ink-muted">최댓값</p>
                  <p className={`mt-1 font-mono text-lg font-semibold ${sensor.status === 'danger' ? 'text-sensor-danger' : sensor.status === 'warning' ? 'text-sensor-warning' : 'text-ink'}`}>
                    {Math.max(...measurements.map((r: any) => parseFloat(r.value))).toFixed(2)}
                    <span className="ml-1 text-xs font-normal text-ink-muted">{sensor.unit}</span>
                  </p>
                </div>
              </>
            )}
          </div>

          {/* 게이지 */}
          {sensor.status !== 'offline' && (
            <div className="mb-4 space-y-1.5">
              <div className="relative h-3 overflow-hidden rounded-full bg-surface-muted">
                <div className="absolute top-0 h-full bg-sensor-warning/20"
                  style={{ left: `${(thresholdWarning / maxScale) * 100}%`, width: `${((thresholdDanger - thresholdWarning) / maxScale) * 100}%` }} />
                <div className="absolute top-0 h-full bg-sensor-danger/20"
                  style={{ left: `${(thresholdDanger / maxScale) * 100}%`, right: 0 }} />
                <div className={['absolute top-0 h-full w-1 rounded-full shadow-sm transition-all duration-500',
                  overThreshold ? 'bg-sensor-danger' : nearThreshold ? 'bg-sensor-warning' : 'bg-sensor-normal'].join(' ')}
                  style={{ left: `${Math.min((sensor.currentValue / maxScale) * 100, 97)}%` }} />
              </div>
              <div className="flex justify-between font-mono text-[10px]">
                <span className="text-sensor-warningtext">주의: {thresholdWarning} {sensor.unit}</span>
                <span className="text-sensor-dangertext">위험: {thresholdDanger} {sensor.unit}</span>
              </div>
            </div>
          )}

          {(chartMode === 'hourly' ? measurements : dailyReadings).length > 0 ? (
            <div key={`${dateFrom}-${dateTo}-${chartMode}`} className="animate-fade-in-up" ref={chartRef}>
              {sensor.nameAbbr === '80053' && (
                <p className="mb-2 font-mono text-[10px] text-ink-muted">
                  ※ depth_label {depthLabel}번 기준 데이터입니다. ({calcMode === 'poly' ? 'Polynomial' : 'Linear'} 계산값)
                </p>
              )}
              <SensorTrendChart sensor={sensor} readings={chartMode === 'hourly' ? measurements : dailyReadings} />
            </div>
          ) : (
            <div className="flex h-[220px] items-center justify-center rounded-xl bg-surface-subtle">
              <p className="font-mono text-sm text-ink-muted">
                {!isValidRange ? '날짜 범위가 올바르지 않습니다.' : '데이터가 없습니다.'}
              </p>
            </div>
          )}
        </div>

        {(() => {
          const tableData = chartMode === 'hourly' ? measurements : dailyTableData
          const totalPages = Math.max(1, Math.ceil(tableData.length / TABLE_PAGE_SIZE))
          const safePage = Math.min(tablePage, totalPages)
          const pageData = tableData.slice((safePage - 1) * TABLE_PAGE_SIZE, safePage * TABLE_PAGE_SIZE)
          return (
            <div className="geo-card overflow-hidden">
              <div className="flex flex-col gap-2 border-b border-line px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-sm font-semibold text-ink">측정 데이터</h2>
                  <p className="font-mono text-[10px] text-ink-muted">
                    {isValidRange
                      ? `${dateFrom} ~ ${dateTo} · 전체 ${tableData.length}건 · ${TABLE_PAGE_SIZE}건씩 표시`
                      : '날짜 범위를 확인해 주세요.'}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex gap-1 rounded-lg border border-line bg-surface-subtle p-1">
                    {(['hourly', 'daily'] as const).map(mode => (
                      <button key={mode} onClick={() => { setChartMode(mode); setTablePage(1) }}
                        className={['rounded-md px-3 py-1 font-mono text-[11px] font-medium transition-all',
                          chartMode === mode ? 'bg-surface-card text-brand shadow-card' : 'text-ink-muted hover:text-ink-sub'].join(' ')}>
                        {mode === 'hourly' ? '시간별' : '일별'}
                      </button>
                    ))}
                  </div>
                  {tableData.length > TABLE_PAGE_SIZE && (
                    <div className="flex items-center gap-2">
                      <button
                        disabled={safePage <= 1}
                        onClick={() => setTablePage(p => Math.max(1, p - 1))}
                        className="rounded-md border border-line px-2.5 py-1 font-mono text-xs text-ink-muted transition-colors hover:bg-surface-subtle hover:text-ink disabled:opacity-30 disabled:cursor-not-allowed">
                        ←
                      </button>
                      <span className="font-mono text-xs text-ink-muted">
                        <span className="font-semibold text-ink">{safePage}</span> / {totalPages}
                      </span>
                      <button
                        disabled={safePage >= totalPages}
                        onClick={() => setTablePage(p => Math.min(totalPages, p + 1))}
                        className="rounded-md border border-line px-2.5 py-1 font-mono text-xs text-ink-muted transition-colors hover:bg-surface-subtle hover:text-ink disabled:opacity-30 disabled:cursor-not-allowed">
                        →
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {chartMode === 'daily' && (
                <p className="px-5 pt-3 font-mono text-[10px] text-ink-muted">
                  ※ 초기값은 첫 번째 측정값 기준입니다.
                </p>
              )}

              <div className="overflow-x-auto">
                {tableData.length > 0 ? (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-line bg-surface-subtle">
                        {chartMode === 'hourly'
                          ? ['날짜', '시각', '측정값', '상태'].map(h => (
                              <th key={h} className="px-4 py-2.5 text-left font-mono text-[10px] font-semibold uppercase tracking-wide text-ink-muted">{h}</th>
                            ))
                          : ['측정일', '경과일', `지하수위 G.L(${sensor.unit})`, '전측정대비', '초기치대비', '비고'].map(h => (
                              <th key={h} className="px-4 py-2.5 text-left font-mono text-[10px] font-semibold uppercase tracking-wide text-ink-muted">{h}</th>
                            ))
                        }
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line">
                      {pageData.map((r: any, i: number) => {
                        const dt = new Date(r.timestamp)
                        const rowCls =
                          r.status === 'danger'  ? 'bg-sensor-dangerbg/30'  :
                          r.status === 'warning' ? 'bg-sensor-warningbg/30' : ''
                        return (
                          <tr key={i} className={`transition-colors hover:bg-surface-subtle ${rowCls}`}>
                            {chartMode === 'hourly' ? (
                              <>
                                <td className="px-4 py-2 font-mono text-xs text-ink-muted whitespace-nowrap">
                                  {dt.toLocaleDateString('ko-KR', { month: '2-digit', day: '2-digit' })}
                                </td>
                                <td className="px-4 py-2 font-mono text-xs text-ink-muted whitespace-nowrap">
                                  {dt.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
                                </td>
                                <td className={`px-4 py-2 font-mono text-sm font-medium ${
                                  r.status === 'danger' ? 'text-sensor-danger' :
                                  r.status === 'warning' ? 'text-sensor-warning' : 'text-ink'}`}>
                                  {r.value} {sensor.unit}
                                </td>
                                <td className="px-4 py-2">
                                  <StatusBadge status={r.status} size="sm" />
                                </td>
                              </>
                            ) : (
                              <>
                                <td className="px-4 py-2 font-mono text-xs text-ink-muted">
                                  {dt.toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' })}
                                </td>
                                <td className="px-4 py-2 font-mono text-xs text-ink-muted text-center">
                                  {r.elapsed}
                                </td>
                                <td className={`px-4 py-2 font-mono text-sm font-medium ${
                                  r.status === 'danger' ? 'text-sensor-danger' :
                                  r.status === 'warning' ? 'text-sensor-warning' : 'text-ink'}`}>
                                  {parseFloat(r.value).toFixed(2)}
                                </td>
                                <td className={`px-4 py-2 font-mono text-xs ${r.prevDiff > 0 ? 'text-sensor-danger' : r.prevDiff < 0 ? 'text-sensor-normal' : 'text-ink-muted'}`}>
                                  {r.prevDiff > 0 ? '+' : ''}{r.prevDiff}
                                </td>
                                <td className={`px-4 py-2 font-mono text-xs ${r.initDiff > 0 ? 'text-sensor-danger' : r.initDiff < 0 ? 'text-sensor-normal' : 'text-ink-muted'}`}>
                                  {r.initDiff > 0 ? '+' : ''}{r.initDiff}
                                </td>
                                <td className="px-4 py-2">
                                  <input
                                    type="text"
                                    value={remarks[r.dateKey] || ''}
                                    onChange={e => setRemarks(prev => ({ ...prev, [r.dateKey]: e.target.value }))}
                                    placeholder="비고 입력"
                                    className="w-full rounded border border-line bg-transparent px-2 py-1 font-mono text-xs text-ink outline-none focus:border-brand/50"
                                  />
                                </td>
                              </>
                            )}
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                ) : (
                  <div className="py-10 text-center font-mono text-sm text-ink-muted">
                    {!isValidRange ? '날짜 범위가 올바르지 않습니다.' : '데이터가 없습니다.'}
                  </div>
                )}
              </div>

              {isValidRange && totalPages > 1 && totalPages <= 10 && (
                <div className="flex items-center justify-center gap-1.5 border-t border-line py-3">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                    <button key={p} onClick={() => setTablePage(p)}
                      className={[
                        'h-2 rounded-full transition-all duration-200',
                        p === safePage ? 'w-5 bg-brand' : 'w-2 bg-line-strong hover:bg-ink-muted',
                      ].join(' ')} />
                  ))}
                </div>
              )}
            </div>
          )
        })()}
      </div>

      {printOpen && (
        <PrintModal sensor={sensor} config={printConfig} onChange={setPrintConfig}
          onPrint={handlePrint} onExcel={() => { setPrintOpen(false); handleExcelDownload() }}
          onPdf={() => { setPrintOpen(false); handlePdfDownload() }}
          onClose={() => setPrintOpen(false)} />
      )}
      {qrOpen && <QRModal sensorId={sensor.id} onClose={() => setQrOpen(false)} />}
    </div>
  )
}
