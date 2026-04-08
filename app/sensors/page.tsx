'use client'

import { useState } from 'react'
import Link from 'next/link'
import { getRelativeTime, getThresholds } from '@/lib/mock-data'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { sensorStore, useSensorStore, evaluateStatus } from '@/lib/sensor-store'
import { sensorApi } from '@/lib/api'
import { useEffect } from 'react'
import type {
  SensorStatus, UnifiedSensor, SensorField, MeasureMethod, Formula,
  ThresholdRange, SensorGroup, ActionAfterMeasure, ActionBeforeMeasure,
} from '@/types'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'


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

// ─── 선택 옵션 ────────────────────────────────────────────────────────────────
const FIELDS: SensorField[] = ['공통','터널','연약지반','흙막이','교량','항만','사면']
const MEASURE_METHODS: MeasureMethod[] = [
  '해당없음','전류(4~20mA)','저항(온도)',
  '전압(0~5V)','전압(0~10V)','전압(+-5V)','전압(+-10V)',
  '경사계 A축','경사계 B축',
  'VW A(450~1125Hz)(22222~8888*10e-7)','VW B(800~2000Hz)(12500~5000*10e-7)',
  'VW C(1400~3500Hz)(7143~2857*10e-7)','VW D(2300~6000Hz)(4347~1666*10e-7)',
  'PT100','RTD',
]
const FORMULAS: Formula[] = [
  '(A*X+B)','(A*X+B-(A*I+B))','(A*X+B-(A*I+B)-(Tco*(Tc-Ti)))',
  '(A*X^2+B*X+C)','(A*X^2+B*X+C-(A*I^2+B*I+C))',
  '(A*X^2+B*X+C-(A*I^2+B*I+C)-(Tco*(Tc-Ti)))',
  '(A*10^9*(1/X^2-1/I^2))','(A*X^5+B*X^4+C*X^3+D*X^2+E*X+F)',
]
const GROUPS: { value: SensorGroup; label: string }[] = [
  { value: '', label: '없음' },
  { value: '자동화모니터링 계측시스템-가시설 지하수위 계측(관리용)',   label: '지하수위 계측(관리용)'   },
  { value: '자동화모니터링 계측시스템-가시설 지하수위 계측(보고서용)', label: '지하수위 계측(보고서용)' },
]
const ACTION_AFTER:  ActionAfterMeasure[]  = ['저장','송신','저장송신']
const ACTION_BEFORE: ActionBeforeMeasure[] = [
  '자동','1초 대기 후 동작','2초 대기 후 동작','3초 대기 후 동작',
  '4초 대기 후 동작','5초 대기 후 동작','예비 1','예비 2','예비 3','예비 4',
]

// ─── 빈 폼 ────────────────────────────────────────────────────────────────────
type SensorForm = Omit<UnifiedSensor, 'id' | 'status' | 'currentValue' | 'batteryLevel' | 'lastUpdated' | 'readings'>

const emptyForm: SensorForm = {
  manageNo: '', field: '공통', measureMethod: '해당없음', formula: '(A*X+B)',
  group: '',
  name: '', nameEn: '', nameAbbr: '', unit: '', unitName: '',
  description: '', combination: '', decimalPoint: '', pointerInfo: '', remark: '',
  threshold: { normalMax: '', warningMax: '', dangerMin: '' },
  operation: { measureCycle: '01:00', actionAfterMeasure: '저장송신', actionBeforeMeasure: '자동' },
  formulaParams: { coeffA: '', coeffB: '', coeffC: '', coeffD: '', coeffE: '', initVal: '', currentTemp: '', tempCoeff: '', initTemp: '', extRef: '' },
  criteria: { level1Upper: '', level1Lower: '', level2Upper: '', level2Lower: '', criteriaUnit: '', criteriaUnitName: '', noAlarm: false, noSms: false },
  siteId: '', siteName: '', installDate: '', location: { lat: 0, lng: 0, description: '' },
}

