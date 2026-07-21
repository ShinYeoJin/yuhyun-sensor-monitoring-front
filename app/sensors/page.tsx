'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { getRelativeTime, getThresholds } from '@/lib/mock-data'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { sensorStore, useSensorStore, evaluateStatus } from '@/lib/sensor-store'
import { sensorApi, siteApi, formulaApi, recollectApi, agentApi } from '@/lib/api'
import type {
  SensorStatus, UnifiedSensor, Formula,
  ThresholdRange,
} from '@/types'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { FormulaModal } from '@/components/ui/FormulaModal'
import { DeleteModal } from '@/components/ui/DeleteModal'
import { RecollectModal } from '@/components/ui/RecollectModal'
import type { SensorForm } from '@/types'
import { emptyForm } from '@/types'
import { SensorModal } from '@/components/features/sensors/SensorModal'



// ─── 상태 필터 ────────────────────────────────────────────────────────────────
const statusOptions: { value: SensorStatus | 'all'; label: string }[] = [
  { value: 'all', label: '전체' }, { value: 'normal', label: '정상' },
  { value: 'warning', label: '주의' }, { value: 'danger', label: '위험' },
  { value: 'offline', label: '오프라인' },
]
const tabActiveClass: Record<string, string> = {
  all:     'bg-surface-muted    border-line-strong          text-ink',
  normal:  'bg-sensor-normalbg  border-sensor-normalborder  text-sensor-normaltext',
  warning: 'bg-sensor-warningbg border-sensor-warningborder text-sensor-warningtext',
  danger:  'bg-sensor-dangerbg  border-sensor-dangerborder  text-sensor-dangertext',
  offline: 'bg-sensor-offlinebg border-sensor-offlineborder text-sensor-offlinetext',
}
const rowBgClass: Record<SensorStatus, string> = {
  danger:  'bg-sensor-dangerbg/40  hover:bg-sensor-dangerbg/70',
  warning: 'bg-sensor-warningbg/40 hover:bg-sensor-warningbg/70',
  normal:  'hover:bg-surface-subtle',
  offline: 'opacity-60 hover:opacity-80',
}


