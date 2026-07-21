'use client'

import { useState } from 'react'
import type { SensorForm, ActionBeforeMeasure } from '@/types'
import { FIELDS, MEASURE_METHODS, GROUPS, ACTION_AFTER, ACTION_BEFORE } from '@/lib/constants'
import { inputCls, selectCls, labelCls } from '@/components/ui/formStyles'
import { ThresholdSection } from '@/components/ui/ThresholdSection'
import { ModalSection } from '@/components/ui/ModalSection'

// ─── 센서 추가/편집 모달 ──────────────────────────────────────────────────────
export function SensorModal({ mode, form, onChange, onSubmit, onClose, formulas, sites, sensorPositions, sensorId }: {
  mode: 'add' | 'edit'; form: SensorForm
  onChange: (f: SensorForm) => void; onSubmit: () => void; onClose: () => void
  formulas: any[]; sites: any[]
  sensorPositions?: Record<string, any>
  sensorId?: string
}) {
  const [customExpression, setCustomExpression] = useState('')
  const isValid = form.name.trim() !== ''
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

          {/* 구간-그룹 */}
          <ModalSection title="기본 식별">
            <div className="grid grid-cols-1 gap-4">
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
            </div>
          </ModalSection>

          {/* 기본 정보 */}
          <ModalSection title="기본 정보">
            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className={labelCls}>센서명 *</label>
                <input type="text" value={form.name} onChange={e => set('name', e.target.value)} placeholder="경사계 A-1" className={inputCls} />
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
            {/* 계산식 선택 */}
            <div className="mb-3">
              <label className={labelCls}>계산식 선택</label>
              <select
                value={form.selectedExpression}
                onChange={e => {
                  const selected = formulas.find(f => f.expression === e.target.value)
                  onChange({ ...form, selectedExpression: e.target.value, formulaId: selected?.id || null })
                }}
                className={selectCls}>
                <option value="">계산식을 선택하세요</option>
                {formulas.map(f => (
                  <option key={f.id} value={f.expression}>{f.name} — {f.expression}</option>
                ))}
                <option value="__custom__">+ 직접 입력</option>
              </select>
            </div>

            {/* 직접 입력 */}
            {form.selectedExpression === '__custom__' && (
              <div className="mb-3 rounded-lg border border-brand/20 bg-brand/5 p-3 space-y-2">
                <label className={labelCls}>새 계산식 직접 입력</label>
                <input type="text" placeholder="예: G * (I - R) * K"
                  value={customExpression}
                  className={inputCls}
                  onChange={e => setCustomExpression(e.target.value)} />
                <p className="font-mono text-[10px] text-ink-muted mt-1">저장 시 계산식 목록에 자동 추가됩니다. 사용 변수: R(원시값), I(초기값), G, A, B, C, K</p>
              </div>
            )}

            {/* depth별 파라미터 토글 */}
            <div className="mb-3 flex items-center gap-2">
              <button type="button"
                onClick={() => onChange({ ...form, useDepthParams: !form.useDepthParams })}
                className={['rounded-full border px-3 py-1 font-mono text-[10px] transition-colors',
                  form.useDepthParams ? 'border-brand/30 bg-brand/10 text-brand' : 'border-line text-ink-muted hover:bg-surface-subtle'].join(' ')}>
                {form.useDepthParams ? '✓ depth별 파라미터 설정 ON' : 'depth별 파라미터 설정 (토글)'}
              </button>
              <span className="font-mono text-[10px] text-ink-muted">depth마다 계수가 다른 경우 활성화</span>
            </div>

            {/* 파라미터 입력 */}
            {form.useDepthParams ? (
              <div className="space-y-3">
                {Object.keys(form.depthParams || { '1': {} }).map(d => (
                  <div key={d} className="rounded-lg border border-line bg-surface-subtle p-3">
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-mono text-[10px] font-semibold text-ink">Depth {d}</p>
                      <button type="button"
                        onClick={() => {
                          const next = { ...(form.depthParams || {}) }
                          delete next[d]
                          onChange({ ...form, depthParams: next })
                        }}
                        className="font-mono text-[10px] text-red-400 hover:underline">− 삭제</button>
                    </div>
                    <div className="grid grid-cols-5 gap-2">
                      {['G', 'A', 'B', 'C', 'K'].map(key => (
                        <div key={key}>
                          <label className={labelCls}>{key}</label>
                          <input type="text" placeholder="0.000"
                            value={(form.depthParams?.[d]?.[key] || '')}
                            onChange={e => onChange({
                              ...form,
                              depthParams: { ...(form.depthParams || {}), [d]: { ...((form.depthParams || {})[d] || {}), [key]: e.target.value } }
                            })}
                            className={inputCls} />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
                {/* depth 추가 버튼 */}
                <button type="button"
                  onClick={() => {
                    const existing = Object.keys(form.depthParams || {})
                    const next = String((existing.length > 0 ? Math.max(...existing.map(Number)) : 0) + 1)
                    onChange({ ...form, depthParams: { ...(form.depthParams || {}), [next]: { A: '', B: '', C: '', G: '', K: '' } } })
                  }}
                  className="mt-2 w-full rounded-lg border border-dashed border-brand/30 py-2 font-mono text-[10px] text-brand hover:bg-brand/5">
                  + Depth 추가
                </button>
              </div>
            ) : (
              <div className="rounded-lg border border-line bg-surface-subtle p-3">
                <p className="font-mono text-[10px] font-semibold text-ink mb-2">파라미터 (단일 depth)</p>
                <div className="grid grid-cols-5 gap-2">
                  {['G', 'A', 'B', 'C', 'K'].map(key => (
                    <div key={key}>
                      <label className={labelCls}>{key}</label>
                      <input type="text" placeholder="0.000"
                        value={(form.depthParams?.['1']?.[key] || '')}
                        onChange={e => onChange({
                          ...form,
                          depthParams: {
                            '1': { ...(form.depthParams?.['1'] || {}), [key]: e.target.value },
                            '2': { ...(form.depthParams?.['2'] || {}), [key]: e.target.value },
                            '3': { ...(form.depthParams?.['3'] || {}), [key]: e.target.value },
                          }
                        })}
                        className={inputCls} />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 초기값 설정 */}
            <div className="mt-3 rounded-lg border border-line bg-surface-subtle p-3">
              <p className="font-mono text-[10px] font-semibold text-ink mb-2">초기값 (I) 설정</p>
              <div className="flex gap-2 mb-2">
                {(['auto', 'manual'] as const).map(mode => (
                  <button key={mode} type="button"
                    onClick={() => onChange({ ...form, initValMode: mode })}
                    className={['rounded-md border px-3 py-1 font-mono text-[10px]',
                      form.initValMode === mode ? 'border-brand/30 bg-brand/10 text-brand' : 'border-line text-ink-muted hover:bg-surface-subtle'].join(' ')}>
                    {mode === 'auto' ? '자동 (최초 수신값)' : '수동 입력'}
                  </button>
                ))}
              </div>
              {form.initValMode === 'manual' && (
                <input type="number" step="0.01" placeholder="초기 원시값 직접 입력"
                  value={form.depthParams?.['1']?.I || ''}
                  onChange={e => onChange({
                    ...form,
                    depthParams: {
                      '1': { ...(form.depthParams?.['1'] || {}), I: e.target.value },
                      '2': { ...(form.depthParams?.['2'] || {}), I: e.target.value },
                      '3': { ...(form.depthParams?.['3'] || {}), I: e.target.value },
                    }
                  })}
                  className={inputCls} />
              )}
              {form.initValMode === 'auto' && (
                <p className="font-mono text-[10px] text-ink-muted">센서에 저장된 최초 수신 원시값을 자동으로 사용합니다.</p>
              )}
            </div>

            {/* 테스트 미리보기 */}
            <div className="mt-3 rounded-lg border border-brand/20 bg-brand/5 p-3">
              <p className="font-mono text-[10px] font-semibold text-ink mb-2">저장 전 테스트 계산</p>
              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <label className={labelCls}>원시값 R 입력</label>
                  <input type="number" step="0.01" placeholder="예: 8214.53"
                    value={form.previewRaw}
                    onChange={e => {
                      const raw = parseFloat(e.target.value)
                      const expr = form.selectedExpression === '__custom__' ? '' : form.selectedExpression
                      let result: number | null = null
                      if (!isNaN(raw) && expr && expr !== '__custom__') {
                        try {
                          const p1 = form.depthParams?.['1'] || {}
                          const scope: Record<string, number> = { R: raw, I: parseFloat(p1.I || p1.G || '0') || raw }
                          if (p1.G) scope.G = parseFloat(p1.G)
                          if (p1.A) scope.A = parseFloat(p1.A)
                          if (p1.B) scope.B = parseFloat(p1.B)
                          if (p1.C) scope.C = parseFloat(p1.C)
                          if (p1.K) scope.K = parseFloat(p1.K)
                          result = parseFloat((Function(...Object.keys(scope), `return ${expr.replace(/\^/g, '**')}`)(...Object.values(scope))).toFixed(4))
                          if (!isFinite(result)) result = null
                        } catch { result = null }
                      }
                      onChange({ ...form, previewRaw: e.target.value, previewResult: result })
                    }}
                    className={inputCls} />
                </div>
                <div className="flex-1">
                  <label className={labelCls}>계산 결과</label>
                  <div className={`${inputCls} bg-surface-card font-semibold ${form.previewResult !== null ? 'text-brand' : 'text-ink-muted'}`}>
                    {form.previewResult !== null ? `${form.previewResult} ${form.unit}` : '—'}
                  </div>
                </div>
              </div>
            </div>
          </ModalSection>

          {/* 관리 기준 */}
          <ModalSection title="관리 기준">
            {form.nameAbbr === '80053' ? (
              <div className="space-y-4">
                <p className="font-mono text-[10px] text-ink-muted">depth별 개별 설정 (센서 상세 페이지에서도 수정 가능)</p>
                {(['1','2','3'] as const).map(depth => {
                  const dc = (form.criteria as any).depthCriteria?.[depth] || {}
                  return (
                    <div key={depth} className="rounded-lg border border-line bg-surface-subtle p-3">
                      <p className="font-mono text-[10px] font-semibold text-ink mb-2">
                        {sensorPositions?.[`${sensorId}:${depth}`]?.label || `${depth}번 수위계`}
                      </p>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className={`${labelCls} text-sensor-warningtext`}>1차 상한값</label>
                          <input type="text" value={dc.upper ?? ''}
                            onChange={e => {
                              const prevDc = (form.criteria as any).depthCriteria || {}
                              onChange({ ...form, criteria: { ...form.criteria, depthCriteria: { ...prevDc, [depth]: { ...dc, upper: e.target.value } } } as any })
                            }}
                            placeholder="예: -1.00" className={inputCls} />
                        </div>
                        <div>
                          <label className={`${labelCls} text-sensor-warningtext`}>1차 하한값</label>
                          <input type="text" value={dc.lower ?? ''}
                            onChange={e => {
                              const prevDc = (form.criteria as any).depthCriteria || {}
                              onChange({ ...form, criteria: { ...form.criteria, depthCriteria: { ...prevDc, [depth]: { ...dc, lower: e.target.value } } } as any })
                            }}
                            placeholder="예: -5.00" className={inputCls} />
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
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
            )}
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
