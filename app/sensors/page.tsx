'use client'

import { useState } from 'react'
import Link from 'next/link'
import { getRelativeTime, getThresholds } from '@/lib/mock-data'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { sensorStore, useSensorStore, evaluateStatus } from '@/lib/sensor-store'
import { sensorApi, siteApi, formulaApi, recollectApi, agentApi } from '@/lib/api'
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
  formulaParams: { coeffA: '', coeffB: '', coeffC: '', coeffD: '', coeffE: '', coeffG: '', initVal: '', currentTemp: '', tempCoeff: '', initTemp: '', extRef: '' },
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

function FormulaModal({ mode, form, onChange, onSubmit, onClose }: {
  mode: 'add' | 'edit'; form: { name: string; expression: string; description: string }
  onChange: (f: any) => void; onSubmit: () => void; onClose: () => void
}) {
  const isValid = form.name.trim() !== '' && form.expression.trim() !== ''
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/30 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="geo-card flex w-full max-w-md animate-fade-in-up flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-line px-6 py-4">
          <h2 className="text-sm font-semibold text-ink">{mode === 'add' ? '계산식 추가' : '계산식 수정'}</h2>
          <button onClick={onClose} className="rounded-md p-1 text-ink-muted hover:bg-surface-subtle hover:text-ink">✕</button>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div>
            <label className={labelCls}>계산식 이름 *</label>
            <input type="text" value={form.name} onChange={e => onChange({ ...form, name: e.target.value })}
              placeholder="예: 기본 선형" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>계산식 *</label>
            <input type="text" value={form.expression} onChange={e => onChange({ ...form, expression: e.target.value })}
              placeholder="예: (A*X+B)" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>설명</label>
            <textarea rows={2} value={form.description} onChange={e => onChange({ ...form, description: e.target.value })}
              placeholder="계산식에 대한 설명" className={`${inputCls} resize-none`} />
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

// ─── 센서 추가/편집 모달 ──────────────────────────────────────────────────────
function SensorModal({ mode, form, onChange, onSubmit, onClose, formulas, sites }: {
  mode: 'add' | 'edit'; form: SensorForm
  onChange: (f: SensorForm) => void; onSubmit: () => void; onClose: () => void
  formulas: any[]; sites: any[]
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
                  {formulas.map(f => <option key={f.expression} value={f.expression}>{f.name} — {f.expression}</option>)}
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
                { key: 'coeffE', label: 'E 계수' }, { key: 'coeffG', label: 'G 계수 (Linear)' },
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
                <select value={form.siteId} onChange={e => {
                  const selected = sites.find(s => s.site_code === e.target.value)
                  onChange({ ...form, siteId: e.target.value, siteName: selected?.name || '' })
                }} className={selectCls}>
                  <option value="">현장 선택</option>
                  {sites.map(s => <option key={s.site_code} value={s.site_code}>{s.name}</option>)}
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

// ─── 재수집 요청 모달 ─────────────────────────────────────────────────────────
function RecollectModal({ sensors, onSubmit, onClose }: {
  sensors: any[]
  onSubmit: (body: { sensor_id: number; date_from: string; date_to: string; reason: string }) => void
  onClose: () => void
}) {
  const today = new Date().toISOString().slice(0, 10)
  const [sensorId, setSensorId] = useState<string>('')
  const [dateFrom, setDateFrom] = useState(today)
  const [dateTo,   setDateTo]   = useState(today)
  const [reason,   setReason]   = useState('')
  const isValid = sensorId !== '' && dateFrom <= dateTo

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/30 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="geo-card flex w-full max-w-md animate-fade-in-up flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-line px-6 py-4">
          <h2 className="text-sm font-semibold text-ink">🔄 데이터 재수집 요청</h2>
          <button onClick={onClose} className="rounded-md p-1 text-ink-muted hover:bg-surface-subtle hover:text-ink">✕</button>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div className="rounded-lg border border-alarm-infoborder bg-alarm-infobg px-4 py-3">
            <p className="font-mono text-[11px] text-alarm-infotext">
              ※ 에이전트(회사 PC)가 온라인 상태일 때 다음 폴링 주기(1시간)에 자동으로 재수집됩니다.
            </p>
          </div>
          <div>
            <label className={labelCls}>센서 선택 *</label>
            <select value={sensorId} onChange={e => setSensorId(e.target.value)} className={selectCls}>
              <option value="">센서를 선택하세요</option>
              {sensors.map(s => (
                <option key={s.id} value={s.id}>{s.manageNo || s.nameAbbr} — {s.name}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>시작일 *</label>
              <input type="date" value={dateFrom} max={today} onChange={e => setDateFrom(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>종료일 *</label>
              <input type="date" value={dateTo} min={dateFrom} max={today} onChange={e => setDateTo(e.target.value)} className={inputCls} />
            </div>
          </div>
          {dateFrom > dateTo && (
            <p className="font-mono text-[11px] text-sensor-dangertext">종료일이 시작일보다 앞설 수 없습니다.</p>
          )}
          <div>
            <label className={labelCls}>사유 (선택)</label>
            <textarea rows={2} value={reason} onChange={e => setReason(e.target.value)}
              placeholder="예: 에이전트 오류로 인한 데이터 누락" className={`${inputCls} resize-none`} />
          </div>
        </div>
        <div className="flex gap-2 border-t border-line px-6 py-4">
          <button onClick={onClose} className="flex-1 rounded-lg border border-line px-4 py-2 text-sm font-medium text-ink-sub hover:border-line-strong hover:text-ink">취소</button>
          <button onClick={() => isValid && onSubmit({ sensor_id: Number(sensorId), date_from: dateFrom, date_to: dateTo, reason })}
            disabled={!isValid}
            className="flex-1 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-40">
            요청 등록
          </button>
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
  const [form,         setForm]        = useState<SensorForm>(emptyForm)
  const [toast,        setToast]       = useState<string | null>(null)

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
        },
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
      }
      setForm({
        manageNo: freshSensor.manageNo ?? '', field: freshSensor.field, measureMethod: freshSensor.measureMethod,
        formula: freshSensor.formula, group: freshSensor.group ?? '',
        name: freshSensor.name, nameEn: freshSensor.nameEn, nameAbbr: freshSensor.nameAbbr,
        unit: freshSensor.unit, unitName: freshSensor.unitName, description: freshSensor.description,
        combination: freshSensor.combination, decimalPoint: freshSensor.decimalPoint,
        pointerInfo: freshSensor.pointerInfo, remark: freshSensor.remark,
        threshold: { ...freshSensor.threshold },
        operation: { ...freshSensor.operation },
        formulaParams: (freshSensor as any).formula_params ? {
          coeffA: (freshSensor as any).formula_params.coeffA || '',
          coeffB: (freshSensor as any).formula_params.coeffB || '',
          coeffC: (freshSensor as any).formula_params.coeffC || '',
          coeffD: (freshSensor as any).formula_params.coeffD || '',
          coeffE: (freshSensor as any).formula_params.coeffE || '',
          coeffG: (freshSensor as any).formula_params.coeffG || '',
          initVal: (freshSensor as any).formula_params.initVal || '',
          currentTemp: (freshSensor as any).formula_params.currentTemp || '',
          tempCoeff: (freshSensor as any).formula_params.tempCoeff || '',
          initTemp: (freshSensor as any).formula_params.initTemp || '',
          extRef: (freshSensor as any).formula_params.extRef || '',
        } : { coeffA: '', coeffB: '', coeffC: '', coeffD: '', coeffE: '', coeffG: '', initVal: '', currentTemp: '', tempCoeff: '', initTemp: '', extRef: '' },
        criteria: { ...freshSensor.criteria },
        siteId: freshSensor.siteId, siteName: freshSensor.siteName,
        installDate: freshSensor.installDate ? freshSensor.installDate.slice(0, 10) : '',
        location: { ...freshSensor.location },
      })
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
      await sensorApi.updateInfo(Number(editTarget.id), {
        name: form.name,
        manage_no: form.manageNo,
        unit: form.unit,
        field: form.field,
        formula: form.formula,
        formula_params: {
          coeffA: form.formulaParams.coeffA,
          coeffB: form.formulaParams.coeffB,
          coeffC: form.formulaParams.coeffC,
          coeffD: form.formulaParams.coeffD,
          coeffE: form.formulaParams.coeffE,
          coeffG: form.formulaParams.coeffG,
          initVal: form.formulaParams.initVal,
          currentTemp: form.formulaParams.currentTemp,
          tempCoeff: form.formulaParams.tempCoeff,
          initTemp: form.formulaParams.initTemp,
          extRef: form.formulaParams.extRef,
        },
        level1_upper: form.criteria.level1Upper !== '' ? form.criteria.level1Upper : null,
        level1_lower: form.criteria.level1Lower !== '' ? form.criteria.level1Lower : null,
        level2_upper: form.criteria.level2Upper !== '' ? form.criteria.level2Upper : null,
        level2_lower: form.criteria.level2Lower !== '' ? form.criteria.level2Lower : null,
        criteria_unit: form.criteria.criteriaUnit || null,
        criteria_unit_name: form.criteria.criteriaUnitName || null,
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
                  {sensors.filter(s => isDataDelayed(s.lastUpdated)).map(s => s.manageNo || s.nameAbbr).join(', ')} 센서에서 2시간 이상 데이터가 수신되지 않고 있습니다.
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

      {/* ── 계산식 관리 탭 ── */}
      {activeTab === 'formula' && (
        <div className="p-6">
          <div className="geo-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[500px] text-sm">
                <thead>
                  <tr className="border-b border-line bg-surface-subtle">
                    {[['이름','text-left'],['계산식','text-left'],['설명','text-left'],['','text-right']].map(([th,a]) => (
                      <th key={th} className={`px-4 py-3 font-mono text-[10px] font-semibold uppercase tracking-wide text-ink-muted ${a}`}>{th}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {formulas.map(f => (
                    <tr key={f.id} className="transition-colors hover:bg-surface-subtle">
                      <td className="px-4 py-3 font-medium text-ink">{f.name}</td>
                      <td className="px-4 py-3 font-mono text-xs text-brand">{f.expression}</td>
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
      {editTarget && <SensorModal mode="edit" form={form} onChange={setForm} onSubmit={handleEdit} onClose={() => setEditTarget(null)} formulas={formulas} sites={sites} />}
      {deleteTarget && <DeleteModal sensorName={deleteTarget.name} onConfirm={handleDelete} onClose={() => setDeleteTarget(null)} />}
      {formulaAddOpen && <FormulaModal mode="add" form={formulaForm} onChange={setFormulaForm} onSubmit={handleFormulaAdd} onClose={() => setFormulaAddOpen(false)} />}
      {formulaEditTarget && <FormulaModal mode="edit" form={formulaForm} onChange={setFormulaForm} onSubmit={handleFormulaEdit} onClose={() => setFormulaEditTarget(null)} />}
      {recollectOpen && <RecollectModal sensors={sensors} onSubmit={handleRecollectSubmit} onClose={() => setRecollectOpen(false)} />}
    </div>
  )
}