// ─── 메인 페이지 ──────────────────────────────────────────────────────────────
export default function SensorsPage() {
  const router = useRouter()
  const { user:me } = useAuth()
  const canManage = me?.role !== 'MultiMonitor'
  const { sensors } = useSensorStore()

  const isDataDelayed = (lastUpdated: string) => {
    if (!lastUpdated) return true
    const diff = Date.now() - new Date(lastUpdated).getTime()
    return diff > 2 * 60 * 60 * 1000
  }

  const [search,       setSearch]      = useState('')
  const [statusFilter, setStatus]      = useState<SensorStatus | 'all'>('all')
  const [siteFilter,   setSite]        = useState('all')
  const [activeTab, setActiveTab] = useState<'monitor' | 'manage' | 'formula' | 'recollect'>('monitor')
  const [addOpen,      setAddOpen]     = useState(false)
  const [editTarget,   setEditTarget]  = useState<UnifiedSensor | null>(null)
  const [deleteTarget, setDeleteTarget]= useState<UnifiedSensor | null>(null)
  const [editSensorPositions, setEditSensorPositions] = useState<Record<string, any>>({})
  const [form,         setForm]        = useState<SensorForm>(emptyForm)
  const [toast,        setToast]       = useState<string | null>(null)
  const autoInitValues = useRef<Record<string, string>>({})

  const [formulaAddOpen, setFormulaAddOpen] = useState(false)
  const [formulaEditTarget, setFormulaEditTarget] = useState<any | null>(null)
  const [formulaForm, setFormulaForm] = useState({ name: '', expression: '', description: '' })

  const openFormulaAdd = () => { setFormulaForm({ name: '', expression: '', description: '' }); setFormulaAddOpen(true) }

  const [formulas, setFormulas] = useState<any[]>([])

  // ── 재수집 상태 ──
  const [recollectOpen, setRecollectOpen] = useState(false)
  const [recollectList, setRecollectList] = useState<any[]>([])
  const [agentStatus, setAgentStatus]     = useState<any[]>([])
  const [recollectLoading, setRecollectLoading] = useState(false)

  useEffect(() => {
    formulaApi.getAll().then((data: any[]) => setFormulas(data)).catch(console.error)
  }, [])

  // 재수집 탭 진입 시 목록 + 에이전트 상태 로드
  useEffect(() => {
    if (activeTab !== 'recollect') return
    const load = async () => {
      setRecollectLoading(true)
      try {
        const [rList, aStatus] = await Promise.all([
          recollectApi.getAll(),
          agentApi.getStatus(),
        ])
        setRecollectList(rList)
        setAgentStatus(aStatus)
      } catch {}
      setRecollectLoading(false)
    }
    load()
  }, [activeTab])

  const [sites, setSites] = useState<any[]>([])

  useEffect(() => {
    siteApi.getAll().then((data: any[]) => setSites(data)).catch(console.error)
  }, [])

  useEffect(() => {
    sensorApi.getAll().then((data: any[]) => {
      data.forEach((s: any) => {
        const sensor: UnifiedSensor = {
          id: String(s.id),
          manageNo: s.manage_no || '',
          field: s.field || '공통',
          measureMethod: '해당없음',
          formula: s.formula || '(A*X+B)',
          group: '',
          name: s.name,
          nameEn: '',
          nameAbbr: s.sensor_code,
          unit: s.unit || '',
          unitName: '',
          description: s.location_desc || '',
          combination: '',
          decimalPoint: '2',
          pointerInfo: '',
          remark: '',
          threshold: {
            normalMax: s.threshold_normal_max ?? '',
            warningMax: s.threshold_warning_max ?? '',
            dangerMin: s.threshold_danger_min ?? '',
          },
          operation: { measureCycle: '01:00', actionAfterMeasure: '저장송신', actionBeforeMeasure: '자동' },
          formulaParams: { coeffA: '', coeffB: '', coeffC: '', coeffD: '', coeffE: '', coeffG: '', initVal: '', currentTemp: '', tempCoeff: '', initTemp: '', extRef: '' },          criteria: {
            level1Upper: s.level1_upper ?? '',
            level1Lower: s.level1_lower ?? '',
            level2Upper: s.level2_upper ?? '',
            level2Lower: s.level2_lower ?? '',
            criteriaUnit: s.criteria_unit ?? '',
            criteriaUnitName: s.criteria_unit_name ?? '',
            noAlarm: false,
            noSms: false,
          },
          siteId: s.site_code || '',
          siteName: s.site_name || '',
          installDate: s.install_date || '',
          location: { lat: 0, lng: 0, description: s.location_desc || '' },
          status: (s.status as SensorStatus) || 'offline',
          currentValue: s.current_value ? parseFloat(s.current_value) : 0,
          batteryLevel: 100,
          lastUpdated: s.last_measured || new Date().toISOString(),
          readings: [],
        }
        if (!sensorStore.getSensors().find((existing: UnifiedSensor) => existing.id === sensor.id)) {
          sensorStore.addSensor(sensor)
        } else {
          sensorStore.updateSensor(sensor)
        }
      })
    }).catch(console.error)
  }, [activeTab])

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 2500) }

  const openAdd = () => { setForm(emptyForm); setAddOpen(true) }
  const openEdit = async (s: UnifiedSensor) => {
    try {
      const fresh = await sensorApi.getById(Number(s.id))
      const freshSensor: UnifiedSensor = {
        ...s,
        formula: fresh.formula || '(A*X+B)',
        criteria: {
          level1Upper: fresh.level1_upper ?? '',
          level1Lower: fresh.level1_lower ?? '',
          level2Upper: fresh.level2_upper ?? '',
          level2Lower: fresh.level2_lower ?? '',
          criteriaUnit: fresh.criteria_unit ?? '',
          criteriaUnitName: fresh.criteria_unit_name ?? '',
          noAlarm: false,
          noSms: false,
          depthCriteria: fresh.depth_criteria || {},
        } as any,
        threshold: {
          normalMax: fresh.threshold_normal_max ?? '',
          warningMax: fresh.threshold_warning_max ?? '',
          dangerMin: fresh.threshold_danger_min ?? '',
        },
        formulaParams: (fresh as any).formula_params ? {
          coeffA: (fresh as any).formula_params.coeffA || '',
          coeffB: (fresh as any).formula_params.coeffB || '',
          coeffC: (fresh as any).formula_params.coeffC || '',
          coeffD: (fresh as any).formula_params.coeffD || '',
          coeffE: (fresh as any).formula_params.coeffE || '',
          coeffG: (fresh as any).formula_params.coeffG || '',
          initVal: (fresh as any).formula_params.initVal || '',
          currentTemp: (fresh as any).formula_params.currentTemp || '',
          tempCoeff: (fresh as any).formula_params.tempCoeff || '',
          initTemp: (fresh as any).formula_params.initTemp || '',
          extRef: (fresh as any).formula_params.extRef || '',
        } : { coeffA: '', coeffB: '', coeffC: '', coeffD: '', coeffE: '', coeffG: '', initVal: '', currentTemp: '', tempCoeff: '', initTemp: '', extRef: '' },
        formulaId: (fresh as any).formula_id || null,
        selectedExpression: (fresh as any).formula_params
          ? (() => {
              const fp = (fresh as any).formula_params
              const isDepth = fp['1'] || fp['2'] || fp['3']
              const base = isDepth ? (fp['1'] || Object.values(fp)[0]) : fp
              return base.A !== undefined ? '(A * R^2 + B * R + C) * K' : 'G * (I - R) * K'
            })()
          : '',
        useDepthParams: !!(fresh as any).formula_params?.['1'],
        initValMode: 'auto' as 'auto' | 'manual',
        depthParams: (fresh as any).formula_params?.['1']
          ? {
              '1': { A: String((fresh as any).formula_params['1']?.A || ''), B: String((fresh as any).formula_params['1']?.B || ''), C: String((fresh as any).formula_params['1']?.C || ''), G: String((fresh as any).formula_params['1']?.G || ''), K: String((fresh as any).formula_params['1']?.K || ''), I: String((fresh as any).formula_params['1']?.I || '') },
              '2': { A: String((fresh as any).formula_params['2']?.A || ''), B: String((fresh as any).formula_params['2']?.B || ''), C: String((fresh as any).formula_params['2']?.C || ''), G: String((fresh as any).formula_params['2']?.G || ''), K: String((fresh as any).formula_params['2']?.K || ''), I: String((fresh as any).formula_params['2']?.I || '') },
              '3': { A: String((fresh as any).formula_params['3']?.A || ''), B: String((fresh as any).formula_params['3']?.B || ''), C: String((fresh as any).formula_params['3']?.C || ''), G: String((fresh as any).formula_params['3']?.G || ''), K: String((fresh as any).formula_params['3']?.K || ''), I: String((fresh as any).formula_params['3']?.I || '') },
            }
          : { '1': { A: '', B: '', C: '', G: '', K: '' }, '2': { A: '', B: '', C: '', G: '', K: '' }, '3': { A: '', B: '', C: '', G: '', K: '' } },
        previewRaw: '',
        previewResult: null,
      }
      setEditSensorPositions((fresh as any).sensor_positions || {})
      setForm({
        manageNo: freshSensor.manageNo ?? '', field: freshSensor.field, measureMethod: freshSensor.measureMethod,
        formula: freshSensor.formula, group: freshSensor.group ?? '',
        name: freshSensor.name, nameEn: freshSensor.nameEn, nameAbbr: freshSensor.nameAbbr,
        unit: freshSensor.unit, unitName: freshSensor.unitName, description: freshSensor.description,
        combination: freshSensor.combination, decimalPoint: freshSensor.decimalPoint,
        pointerInfo: freshSensor.pointerInfo, remark: freshSensor.remark,
        threshold: { ...freshSensor.threshold },
        operation: { ...freshSensor.operation },
        formulaParams: freshSensor.formulaParams,
        criteria: { ...freshSensor.criteria },
        siteId: freshSensor.siteId, siteName: freshSensor.siteName,
        installDate: freshSensor.installDate ? freshSensor.installDate.slice(0, 10) : '',
        location: { ...freshSensor.location },
        formulaId: (fresh as any).formula_id || null,
        selectedExpression: (() => {
          const fid = (fresh as any).formula_id
          if (fid) {
            // formula_id로 formulas 목록에서 expression 찾기
            const found = formulas.find((f: any) => f.id === fid)
            if (found) return found.expression
          }
          // formula_id 없으면 formula_params로 추정
          const fp = (fresh as any).formula_params
          if (!fp) return ''
          const base = fp['1'] || fp
          return base.A !== undefined ? '(A * R^2 + B * R + C) * K' : 'G * (I - R) * K'
        })(),
        useDepthParams: !!(fresh as any).formula_params?.['1'],
        initValMode: (fresh as any).formula_params?.['1']?.I ? 'manual' : 'auto' as 'auto' | 'manual',
        depthParams: (fresh as any).formula_params?.['1']
          ? {
              '1': { A: String((fresh as any).formula_params['1']?.A || ''), B: String((fresh as any).formula_params['1']?.B || ''), C: String((fresh as any).formula_params['1']?.C || ''), G: String((fresh as any).formula_params['1']?.G || ''), K: String((fresh as any).formula_params['1']?.K || ''), I: String((fresh as any).formula_params['1']?.I || '') },
              '2': { A: String((fresh as any).formula_params['2']?.A || ''), B: String((fresh as any).formula_params['2']?.B || ''), C: String((fresh as any).formula_params['2']?.C || ''), G: String((fresh as any).formula_params['2']?.G || ''), K: String((fresh as any).formula_params['2']?.K || ''), I: String((fresh as any).formula_params['2']?.I || '') },
              '3': { A: String((fresh as any).formula_params['3']?.A || ''), B: String((fresh as any).formula_params['3']?.B || ''), C: String((fresh as any).formula_params['3']?.C || ''), G: String((fresh as any).formula_params['3']?.G || ''), K: String((fresh as any).formula_params['3']?.K || ''), I: String((fresh as any).formula_params['3']?.I || '') },
            }
          : { '1': { A: '', B: '', C: '', G: '', K: '', I: '' }, '2': { A: '', B: '', C: '', G: '', K: '', I: '' }, '3': { A: '', B: '', C: '', G: '', K: '', I: '' } },
        previewRaw: '',
        previewResult: null,
      })
      // I(초기값) 자동 조회 — formula_params에 I가 없을 때만
      const hasSavedI = (fresh as any).formula_params?.['1']?.I || (fresh as any).formula_params?.I
      if (!hasSavedI) {
        try {
          const is80053 = (fresh as any).sensor_code === '80053'
          if (is80053) {
            const [d1, d2, d3] = await Promise.all([
              sensorApi.getMeasurements(Number(fresh.id), { limit: 2000, depthLabel: '1' }),
              sensorApi.getMeasurements(Number(fresh.id), { limit: 2000, depthLabel: '2' }),
              sensorApi.getMeasurements(Number(fresh.id), { limit: 2000, depthLabel: '3' }),
            ])
            const getOldestRaw = (data: any[]) => data.length > 0
              ? String(parseFloat([...data].sort((a: any, b: any) =>
                  new Date(a.measured_at).getTime() - new Date(b.measured_at).getTime())[0].raw_value))
              : ''
            // setForm 대신 ref에 저장
            autoInitValues.current = {
              '1': getOldestRaw(d1),
              '2': getOldestRaw(d2),
              '3': getOldestRaw(d3),
            }
            setForm(prev => ({
              ...prev,
              depthParams: {
                '1': { ...(prev.depthParams?.['1'] || {}), I: getOldestRaw(d1) },
                '2': { ...(prev.depthParams?.['2'] || {}), I: getOldestRaw(d2) },
                '3': { ...(prev.depthParams?.['3'] || {}), I: getOldestRaw(d3) },
              }
            }))
          } else {
            const data = await sensorApi.getMeasurements(Number(fresh.id), { limit: 2000 })
            if (data.length > 0) {
              const oldest = [...data].sort((a: any, b: any) =>
                new Date(a.measured_at).getTime() - new Date(b.measured_at).getTime())[0]
              const rawVal = String(parseFloat(oldest.raw_value ?? oldest.value))
              autoInitValues.current = { '1': rawVal, '2': rawVal, '3': rawVal }
              setForm(prev => ({
                ...prev,
                depthParams: {
                  '1': { ...(prev.depthParams?.['1'] || {}), I: rawVal },
                  '2': { ...(prev.depthParams?.['2'] || {}), I: rawVal },
                  '3': { ...(prev.depthParams?.['3'] || {}), I: rawVal },
                }
              }))
            }
          }
        } catch { }
      }
      setEditTarget(freshSensor)
    } catch (err) {
      showToast('센서 정보 로드 실패')
    }

  }

  const handleFormulaAdd = async () => {
    try {
      const result = await formulaApi.create(formulaForm)
      setFormulas(prev => [...prev, result.formula])
      setFormulaAddOpen(false)
      showToast(`'${formulaForm.name}' 계산식이 추가되었습니다.`)
    } catch (err: any) { showToast(err.message || '추가 실패') }
  }

  const handleAdd = () => {
    const newSensor: UnifiedSensor = {
      id: `GS-${String(Date.now()).slice(-4)}`, ...form,
      status: evaluateStatus(0, form.threshold),
      currentValue: 0, batteryLevel: 100,
      lastUpdated: new Date().toISOString(), readings: [],
    }
    sensorStore.addSensor(newSensor)
    setAddOpen(false)
    showToast(`'${form.name}' 센서가 추가되었습니다.`)
  }

  const handleFormulaEdit = async () => {
    if (!formulaEditTarget) return
    try {
      await formulaApi.update(formulaEditTarget.id, formulaForm)
      setFormulas(prev => prev.map(f => f.id === formulaEditTarget.id ? { ...f, ...formulaForm } : f))
      setFormulaEditTarget(null)
      showToast(`'${formulaForm.name}' 계산식이 수정되었습니다.`)
    } catch (err: any) { showToast(err.message || '수정 실패') }
  }

  const handleEdit = async () => {
    if (!editTarget) return
    try {
      // 모든 센서 공통 — I값: form에 있으면 우선, 없으면 자동 조회값(ref) 사용
      const getI = (depth: string) =>
        form.depthParams?.[depth]?.I || autoInitValues.current[depth] || undefined
  
      await sensorApi.updateInfo(Number(editTarget.id), {
        name: form.name,
        manage_no: form.manageNo,
        unit: form.unit,
        field: form.field,
        formula: form.formula,
        formula_params: form.useDepthParams
          ? {
              '1': { A: Number(form.depthParams?.['1']?.A) || undefined, B: Number(form.depthParams?.['1']?.B) || undefined, C: Number(form.depthParams?.['1']?.C) || undefined, G: Number(form.depthParams?.['1']?.G) || undefined, K: form.depthParams?.['1']?.K ? parseFloat(form.depthParams['1'].K) : undefined, ...(getI('1') ? { I: parseFloat(getI('1')!) } : {}) },
              '2': { A: Number(form.depthParams?.['2']?.A) || undefined, B: Number(form.depthParams?.['2']?.B) || undefined, C: Number(form.depthParams?.['2']?.C) || undefined, G: Number(form.depthParams?.['2']?.G) || undefined, K: form.depthParams?.['2']?.K ? parseFloat(form.depthParams['2'].K) : undefined, ...(getI('2') ? { I: parseFloat(getI('2')!) } : {}) },
              '3': { A: Number(form.depthParams?.['3']?.A) || undefined, B: Number(form.depthParams?.['3']?.B) || undefined, C: Number(form.depthParams?.['3']?.C) || undefined, G: Number(form.depthParams?.['3']?.G) || undefined, K: form.depthParams?.['3']?.K ? parseFloat(form.depthParams['3'].K) : undefined, ...(getI('3') ? { I: parseFloat(getI('3')!) } : {}) },
            }
          : (() => {
              const base: Record<string, any> = {}
              if (form.depthParams?.['1']?.G) base.G = Number(form.depthParams['1'].G)
              if (form.depthParams?.['1']?.K) base.K = Number(form.depthParams['1'].K)
              if (form.depthParams?.['1']?.A) base.A = Number(form.depthParams['1'].A)
              if (form.depthParams?.['1']?.B) base.B = Number(form.depthParams['1'].B)
              if (form.depthParams?.['1']?.C) base.C = Number(form.depthParams['1'].C)
              // 단일 구조도 I값 포함 (모든 센서)
              const iVal = getI('1')
              if (iVal) base.I = parseFloat(iVal)
              return base
            })(),
        formula_id: form.formulaId || undefined,
        level1_upper: form.criteria.level1Upper !== '' ? form.criteria.level1Upper : null,
        level1_lower: form.criteria.level1Lower !== '' ? form.criteria.level1Lower : null,
        level2_upper: form.criteria.level2Upper !== '' ? form.criteria.level2Upper : null,
        level2_lower: form.criteria.level2Lower !== '' ? form.criteria.level2Lower : null,
        criteria_unit: form.criteria.criteriaUnit || null,
        criteria_unit_name: form.criteria.criteriaUnitName || null,
        ...((form.criteria as any).depthCriteria ? { depth_criteria: (form.criteria as any).depthCriteria } : {}),
        install_date: form.installDate || null,
        location_desc: form.location.description || null,
      })
      await sensorApi.updateThreshold(Number(editTarget.id), {
        threshold_normal_max: form.threshold.normalMax !== '' ? form.threshold.normalMax : null,
        threshold_warning_max: form.threshold.warningMax !== '' ? form.threshold.warningMax : null,
        threshold_danger_min: form.threshold.dangerMin !== '' ? form.threshold.dangerMin : null,
      })
      const updated: UnifiedSensor = {
        ...editTarget, ...form,
        status: editTarget.status === 'offline'
          ? 'offline' : evaluateStatus(editTarget.currentValue, form.threshold),
      }
      sensorStore.updateSensor(updated)
      setEditTarget(null)
      showToast(`'${form.name}' 정보가 저장되었습니다.`)
    } catch (err: any) {
      showToast(err.message || '저장 실패')
    }
  }

  const handleFormulaDelete = async (id: number, name: string) => {
    if (!confirm(`'${name}' 계산식을 삭제하시겠습니까?`)) return
    try {
      await formulaApi.delete(id)
      setFormulas(prev => prev.filter(f => f.id !== id))
      showToast(`'${name}' 계산식이 삭제되었습니다.`)
    } catch (err: any) { showToast(err.message || '삭제 실패') }
  }

  const handleRecollectSubmit = async (body: { sensor_id: number; date_from: string; date_to: string; reason: string }) => {
    try {
      await recollectApi.create(body)
      setRecollectOpen(false)
      showToast('재수집 요청이 등록되었습니다. 에이전트 다음 폴링 시 처리됩니다.')
      // 목록 새로고침
      const rList = await recollectApi.getAll()
      setRecollectList(rList)
    } catch (err: any) { showToast(err.message || '요청 실패') }
  }

  const handleRecollectDelete = async (id: number) => {
    if (!confirm('재수집 요청을 취소하시겠습니까?')) return
    try {
      await recollectApi.delete(id)
      setRecollectList(prev => prev.filter(r => r.id !== id))
      showToast('재수집 요청이 취소되었습니다.')
    } catch (err: any) { showToast(err.message || '취소 실패') }
  }

  const handleDelete = () => {
    if (!deleteTarget) return
    sensorStore.deleteSensor(deleteTarget.id)
    showToast(`'${deleteTarget.name}' 센서가 삭제되었습니다.`)
    setDeleteTarget(null)
  }

  const filtered = sensors.filter(s => {
    const q = search.toLowerCase()
    return (
      (s.id.toLowerCase().includes(q) || s.name.toLowerCase().includes(q) || s.siteName.toLowerCase().includes(q)) &&
      (statusFilter === 'all' || s.status === statusFilter) &&
      (siteFilter === 'all' || s.siteId === siteFilter)
    )
  })

  return (
    <div className="flex-1 overflow-y-auto bg-surface-page">

      {/* 헤더 */}
      <div className="border-b border-line bg-surface-card/90 px-4 md:px-6 py-3 md:sticky md:top-0 md:z-10 backdrop-blur-md">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h1 className="text-[15px] font-semibold text-ink">센서 관리</h1>
            <p className="font-mono text-xs text-ink-muted">등록된 센서 {sensors.length}개</p>
          </div>
          <div className="flex gap-1 rounded-lg border border-line bg-surface-subtle p-1">
            {(['monitor','manage','formula','recollect'] as const).map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                className={['rounded-md px-4 py-1.5 font-mono text-xs font-medium transition-all',
                  activeTab === tab ? 'bg-surface-card text-brand shadow-card' : 'text-ink-muted hover:text-ink-sub'].join(' ')}>
                {tab === 'monitor' ? '모니터링' : tab === 'manage' ? '센서 정의' : tab === 'formula' ? '계산식 관리' : '🔄 재수집'}
              </button>
            ))}
          </div>
          {activeTab === 'manage' ? (
            canManage && <button onClick={openAdd} className="flex items-center gap-1.5 rounded-lg bg-brand px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-brand-hover">+ 센서 추가</button>
          ) : activeTab === 'formula' ? (
            canManage && <button onClick={openFormulaAdd} className="flex items-center gap-1.5 rounded-lg bg-brand px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-brand-hover">+ 계산식 추가</button>
          ) : activeTab === 'recollect' ? (
            canManage && <button onClick={() => setRecollectOpen(true)} className="flex items-center gap-1.5 rounded-lg bg-brand px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-brand-hover">+ 재수집 요청</button>
          ) : (
            <div className="flex items-center gap-2">
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-ink-muted">⌕</span>
                <input type="search" placeholder="센서 ID, 이름 검색..." value={search} onChange={e => setSearch(e.target.value)}
                  className="w-full max-w-[180px] rounded-lg border border-line bg-surface-card py-1.5 pl-7 pr-3 font-mono text-xs text-ink outline-none placeholder:text-ink-muted focus:border-brand/50 focus:ring-1 focus:ring-brand/20" />
              </div>
              <select value={siteFilter} onChange={e => setSite(e.target.value)}
                className="rounded-lg border border-line bg-surface-card px-3 py-1.5 font-mono text-xs text-ink outline-none focus:border-brand/50">
                <option value="all">모든 현장</option>
                <option value="site-main">계측 현장</option>
              </select>
            </div>
          )}
        </div>

        {activeTab === 'monitor' && (
          <>
            {sensors.some(s => isDataDelayed(s.lastUpdated)) && (
              <div className="mb-3 rounded-xl border border-sensor-warningborder bg-sensor-warningbg px-5 py-4">
                <p className="flex items-center gap-2 font-semibold text-sensor-warningtext">
                  ⚠ 데이터 수신 지연 감지
                </p>
                <p className="mt-1 text-sm text-sensor-warningtext/80">
                  {sensors.filter(s => isDataDelayed(s.lastUpdated)).map(s => s.name || s.nameAbbr).join(', ')} 센서에서 2시간 이상 데이터가 수신되지 않고 있습니다.
                </p>
              </div>
            )}
            <div className="mt-3 flex gap-1 overflow-x-auto pb-1 scrollbar-none">
              {statusOptions.map(opt => (
                <button key={opt.value} onClick={() => setStatus(opt.value)}
                  className={['rounded-full border px-3 py-1 font-mono text-[11px] font-medium transition-colors',
                    statusFilter === opt.value ? tabActiveClass[opt.value] : 'border-line text-ink-muted hover:border-line-strong hover:text-ink-sub'].join(' ')}>
                  {opt.label}
                  {opt.value !== 'all' && <span className="ml-1 opacity-60">{sensors.filter(s => s.status === opt.value).length}</span>}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {/* ── 모니터링 탭 ── */}
      {activeTab === 'monitor' && (
        <div className="p-6">
          <div className="geo-card overflow-hidden">
            <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-line bg-surface-subtle">
                 {[['센서명','text-left'],['현장','text-left'],['관련분야','text-left'],['현재값','text-right'],['임계 W/D','text-right'],['상태','text-center'],['업데이트','text-left'],['QR','text-center']].map(([th,a]) => (
                    <th key={th} className={`px-4 py-3 font-mono text-[10px] font-semibold uppercase tracking-wide text-ink-muted ${a}`}>{th}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {filtered.length === 0 ? (
                  <tr><td colSpan={8} className="px-4 py-10 text-center text-sm text-ink-muted">조건에 맞는 센서가 없습니다.</td></tr>
                ) : filtered.map(sensor => {
                  const { thresholdWarning, thresholdDanger } = getThresholds(sensor)
                  return (
                    <tr key={sensor.id} className={`cursor-pointer transition-colors ${rowBgClass[sensor.status]}`}
                      onClick={() => router.push(`/sensors/${sensor.id}`)}>
                      <td className="px-4 py-3">
                        {/* 관리번호 클릭 → 상세 페이지 */}
                        <Link href={`/sensors/${sensor.id}`}
                          className="font-mono text-sm font-semibold text-brand hover:underline">
                          {sensor.name || sensor.id}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-sm text-ink-sub">{sensor.siteName}</td>
                      <td className="px-4 py-3">
                        <span className="inline-block whitespace-nowrap rounded-full border border-brand/30 bg-brand/10 px-2 py-0.5 font-mono text-[11px] text-brand">{sensor.field}</span>
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-sm font-medium text-ink">
                        {sensor.status === 'offline' ? <span className="text-ink-muted">—</span> : `${sensor.currentValue} ${sensor.unit}`}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-[11px]">
                        <span className="text-sensor-warningtext">{thresholdWarning}</span>
                        <span className="text-ink-muted"> / </span>
                        <span className="text-sensor-dangertext">{thresholdDanger}</span>
                        <span className="ml-0.5 text-ink-muted">{sensor.unit}</span>
                      </td>
                      <td className="px-4 py-3 text-center"><StatusBadge status={sensor.status} size="sm" /></td>
                      <td className="px-4 py-3 font-mono text-[11px]">
                        {isDataDelayed(sensor.lastUpdated) ? (
                          <span className="flex items-center gap-1 text-sensor-warningtext font-semibold">
                            ⚠ {getRelativeTime(sensor.lastUpdated)}
                          </span>
                        ) : (
                          <span className="text-ink-muted">{getRelativeTime(sensor.lastUpdated)}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center" onClick={e => e.stopPropagation()}>
                        <Link href={`/qr/${sensor.id}`}
                          className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-line text-xs text-ink-muted transition-colors hover:border-brand/40 hover:bg-brand/10 hover:text-brand"
                          title="QR 코드 보기">⊞</Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            </div>
          </div>
        </div>
      )}

      {/* ── 센서 정의 탭 ── */}
      {activeTab === 'manage' && (
        <div className="p-6">
          {sensors.length === 0 ? (
            <div className="geo-card py-16 text-center">
              <p className="text-sm text-ink-muted">등록된 센서가 없습니다.</p>
              <button onClick={openAdd} className="mt-3 font-mono text-xs text-brand hover:underline">+ 첫 번째 센서 추가하기</button>
            </div>
          ) : (
            <div className="geo-card overflow-hidden">
              <div className="overflow-x-auto">
              <table className="w-full min-w-[580px] text-sm">
                <thead>
                  <tr className="border-b border-line bg-surface-subtle">
                    {[['센서명','text-left'],['현장 / 설치위치','text-left'],['관련분야','text-left'],['단위','text-left'],['임계값','text-left'],['설치일','text-left'],['','text-right']].map(([th,a]) => (
                      <th key={th} className={`px-4 py-3 font-mono text-[10px] font-semibold uppercase tracking-wide text-ink-muted ${a}`}>{th}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {sensors.map(s => (
                    <tr key={s.id} className="transition-colors hover:bg-surface-subtle">
                      <td className="px-4 py-3">
                      <Link href={`/sensors/${s.id}`}
                        className="font-mono text-sm font-semibold text-brand hover:underline">
                        {s.name || s.id}
                      </Link>
                      {s.nameAbbr && <p className="font-mono text-[10px] text-ink-muted">{s.nameAbbr}</p>}
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm text-ink-sub">{s.siteName}</p>
                        <p className="font-mono text-[10px] text-ink-muted">{s.location.description || '—'}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-block whitespace-nowrap rounded-full border border-brand/30 bg-brand/10 px-2 py-0.5 font-mono text-[11px] text-brand">{s.field}</span>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-ink-sub">{s.unit || '—'}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1.5">
                          {s.threshold.normalMax  !== '' && <span className="rounded-full border border-sensor-normalborder  bg-sensor-normalbg  px-2 py-0.5 font-mono text-[10px] text-sensor-normaltext">정상 ≤{s.threshold.normalMax}</span>}
                          {s.threshold.warningMax !== '' && <span className="rounded-full border border-sensor-warningborder bg-sensor-warningbg px-2 py-0.5 font-mono text-[10px] text-sensor-warningtext">주의 ≤{s.threshold.warningMax}</span>}
                          {s.threshold.dangerMin  !== '' && <span className="rounded-full border border-sensor-dangerborder  bg-sensor-dangerbg  px-2 py-0.5 font-mono text-[10px] text-sensor-dangertext">위험 ≥{s.threshold.dangerMin}</span>}
                          {s.threshold.normalMax === '' && s.threshold.dangerMin === '' && <span className="font-mono text-[10px] text-ink-muted">미설정</span>}
                        </div>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-ink-muted">
                        {s.installDate
                          ? new Date(s.installDate).toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' })
                          : '—'}
                      </td>
                      <td className="px-4 py-3 text-right">
                      {canManage && (
                        <>
                          <button onClick={() => openEdit(s)} className="mr-3 font-mono text-xs text-ink-muted transition-colors hover:text-brand">편집</button>
                          <button onClick={() => setDeleteTarget(s)} className="font-mono text-xs text-ink-muted transition-colors hover:text-sensor-danger">삭제</button>
                        </>
                      )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── 계산식 관리 탭 ── */}
      {activeTab === 'formula' && (
        <div className="p-6">
          <div className="geo-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[500px] text-sm">
                <thead>
                  <tr className="border-b border-line bg-surface-subtle">
                    {[['이름','text-left'],['계산식','text-left'],['변수 설명','text-left'],['설명','text-left'],['','text-right']].map(([th,a]) => (
                      <th key={th} className={`px-4 py-3 font-mono text-[10px] font-semibold uppercase tracking-wide text-ink-muted ${a}`}>{th}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {formulas.map(f => (
                    <tr key={f.id} className="transition-colors hover:bg-surface-subtle">
                      <td className="px-4 py-3 font-medium text-ink">{f.name}</td>
                      <td className="px-4 py-3 font-mono text-xs text-brand">{f.expression}</td>
                      <td className="px-4 py-3 text-xs text-ink-muted">
                        {f.variables
                          ? Object.entries(f.variables).map(([k, v]) => `${k}: ${v}`).join(' / ')
                          : '—'}
                      </td>
                      <td className="px-4 py-3 text-xs text-ink-muted">{f.description || '—'}</td>
                      <td className="px-4 py-3 text-right">
                        {canManage && (
                          <>
                            <button onClick={() => { setFormulaForm({ name: f.name, expression: f.expression, description: f.description || '' }); setFormulaEditTarget(f) }}
                              className="mr-3 font-mono text-xs text-ink-muted hover:text-brand">편집</button>
                            <button onClick={() => handleFormulaDelete(f.id, f.name)}
                              className="font-mono text-xs text-ink-muted hover:text-sensor-danger">삭제</button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── 재수집 탭 ── */}
      {activeTab === 'recollect' && (
        <div className="p-6 space-y-4">

          {/* 에이전트 상태 카드 */}
          <div className="geo-card p-4">
            <h2 className="mb-3 text-sm font-semibold text-ink flex items-center gap-2">
              <span className="h-3 w-0.5 rounded-sm bg-brand" />에이전트 상태
            </h2>
            {recollectLoading ? (
              <p className="font-mono text-xs text-ink-muted">불러오는 중...</p>
            ) : agentStatus.length === 0 ? (
              <div className="flex items-center gap-3 rounded-lg border border-sensor-offlineborder bg-sensor-offlinebg px-4 py-3">
                <span className="h-2.5 w-2.5 rounded-full bg-sensor-offline" />
                <div>
                  <p className="font-mono text-sm font-semibold text-sensor-offlinetext">에이전트 오프라인</p>
                  <p className="font-mono text-[10px] text-ink-muted">회사 PC 에이전트가 아직 heartbeat를 보내지 않았습니다.</p>
                </div>
              </div>
            ) : agentStatus.map((a: any) => {
              const lastSeen  = new Date(a.last_seen)
              const diffMin   = Math.floor((Date.now() - lastSeen.getTime()) / 60000)
              const isOnline  = diffMin < 90   // 90분 이내면 온라인 간주
              return (
                <div key={a.agent_id} className={[
                  'flex items-center justify-between rounded-lg border px-4 py-3',
                  isOnline
                    ? 'border-sensor-normalborder bg-sensor-normalbg'
                    : 'border-sensor-offlineborder bg-sensor-offlinebg',
                ].join(' ')}>
                  <div className="flex items-center gap-3">
                    <span className={['h-2.5 w-2.5 rounded-full', isOnline ? 'bg-sensor-normal animate-pulse' : 'bg-sensor-offline'].join(' ')} />
                    <div>
                      <p className={['font-mono text-sm font-semibold', isOnline ? 'text-sensor-normaltext' : 'text-sensor-offlinetext'].join(' ')}>
                        {a.agent_id} — {isOnline ? '온라인' : '오프라인'}
                      </p>
                      <p className="font-mono text-[10px] text-ink-muted">
                        마지막 응답: {diffMin < 60 ? `${diffMin}분 전` : `${Math.floor(diffMin / 60)}시간 ${diffMin % 60}분 전`}
                        {a.info?.version ? ` · v${a.info.version}` : ''}
                      </p>
                    </div>
                  </div>
                  <span className={[
                    'rounded-full border px-2.5 py-0.5 font-mono text-[11px]',
                    isOnline
                      ? 'border-sensor-normalborder text-sensor-normaltext'
                      : 'border-sensor-offlineborder text-sensor-offlinetext',
                  ].join(' ')}>{isOnline ? '정상' : '연결 끊김'}</span>
                </div>
              )
            })}
          </div>

          {/* 재수집 요청 목록 */}
          <div className="geo-card overflow-hidden">
            <div className="flex items-center justify-between border-b border-line px-5 py-3">
              <div>
                <h2 className="text-sm font-semibold text-ink">재수집 요청 이력</h2>
                <p className="font-mono text-[10px] text-ink-muted">최근 100건 · 에이전트 다음 폴링 시 pending 건 처리</p>
              </div>
              <button onClick={async () => {
                setRecollectLoading(true)
                try {
                  const [rList, aStatus] = await Promise.all([recollectApi.getAll(), agentApi.getStatus()])
                  setRecollectList(rList); setAgentStatus(aStatus)
                } catch {}
                setRecollectLoading(false)
              }} className="rounded-md border border-line px-3 py-1.5 font-mono text-xs text-ink-muted transition-colors hover:bg-surface-subtle hover:text-ink">
                ↻ 새로고침
              </button>
            </div>

            {recollectLoading ? (
              <div className="py-10 text-center font-mono text-sm text-ink-muted">불러오는 중...</div>
            ) : recollectList.length === 0 ? (
              <div className="py-12 text-center">
                <p className="font-mono text-sm text-ink-muted">등록된 재수집 요청이 없습니다.</p>
                {canManage && (
                  <button onClick={() => setRecollectOpen(true)}
                    className="mt-3 font-mono text-xs text-brand hover:underline">
                    + 첫 번째 재수집 요청 등록하기
                  </button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] text-sm">
                  <thead>
                    <tr className="border-b border-line bg-surface-subtle">
                      {[['#','text-left'],['센서','text-left'],['기간','text-left'],['사유','text-left'],['상태','text-center'],['요청자','text-left'],['요청시각','text-left'],['','text-right']].map(([th,a]) => (
                        <th key={th} className={`px-4 py-3 font-mono text-[10px] font-semibold uppercase tracking-wide text-ink-muted ${a}`}>{th}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {recollectList.map((r: any) => {
                      const statusColor =
                        r.status === 'pending' ? 'border-sensor-warningborder bg-sensor-warningbg text-sensor-warningtext' :
                        r.status === 'done'    ? 'border-sensor-normalborder  bg-sensor-normalbg  text-sensor-normaltext'  :
                        'border-line text-ink-muted'
                      return (
                        <tr key={r.id} className="transition-colors hover:bg-surface-subtle">
                          <td className="px-4 py-3 font-mono text-xs text-ink-muted">{r.id}</td>
                          <td className="px-4 py-3">
                            <p className="font-mono text-xs font-semibold text-ink">{r.manage_no || r.sensor_code}</p>
                            <p className="font-mono text-[10px] text-ink-muted">{r.sensor_name}</p>
                          </td>
                          <td className="px-4 py-3 font-mono text-xs text-ink-muted">
                            {r.date_from ? `${r.date_from?.slice(0,10)} ~ ${r.date_to?.slice(0,10)}` : '전체'}
                          </td>
                          <td className="px-4 py-3 text-xs text-ink-sub">{r.reason || '—'}</td>
                          <td className="px-4 py-3 text-center">
                            <span className={`rounded-full border px-2.5 py-0.5 font-mono text-[11px] ${statusColor}`}>
                              {r.status === 'pending' ? '⏳ 대기중' : r.status === 'done' ? '✓ 완료' : r.status}
                            </span>
                            {r.result && r.result !== 'success' && (
                              <p className="mt-0.5 font-mono text-[10px] text-sensor-dangertext">{r.result}</p>
                            )}
                          </td>
                          <td className="px-4 py-3 font-mono text-xs text-ink-muted">{r.requested_by_name || '—'}</td>
                          <td className="px-4 py-3 font-mono text-[11px] text-ink-muted">
                            {new Date(r.created_at).toLocaleString('ko-KR', { month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit' })}
                          </td>
                          <td className="px-4 py-3 text-right">
                            {canManage && r.status === 'pending' && (
                              <button onClick={() => handleRecollectDelete(r.id)}
                                className="font-mono text-xs text-ink-muted transition-colors hover:text-sensor-danger">취소</button>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── 토스트 ── */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 animate-fade-in-up rounded-xl border border-line bg-ink px-5 py-3 font-mono text-sm text-white shadow-cardhover">
          {toast}
        </div>
      )}

      {addOpen && <SensorModal mode="add" form={form} onChange={setForm} onSubmit={handleAdd} onClose={() => setAddOpen(false)} formulas={formulas} sites={sites} />}
      {editTarget && <SensorModal mode="edit" form={form} onChange={setForm} onSubmit={handleEdit} onClose={() => setEditTarget(null)} formulas={formulas} sites={sites} sensorPositions={editSensorPositions} sensorId={editTarget.id} />}
      {deleteTarget && <DeleteModal sensorName={deleteTarget.name} onConfirm={handleDelete} onClose={() => setDeleteTarget(null)} />}
      {formulaAddOpen && <FormulaModal mode="add" form={formulaForm} onChange={setFormulaForm} onSubmit={handleFormulaAdd} onClose={() => setFormulaAddOpen(false)} />}
      {formulaEditTarget && <FormulaModal mode="edit" form={formulaForm} onChange={setFormulaForm} onSubmit={handleFormulaEdit} onClose={() => setFormulaEditTarget(null)} />}
      {recollectOpen && <RecollectModal sensors={sensors} onSubmit={handleRecollectSubmit} onClose={() => setRecollectOpen(false)} />}
    </div>
  )
}