// ─── 스타일 ───────────────────────────────────────────────────────────────────
const inputCls  = 'w-full rounded-lg border border-line bg-surface-subtle px-3 py-2 text-sm text-ink outline-none transition-colors placeholder:text-ink-muted focus:border-brand/50 focus:ring-2 focus:ring-brand/10'
const selectCls = 'w-full rounded-lg border border-line bg-surface-subtle px-3 py-2 text-sm text-ink outline-none transition-colors focus:border-brand/50 focus:ring-2 focus:ring-brand/10'
const labelCls  = 'mb-1.5 block font-mono text-[10px] font-semibold uppercase tracking-wider text-ink-muted'
const sectionTitleCls = 'flex items-center gap-2 mb-3'

function ModalSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className={sectionTitleCls}>
        <span className="h-3 w-0.5 rounded-sm bg-brand" />
        <p className="font-mono text-[10px] font-semibold uppercase tracking-widest text-ink-muted">{title}</p>
      </div>
      {children}
    </div>
  )
}

// ─── 임계값 입력 ──────────────────────────────────────────────────────────────
function ThresholdSection({ threshold, unit, onChange }: {
  threshold: ThresholdRange; unit: string; onChange: (t: ThresholdRange) => void
}) {
  const set = (key: keyof ThresholdRange, val: string) =>
    onChange({ ...threshold, [key]: val === '' ? '' : Number(val) })
  const tinput = (color: string) =>
    `w-full rounded-lg border px-3 py-2 text-sm outline-none transition-colors placeholder:text-ink-muted focus:ring-2 ${color}`
  return (
    <div>
      <div className="mb-3 flex h-2 overflow-hidden rounded-full bg-surface-muted">
        <div className="flex-1 bg-sensor-normal/40" /><div className="w-px bg-white" />
        <div className="flex-1 bg-sensor-warning/40" /><div className="w-px bg-white" />
        <div className="flex-1 bg-sensor-danger/40" />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className={`${labelCls} text-sensor-normaltext`}>정상 최대값{unit ? ` (${unit})` : ''}</label>
          <input type="number" value={threshold.normalMax} onChange={e => set('normalMax', e.target.value)} placeholder="예: 4.9"
            className={tinput('border-sensor-normalborder bg-sensor-normalbg text-ink focus:border-sensor-normal focus:ring-sensor-normal/20')} />
          <p className="mt-1 font-mono text-[10px] text-sensor-normaltext">이하 → 정상</p>
        </div>
        <div>
          <label className={`${labelCls} text-sensor-warningtext`}>주의 최대값{unit ? ` (${unit})` : ''}</label>
          <input type="number" value={threshold.warningMax} onChange={e => set('warningMax', e.target.value)} placeholder="예: 7.9"
            className={tinput('border-sensor-warningborder bg-sensor-warningbg text-ink focus:border-sensor-warning focus:ring-sensor-warning/20')} />
          <p className="mt-1 font-mono text-[10px] text-sensor-warningtext">초과~이하 → 주의</p>
        </div>
        <div>
          <label className={`${labelCls} text-sensor-dangertext`}>위험 최솟값{unit ? ` (${unit})` : ''}</label>
          <input type="number" value={threshold.dangerMin} onChange={e => set('dangerMin', e.target.value)} placeholder="예: 8.0"
            className={tinput('border-sensor-dangerborder bg-sensor-dangerbg text-ink focus:border-sensor-danger focus:ring-sensor-danger/20')} />
          <p className="mt-1 font-mono text-[10px] text-sensor-dangertext">이상 → 위험</p>
        </div>
      </div>
      {(threshold.normalMax !== '' || threshold.warningMax !== '' || threshold.dangerMin !== '') && (
        <div className="mt-3 flex flex-wrap gap-2">
          {threshold.normalMax  !== '' && <span className="rounded-full border border-sensor-normalborder  bg-sensor-normalbg  px-2.5 py-1 font-mono text-[11px] text-sensor-normaltext">정상 ≤{threshold.normalMax} {unit}</span>}
          {threshold.warningMax !== '' && threshold.normalMax !== '' && <span className="rounded-full border border-sensor-warningborder bg-sensor-warningbg px-2.5 py-1 font-mono text-[11px] text-sensor-warningtext">주의 {threshold.normalMax}~{threshold.warningMax} {unit}</span>}
          {threshold.dangerMin  !== '' && <span className="rounded-full border border-sensor-dangerborder  bg-sensor-dangerbg  px-2.5 py-1 font-mono text-[11px] text-sensor-dangertext">위험 ≥{threshold.dangerMin} {unit}</span>}
        </div>
      )}
    </div>
  )
}

