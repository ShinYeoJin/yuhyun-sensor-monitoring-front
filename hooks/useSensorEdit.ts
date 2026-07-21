import React, { useState, useRef } from 'react'
import type { UnifiedSensor, SensorForm } from '@/types'
import { sensorApi } from '@/lib/api'

export function useSensorEdit(
  setForm: React.Dispatch<React.SetStateAction<SensorForm>>,
  formulas: any[],
  showToast: (msg: string) => void,
) {
  const [editTarget, setEditTarget] = useState<UnifiedSensor | null>(null)
  const [editSensorPositions, setEditSensorPositions] = useState<Record<string, any>>({})
  const autoInitValues = useRef<Record<string, string>>({})

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
              return (base as any).A !== undefined ? '(A * R^2 + B * R + C) * K' : 'G * (I - R) * K'
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
            const found = formulas.find((f: any) => f.id === fid)
            if (found) return found.expression
          }
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
            autoInitValues.current = {
              '1': getOldestRaw(d1),
              '2': getOldestRaw(d2),
              '3': getOldestRaw(d3),
            }
            setForm((prev: SensorForm) => ({
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
              setForm((prev: SensorForm) => ({
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
    } catch {
      showToast('센서 정보 로드 실패')
    }
  }

  const closeEdit = () => setEditTarget(null)

  return { editTarget, editSensorPositions, autoInitValues, openEdit, closeEdit }
}