// ─── 센서 추가/편집 모달 ──────────────────────────────────────────────────────
function SensorModal({ mode, form, onChange, onSubmit, onClose }: {
  mode: 'add' | 'edit'; form: SensorForm
  onChange: (f: SensorForm) => void; onSubmit: () => void; onClose: () => void
}) {
  const isValid = form.name.trim() !== '' && form.siteId !== ''
  const set = (key: keyof SensorForm, val: string) => onChange({ ...form, [key]: val })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/30 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="geo-card flex w-full max-w-2xl animate-fade-in-up flex-col" style={{ maxHeight: '92vh' }}
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-line px-6 py-4">
          <h2 className="text-sm font-semibold text-ink">{mode === 'add' ? '센서 추가' : '센서 편집'}</h2>
          <button onClick={onClose} className="rounded-md p-1 text-ink-muted transition-colors hover:bg-surface-subtle hover:text-ink">✕</button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">

          {/* 관리번호 + 구간-그룹 */}
          <ModalSection title="기본 식별">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className={labelCls}>관리번호</label>
                <input type="text" value={form.manageNo} onChange={e => set('manageNo', e.target.value)}
                  placeholder="예: MN-001" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>구간-그룹</label>
                <select value={form.group} onChange={e => set('group', e.target.value)} className={selectCls}>
                  {GROUPS.map(g => <option key={g.value} value={g.value}>{g.label}</option>)}
                </select>
              </div>
            </div>
          </ModalSection>

          {/* 선택 항목 */}
          <ModalSection title="선택 항목">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <label className={labelCls}>관련분야 *</label>
                <div className="flex flex-wrap gap-1.5">
                  {FIELDS.map(f => (
                    <button key={f} type="button" onClick={() => set('field', f)}
                      className={['rounded-full border px-2.5 py-1 font-mono text-[11px] font-medium transition-all',
                        form.field === f ? 'border-brand/40 bg-brand/10 text-brand' : 'border-line text-ink-muted hover:border-line-strong hover:text-ink-sub'].join(' ')}>
                      {form.field === f && '✓ '}{f}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className={labelCls}>측정방법 *</label>
                <select value={form.measureMethod} onChange={e => set('measureMethod', e.target.value)} className={selectCls}>
                  {MEASURE_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>계산식 *</label>
                <select value={form.formula} onChange={e => set('formula', e.target.value)} className={selectCls}>
                  {FORMULAS.map(f => <option key={f} value={f}>{f}</option>)}
                </select>
              </div>
            </div>
          </ModalSection>

          {/* 기본 정보 */}
          <ModalSection title="기본 정보">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <label className={labelCls}>센서명 *</label>
                <input type="text" value={form.name} onChange={e => set('name', e.target.value)} placeholder="경사계 A-1" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>영문명</label>
                <input type="text" value={form.nameEn} onChange={e => set('nameEn', e.target.value)} placeholder="Inclinometer A-1" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>센서명 약어</label>
                <input type="text" value={form.nameAbbr} onChange={e => set('nameAbbr', e.target.value)} placeholder="INC-A1" className={inputCls} />
              </div>
            </div>
          </ModalSection>

          {/* 측정 단위 */}
          <ModalSection title="측정 단위">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>측정단위</label>
                <input type="text" value={form.unit} onChange={e => set('unit', e.target.value)} placeholder="mm, °, kN/m² ..." className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>단위명</label>
                <input type="text" value={form.unitName} onChange={e => set('unitName', e.target.value)} placeholder="밀리미터, 도(degree) ..." className={inputCls} />
              </div>
            </div>
          </ModalSection>

          {/* 임계값 */}
          <ModalSection title="임계값 설정 — 알람 기준">
            <ThresholdSection threshold={form.threshold} unit={form.unit} onChange={t => onChange({ ...form, threshold: t })} />
          </ModalSection>

          {/* 동작 설정 */}
          <ModalSection title="동작 설정">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <label className={labelCls}>측정주기</label>
                <input type="text" value={form.operation.measureCycle}
                  onChange={e => onChange({ ...form, operation: { ...form.operation, measureCycle: e.target.value } })}
                  placeholder="01:00" className={inputCls} />
                <p className="mt-1 font-mono text-[10px] text-ink-muted">HH:MM 형식</p>
              </div>
              <div>
                <label className={labelCls}>측정 후 동작</label>
                <div className="flex gap-1.5">
                  {ACTION_AFTER.map(a => (
                    <button key={a} type="button"
                      onClick={() => onChange({ ...form, operation: { ...form.operation, actionAfterMeasure: a } })}
                      className={['flex-1 rounded-lg border py-2 font-mono text-[11px] font-medium transition-all text-center',
                        form.operation.actionAfterMeasure === a
                          ? 'border-brand/40 bg-brand/10 text-brand'
                          : 'border-line text-ink-muted hover:border-line-strong'].join(' ')}>
                      {a}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className={labelCls}>측정 전 동작</label>
                <select value={form.operation.actionBeforeMeasure}
                  onChange={e => onChange({ ...form, operation: { ...form.operation, actionBeforeMeasure: e.target.value as ActionBeforeMeasure } })}
                  className={selectCls}>
                  {ACTION_BEFORE.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
              </div>
            </div>
          </ModalSection>

          {/* 수식 및 파라미터 설정 */}
          <ModalSection title="수식 및 파라미터 설정">
            <div className="mb-2 rounded-lg border border-line bg-surface-subtle px-3 py-2">
              <p className="font-mono text-[10px] text-ink-muted">선택된 계산식: <span className="text-brand">{form.formula}</span></p>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
              {[
                { key: 'coeffA', label: 'A 계수' }, { key: 'coeffB', label: 'B 계수' },
                { key: 'coeffC', label: 'C 계수' }, { key: 'coeffD', label: 'D 계수' },
                { key: 'coeffE', label: 'E 계수' },
              ].map(({ key, label }) => (
                <div key={key}>
                  <label className={labelCls}>{label}</label>
                  <input type="text" value={form.formulaParams[key as keyof typeof form.formulaParams] as string}
                    onChange={e => onChange({ ...form, formulaParams: { ...form.formulaParams, [key]: e.target.value } })}
                    placeholder="0.000" className={inputCls} />
                </div>
              ))}
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-5">
              {[
                { key: 'initVal',     label: '초기값 (I)'   },
                { key: 'currentTemp', label: '현재 온도 (Tc)' },
                { key: 'tempCoeff',   label: '온도계수 (Tco)' },
                { key: 'initTemp',    label: '초기온도 (Ti)'  },
                { key: 'extRef',      label: '외부참조 (R)'  },
              ].map(({ key, label }) => (
                <div key={key}>
                  <label className={labelCls}>{label}</label>
                  <input type="text" value={form.formulaParams[key as keyof typeof form.formulaParams] as string}
                    onChange={e => onChange({ ...form, formulaParams: { ...form.formulaParams, [key]: e.target.value } })}
                    placeholder="0.000" className={inputCls} />
                </div>
              ))}
            </div>
          </ModalSection>

          {/* 관리 기준 */}
          <ModalSection title="관리 기준">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div>
                <label className={`${labelCls} text-sensor-warningtext`}>1차 기준 상한값</label>
                <input type="text" value={form.criteria.level1Upper}
                  onChange={e => onChange({ ...form, criteria: { ...form.criteria, level1Upper: e.target.value } })}
                  placeholder="0.000" className={inputCls} />
              </div>
              <div>
                <label className={`${labelCls} text-sensor-warningtext`}>1차 기준 하한값</label>
                <input type="text" value={form.criteria.level1Lower}
                  onChange={e => onChange({ ...form, criteria: { ...form.criteria, level1Lower: e.target.value } })}
                  placeholder="0.000" className={inputCls} />
              </div>
              <div>
                <label className={`${labelCls} text-sensor-dangertext`}>2차 기준 상한값</label>
                <input type="text" value={form.criteria.level2Upper}
                  onChange={e => onChange({ ...form, criteria: { ...form.criteria, level2Upper: e.target.value } })}
                  placeholder="0.000" className={inputCls} />
              </div>
              <div>
                <label className={`${labelCls} text-sensor-dangertext`}>2차 기준 하한값</label>
                <input type="text" value={form.criteria.level2Lower}
                  onChange={e => onChange({ ...form, criteria: { ...form.criteria, level2Lower: e.target.value } })}
                  placeholder="0.000" className={inputCls} />
              </div>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>단위</label>
                <input type="text" value={form.criteria.criteriaUnit}
                  onChange={e => onChange({ ...form, criteria: { ...form.criteria, criteriaUnit: e.target.value } })}
                  placeholder="mm, ° ..." className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>단위명</label>
                <input type="text" value={form.criteria.criteriaUnitName}
                  onChange={e => onChange({ ...form, criteria: { ...form.criteria, criteriaUnitName: e.target.value } })}
                  placeholder="밀리미터 ..." className={inputCls} />
              </div>
            </div>
            <div className="mt-3 flex gap-3">
              {[
                { key: 'noAlarm', label: '알람 미적용', color: 'sensor-warning' },
                { key: 'noSms',   label: 'No SMS',    color: 'alarm-info'     },
              ].map(({ key, label, color }) => {
                const val = form.criteria[key as 'noAlarm' | 'noSms']
                return (
                  <button key={key} type="button"
                    onClick={() => onChange({ ...form, criteria: { ...form.criteria, [key]: !val } })}
                    className={[
                      'flex items-center gap-2 rounded-lg border px-4 py-2 font-mono text-xs font-medium transition-all',
                      val
                        ? `border-${color}-border bg-${color}-bg text-${color}-text`
                        : 'border-line bg-surface-card text-ink-sub hover:border-line-strong',
                    ].join(' ')}>
                    <span className={[
                      'flex h-4 w-4 items-center justify-center rounded border transition-all',
                      val ? 'border-brand bg-brand text-white' : 'border-line-strong bg-surface-card',
                    ].join(' ')}>
                      {val && <svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                    </span>
                    {label}
                  </button>
                )
              })}
            </div>
          </ModalSection>

          {/* 설치 정보 */}
          <ModalSection title="설치 정보">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className={labelCls}>현장 *</label>
                <select value={form.siteId}
                  onChange={e => {
                    onChange({ ...form, siteId: e.target.value, siteName: e.target.value === 'site-main' ? '계측 현장' : '' })
                  }}
                  className={selectCls}>
                  <option value="">현장 선택</option>
                  <option value="site-main">계측 현장</option>
                </select>
              </div>
              <div>
                <label className={labelCls}>설치일</label>
                <input type="date" value={form.installDate} onChange={e => set('installDate', e.target.value)} className={inputCls} />
              </div>
              <div className="sm:col-span-2">
                <label className={labelCls}>설치 위치 설명</label>
                <input type="text" value={form.location.description}
                  onChange={e => onChange({ ...form, location: { ...form.location, description: e.target.value } })}
                  placeholder="예: 1번 사면 상단" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>위도 (선택)</label>
                <input type="number" step="0.0001" value={form.location.lat || ''}
                  onChange={e => onChange({ ...form, location: { ...form.location, lat: Number(e.target.value) } })}
                  placeholder="37.5665" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>경도 (선택)</label>
                <input type="number" step="0.0001" value={form.location.lng || ''}
                  onChange={e => onChange({ ...form, location: { ...form.location, lng: Number(e.target.value) } })}
                  placeholder="126.9780" className={inputCls} />
              </div>
            </div>
          </ModalSection>

          {/* 상세 설정 */}
          <ModalSection title="상세 설정">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>센서 설명</label>
                <textarea rows={2} value={form.description} onChange={e => set('description', e.target.value)}
                  placeholder="센서 용도 및 특징" className={`${inputCls} resize-none`} />
              </div>
              <div>
                <label className={labelCls}>조합식</label>
                <input type="text" value={form.combination} onChange={e => set('combination', e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>소수점 표시</label>
                <input type="text" value={form.decimalPoint} onChange={e => set('decimalPoint', e.target.value)} placeholder="예: 2" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>포인터 정보</label>
                <input type="text" value={form.pointerInfo} onChange={e => set('pointerInfo', e.target.value)} className={inputCls} />
              </div>
            </div>
          </ModalSection>

          {/* 비고 */}
          <ModalSection title="비고">
            <textarea rows={2} value={form.remark} onChange={e => set('remark', e.target.value)}
              placeholder="추가 참고사항" className={`${inputCls} resize-none`} />
          </ModalSection>
        </div>

        <div className="flex gap-2 border-t border-line px-6 py-4">
          <button onClick={onClose} className="flex-1 rounded-lg border border-line px-4 py-2 text-sm font-medium text-ink-sub transition-colors hover:border-line-strong hover:text-ink">취소</button>
          <button onClick={onSubmit} disabled={!isValid}
            className="flex-1 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-40">
            {mode === 'add' ? '센서 추가' : '저장'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── 삭제 확인 모달 ───────────────────────────────────────────────────────────
function DeleteModal({ sensorName, onConfirm, onClose }: { sensorName: string; onConfirm: () => void; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/30 backdrop-blur-sm" onClick={onClose}>
      <div className="geo-card w-full max-w-sm animate-fade-in-up p-6 text-center" onClick={e => e.stopPropagation()}>
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-sensor-dangerbg text-xl text-sensor-danger">⚠</div>
        <h3 className="text-sm font-semibold text-ink">'{sensorName}' 센서를 삭제하시겠습니까?</h3>
        <p className="mt-1.5 text-xs text-ink-muted">삭제된 센서는 복구할 수 없습니다.</p>
        <div className="mt-5 flex gap-2">
          <button onClick={onClose} className="flex-1 rounded-lg border border-line px-4 py-2 text-sm font-medium text-ink-sub transition-colors hover:bg-surface-subtle">취소</button>
          <button onClick={onConfirm} className="flex-1 rounded-lg bg-sensor-danger px-4 py-2 text-sm font-medium text-white transition-colors hover:opacity-90">삭제</button>
        </div>
      </div>
    </div>
  )
}

// ─── 메인 페이지 ──────────────────────────────────────────────────────────────
export default function SensorsPage() {
  const router = useRouter()
  const { user:me } = useAuth()
  const canManage = me?.role !== 'MultiMonitor'
  const { sensors } = useSensorStore()
  useEffect(() => {
    sensorApi.getAll().then((data: any[]) => {
      data.forEach((s: any) => {
        const sensor: UnifiedSensor = {
          id: String(s.id),
          manageNo: s.manage_no || '',
          field: s.field || '공통',
          measureMethod: '해당없음',
          formula: '(A*X+B)',
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
          formulaParams: { coeffA: '', coeffB: '', coeffC: '', coeffD: '', coeffE: '', initVal: '', currentTemp: '', tempCoeff: '', initTemp: '', extRef: '' },
          criteria: { level1Upper: '', level1Lower: '', level2Upper: '', level2Lower: '', criteriaUnit: '', criteriaUnitName: '', noAlarm: false, noSms: false },
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
  }, [])
  const [search,       setSearch]      = useState('')
  const [statusFilter, setStatus]      = useState<SensorStatus | 'all'>('all')
  const [siteFilter,   setSite]        = useState('all')
  const [activeTab,    setActiveTab]   = useState<'monitor' | 'manage'>('monitor')
  const [addOpen,      setAddOpen]     = useState(false)
  const [editTarget,   setEditTarget]  = useState<UnifiedSensor | null>(null)
  const [deleteTarget, setDeleteTarget]= useState<UnifiedSensor | null>(null)
  const [form,         setForm]        = useState<SensorForm>(emptyForm)
  const [toast,        setToast]       = useState<string | null>(null)

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 2500) }

  const openAdd = () => { setForm(emptyForm); setAddOpen(true) }
  const openEdit = (s: UnifiedSensor) => {
    setForm({
      manageNo: s.manageNo ?? '', field: s.field, measureMethod: s.measureMethod,
      formula: s.formula, group: s.group ?? '',
      name: s.name, nameEn: s.nameEn, nameAbbr: s.nameAbbr,
      unit: s.unit, unitName: s.unitName, description: s.description,
      combination: s.combination, decimalPoint: s.decimalPoint,
      pointerInfo: s.pointerInfo, remark: s.remark,
      threshold: { ...s.threshold },
      operation: { ...s.operation },
      formulaParams: { ...s.formulaParams },
      criteria: { ...s.criteria },
      siteId: s.siteId, siteName: s.siteName,
      installDate: s.installDate, location: { ...s.location },
    })
    setEditTarget(s)
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

  const handleEdit = async () => {
    if (!editTarget) return
    try {
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
      showToast(`'${form.name}' 임계값이 저장되었습니다.`)
    } catch (err: any) {
      showToast(err.message || '저장 실패')
    }
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
            {(['monitor','manage'] as const).map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                className={['rounded-md px-4 py-1.5 font-mono text-xs font-medium transition-all',
                  activeTab === tab ? 'bg-surface-card text-brand shadow-card' : 'text-ink-muted hover:text-ink-sub'].join(' ')}>
                {tab === 'monitor' ? '모니터링' : '센서 정의'}
              </button>
            ))}
          </div>
          {activeTab === 'manage' ? (
            canManage && <button onClick={openAdd}
              className="flex items-center gap-1.5 rounded-lg bg-brand px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-brand-hover">
              + 센서 추가
            </button>
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
                  {[['관리번호','text-left'],['현장','text-left'],['관련분야','text-left'],['현재값','text-right'],['임계 W/D','text-right'],['상태','text-center'],['업데이트','text-left'],['QR','text-center']].map(([th,a]) => (
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
                          {sensor.manageNo || sensor.id}
                        </Link>
                        <p className="font-mono text-[10px] text-ink-muted">{sensor.name}</p>
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
                      <td className="px-4 py-3 font-mono text-[11px] text-ink-muted">{getRelativeTime(sensor.lastUpdated)}</td>
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
                    {[['관리번호 / 센서명','text-left'],['현장 / 설치위치','text-left'],['관련분야','text-left'],['단위','text-left'],['임계값','text-left'],['설치일','text-left'],['','text-right']].map(([th,a]) => (
                      <th key={th} className={`px-4 py-3 font-mono text-[10px] font-semibold uppercase tracking-wide text-ink-muted ${a}`}>{th}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {sensors.map(s => (
                    <tr key={s.id} className="transition-colors hover:bg-surface-subtle">
                      <td className="px-4 py-3">
                        {/* 관리번호 또는 ID 클릭 → 상세 페이지 */}
                        <Link href={`/sensors/${s.id}`}
                          className="font-mono text-sm font-semibold text-brand hover:underline">
                          {s.manageNo || s.id}
                        </Link>
                        {/* 센서명 클릭도 상세 페이지로 */}
                        <Link href={`/sensors/${s.id}`}
                          className="mt-0.5 block text-sm font-medium text-ink hover:text-brand hover:underline">
                          {s.name}
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
                      <td className="px-4 py-3 font-mono text-xs text-ink-muted">{s.installDate || '—'}</td>
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

      {/* 토스트 */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 animate-fade-in-up rounded-xl border border-line bg-ink px-5 py-3 font-mono text-sm text-white shadow-cardhover">
          {toast}
        </div>
      )}

      {addOpen     && <SensorModal mode="add"  form={form} onChange={setForm} onSubmit={handleAdd}  onClose={() => setAddOpen(false)} />}
      {editTarget  && <SensorModal mode="edit" form={form} onChange={setForm} onSubmit={handleEdit} onClose={() => setEditTarget(null)} />}
      {deleteTarget && <DeleteModal sensorName={deleteTarget.name} onConfirm={handleDelete} onClose={() => setDeleteTarget(null)} />}
    </div>
  )
}
