'use client'

import { useEffect, useMemo, useRef, useState } from 'react'

type ChartMode = 'hourly' | 'daily'
type DepthValue = '1' | '2' | '3'
type PopoverKind = null | 'period' | 'unit' | 'correction' | 'baseline'
export type BaselineMode = 'range' | 'allTime'

export interface DepthOption { value: DepthValue; label: string }

export interface TrendControlsBarProps {
  dateFrom: string
  dateTo: string
  onDateFromChange: (v: string) => void
  onDateToChange: (v: string) => void
  today: string

  chartMode: ChartMode
  onChartModeChange: (m: ChartMode) => void
  selectedHour: number
  onSelectedHourChange: (h: number) => void

  showCorrection?: boolean
  correctionInputValue?: string
  onCorrectionInputChange?: (v: string) => void
  onCorrectionApply?: () => void
  correctionSaving?: boolean
  correctionUnit?: string
  correctionReadOnly?: boolean

  depthOptions?: DepthOption[]
  depthLabel?: DepthValue
  onDepthLabelChange?: (d: DepthValue) => void

  showBaseline?: boolean
  baselineDate?: string
  baselineValueText?: string
  baselineMode?: BaselineMode
  onBaselineModeChange?: (m: BaselineMode) => void

  onQuery: () => void
  onReset?: () => void
}

const fmtMD = (s: string) => {
  const [, m, d] = s.split('-')
  return `${m}.${d}`
}

const dayDiff = (from: string, to: string): number => {
  const a = new Date(from + 'T00:00:00').getTime()
  const b = new Date(to + 'T00:00:00').getTime()
  return Math.round((b - a) / 86400000) + 1
}

const toISO = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

const hourLabel = (h: number) =>
  h < 12 ? `오전 ${h === 0 ? 12 : h}시` : `오후 ${h === 12 ? 12 : h - 12}시`

export function TrendControlsBar(props: TrendControlsBarProps) {
  const {
    dateFrom, dateTo, onDateFromChange, onDateToChange, today,
    chartMode, onChartModeChange, selectedHour, onSelectedHourChange,
    showCorrection, correctionInputValue, onCorrectionInputChange,
    onCorrectionApply, correctionSaving, correctionUnit, correctionReadOnly,
    depthOptions, depthLabel, onDepthLabelChange,
    showBaseline, baselineDate, baselineValueText, baselineMode, onBaselineModeChange,
    onQuery, onReset,
  } = props

  const [open, setOpen] = useState<PopoverKind>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (!containerRef.current) return
      if (!containerRef.current.contains(e.target as Node)) setOpen(null)
    }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(null) }
    window.addEventListener('mousedown', onDown)
    window.addEventListener('keydown', onKey)
    return () => { window.removeEventListener('mousedown', onDown); window.removeEventListener('keydown', onKey) }
  }, [open])

  const days = useMemo(() => dayDiff(dateFrom, dateTo), [dateFrom, dateTo])

  const unitChipText = chartMode === 'hourly' ? '시간별' : `일별 · ${hourLabel(selectedHour)}`

  return (
    <div ref={containerRef} className="relative rounded-xl border border-line bg-surface-card px-4 py-3">
      <div className="flex items-center gap-2 flex-wrap">
        <button type="button" onClick={() => setOpen(open === 'period' ? null : 'period')}
          className={['group flex items-center gap-2 rounded-full pl-3 pr-2 py-1 shadow-sm transition-colors',
            open === 'period' ? 'border-2 border-brand bg-white' : 'border-2 border-brand bg-white'].join(' ')}>
          <span className="font-mono text-[10px] text-brand">기간</span>
          <span className="font-mono text-[11px] text-ink font-medium tabular-nums">{fmtMD(dateFrom)} — {fmtMD(dateTo)}</span>
          <span className="font-mono text-[10px] text-ink-muted">· {days}일</span>
          <span className="font-mono text-[10px] text-brand">▾</span>
        </button>

        <div className="relative">
          <button type="button" onClick={() => setOpen(open === 'unit' ? null : 'unit')}
            className={['group flex items-center gap-2 rounded-full pl-3 pr-2 py-1 transition-colors',
              open === 'unit' ? 'border border-brand bg-white' : 'border border-line bg-surface-subtle hover:border-brand/40'].join(' ')}>
            <span className="font-mono text-[10px] text-ink-muted">단위</span>
            <span className="font-mono text-[11px] text-ink font-medium">{unitChipText}</span>
            <span className="font-mono text-[10px] text-ink-muted">▾</span>
          </button>
          {open === 'unit' && (
            <UnitPopover
              chartMode={chartMode} selectedHour={selectedHour}
              onChartModeChange={onChartModeChange}
              onSelectedHourChange={onSelectedHourChange}
              onClose={() => setOpen(null)}
            />
          )}
        </div>

        {showCorrection && (
          <div className="relative">
            <button type="button" onClick={() => setOpen(open === 'correction' ? null : 'correction')}
              className={['group flex items-center gap-2 rounded-full pl-3 pr-2 py-1 transition-colors',
                open === 'correction' ? 'border border-brand bg-white' : 'border border-line bg-surface-subtle hover:border-brand/40'].join(' ')}>
              <span className="font-mono text-[10px] text-ink-muted">보정</span>
              <span className="font-mono text-[11px] text-ink font-medium tabular-nums">{(correctionInputValue || '0') + ' ' + (correctionUnit || '')}</span>
              <span className="font-mono text-[10px] text-ink-muted">▾</span>
            </button>
            {open === 'correction' && (
              <CorrectionPopover
                value={correctionInputValue || ''} unit={correctionUnit || ''}
                saving={!!correctionSaving} readOnly={!!correctionReadOnly}
                onChange={(v: string) => onCorrectionInputChange?.(v)}
                onApply={() => { onCorrectionApply?.(); setOpen(null) }}
                onCancel={() => setOpen(null)}
              />
            )}
          </div>
        )}

        {showBaseline && (
          onBaselineModeChange ? (
            <div className="relative">
              <button type="button" onClick={() => setOpen(open === 'baseline' ? null : 'baseline')}
                className={['group flex items-center gap-2 rounded-full pl-3 pr-2 py-1 transition-colors',
                  open === 'baseline' ? 'border border-brand bg-white' : 'border border-line bg-surface-subtle hover:border-brand/40'].join(' ')}>
                <span className="font-mono text-[10px] text-ink-muted">기준</span>
                <span className="font-mono text-[11px] text-ink font-medium tabular-nums">
                  {baselineDate ? fmtMD(baselineDate) : '—'}
                  {baselineValueText ? ` · ${baselineValueText}` : ''}
                </span>
                <span className="font-mono text-[10px] text-ink-muted">▾</span>
              </button>
              {open === 'baseline' && (
                <BaselineModePopover
                  mode={baselineMode || 'range'}
                  onChange={(m: BaselineMode) => { onBaselineModeChange(m); setOpen(null) }}
                  onCancel={() => setOpen(null)}
                />
              )}
            </div>
          ) : (
            <div
              className="flex items-center gap-2 rounded-full pl-3 pr-3 py-1 border border-line bg-surface-subtle/70 cursor-default"
              title="센서 전체 기간의 최초 측정값"
            >
              <span className="font-mono text-[10px] text-ink-muted">기준</span>
              <span className="font-mono text-[11px] text-ink font-medium tabular-nums">
                {baselineDate ? fmtMD(baselineDate) : '—'}
                {baselineValueText ? ` · ${baselineValueText}` : ''}
              </span>
            </div>
          )
        )}

        {depthOptions && depthOptions.length > 0 && (
          <>
            <div className="w-px h-4 bg-line shrink-0" />
            <div className="flex gap-1">
              {depthOptions.map(opt => (
                <button key={opt.value} type="button" onClick={() => onDepthLabelChange?.(opt.value)}
                  className={['rounded-md border px-3 py-1 font-mono text-[11px]',
                    depthLabel === opt.value ? 'border-brand/30 bg-brand/10 text-brand font-medium' : 'border-line text-ink-muted hover:bg-surface-subtle'].join(' ')}>
                  {opt.label}
                </button>
              ))}
            </div>
          </>
        )}

        <div className="ml-auto flex items-center gap-2">
          {onReset && (
            <button type="button" onClick={onReset}
              className="font-mono text-[11px] text-ink-muted hover:text-ink">초기화</button>
          )}
          <button type="button" onClick={() => { setOpen(null); onQuery() }}
            className="rounded-md bg-brand px-4 py-1.5 font-mono text-[11px] text-white hover:bg-brand/90">
            조회 →
          </button>
        </div>
      </div>

      {open === 'period' && (
        <PeriodPopover
          dateFrom={dateFrom} dateTo={dateTo}
          today={today}
          onApply={(from, to) => { onDateFromChange(from); onDateToChange(to); setOpen(null) }}
          onCancel={() => setOpen(null)}
        />
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// 기간 팝오버

interface PeriodPopoverProps {
  dateFrom: string
  dateTo: string
  today: string
  onApply: (from: string, to: string) => void
  onCancel: () => void
}

function PeriodPopover({ dateFrom, dateTo, today, onApply, onCancel }: PeriodPopoverProps) {
  const [draftFrom, setDraftFrom] = useState(dateFrom)
  const [draftTo, setDraftTo] = useState(dateTo)
  const [pickFrom, setPickFrom] = useState(true)

  const initial = new Date(dateTo + 'T00:00:00')
  const [viewYear, setViewYear] = useState(initial.getFullYear())
  const [viewMonth, setViewMonth] = useState(initial.getMonth())

  const range = useMemo(() => dayDiff(draftFrom, draftTo), [draftFrom, draftTo])

  const setPreset = (kind: string) => {
    const now = new Date()
    const t = toISO(now)
    if (kind === 'today') { setDraftFrom(t); setDraftTo(t); return }
    if (kind === 'yesterday') {
      const y = new Date(now); y.setDate(y.getDate() - 1)
      const ys = toISO(y); setDraftFrom(ys); setDraftTo(ys); return
    }
    if (kind === 'thisWeek') {
      const wd = now.getDay()
      const monOffset = wd === 0 ? -6 : 1 - wd
      const mon = new Date(now); mon.setDate(now.getDate() + monOffset)
      setDraftFrom(toISO(mon)); setDraftTo(t); return
    }
    if (kind === 'last7') {
      const f = new Date(now); f.setDate(f.getDate() - 6)
      setDraftFrom(toISO(f)); setDraftTo(t); return
    }
    if (kind === 'last30') {
      const f = new Date(now); f.setDate(f.getDate() - 29)
      setDraftFrom(toISO(f)); setDraftTo(t); return
    }
    if (kind === 'thisMonth') {
      const f = new Date(now.getFullYear(), now.getMonth(), 1)
      setDraftFrom(toISO(f)); setDraftTo(t); return
    }
    if (kind === 'lastMonth') {
      const f = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      const e = new Date(now.getFullYear(), now.getMonth(), 0)
      setDraftFrom(toISO(f)); setDraftTo(toISO(e)); return
    }
  }

  const handleDayClick = (iso: string) => {
    if (pickFrom) {
      setDraftFrom(iso)
      if (new Date(iso).getTime() > new Date(draftTo).getTime()) setDraftTo(iso)
      setPickFrom(false)
    } else {
      if (new Date(iso).getTime() < new Date(draftFrom).getTime()) {
        setDraftFrom(iso)
      } else {
        setDraftTo(iso)
      }
      setPickFrom(true)
    }
  }

  const goPrev = () => {
    const d = new Date(viewYear, viewMonth - 1, 1)
    setViewYear(d.getFullYear()); setViewMonth(d.getMonth())
  }
  const goNext = () => {
    const d = new Date(viewYear, viewMonth + 1, 1)
    setViewYear(d.getFullYear()); setViewMonth(d.getMonth())
  }

  const cells = useMemo(() => buildMonthCells(viewYear, viewMonth), [viewYear, viewMonth])
  const fromTs = new Date(draftFrom + 'T00:00:00').getTime()
  const toTs = new Date(draftTo + 'T00:00:00').getTime()

  return (
    <div className="absolute z-50 left-2 top-full mt-2">
      <svg width="16" height="8" viewBox="0 0 16 8" className="absolute -top-2 left-3">
        <path d="M0 8 L8 0 L16 8 Z" fill="white" stroke="#1D9E75" strokeWidth="1" />
      </svg>
      <div className="rounded-xl border border-brand/40 bg-white shadow-xl w-[640px]">
        <div className="flex items-center justify-between border-b border-line px-4 py-2">
          <p className="font-mono text-[10px] uppercase tracking-wider text-ink-muted">기간 편집</p>
          <button type="button" onClick={onCancel} className="text-ink-muted hover:text-ink font-mono text-[11px]">✕</button>
        </div>

        <div className="grid grid-cols-[150px_1fr]">
          <div className="border-r border-line p-2 space-y-0.5">
            <p className="font-mono text-[9px] uppercase tracking-wider text-ink-muted px-2 pt-1 pb-1">프리셋</p>
            {[
              ['today', '오늘'], ['yesterday', '어제'], ['thisWeek', '이번 주'],
              ['last7', '지난 7일'], ['last30', '지난 30일'],
              ['thisMonth', '이번 달'], ['lastMonth', '지난 달'],
            ].map(([k, l]) => (
              <button key={k} type="button" onClick={() => setPreset(k)}
                className="w-full text-left px-2 py-1 rounded font-mono text-[11px] text-ink-sub hover:bg-surface-subtle">{l}</button>
            ))}
          </div>

          <div className="p-3">
            <div className="flex items-center gap-2 mb-3">
              <div className="flex-1">
                <p className="font-mono text-[9px] uppercase tracking-wider text-ink-muted mb-1">시작</p>
                <input type="date" value={draftFrom} max={today}
                  onChange={e => setDraftFrom(e.target.value)}
                  className={`w-full rounded-md border px-2 py-1 font-mono text-[11px] focus:outline-none ${pickFrom ? 'border-brand/40 ring-1 ring-brand/20' : 'border-line'}`} />
              </div>
              <span className="font-mono text-[11px] text-ink-muted mt-4">→</span>
              <div className="flex-1">
                <p className="font-mono text-[9px] uppercase tracking-wider text-ink-muted mb-1">종료</p>
                <input type="date" value={draftTo} min={draftFrom} max={today}
                  onChange={e => setDraftTo(e.target.value)}
                  className={`w-full rounded-md border px-2 py-1 font-mono text-[11px] focus:outline-none ${!pickFrom ? 'border-brand/40 ring-1 ring-brand/20' : 'border-line'}`} />
              </div>
            </div>

            <div className="rounded-lg border border-line p-3">
              <div className="flex items-center justify-between mb-2">
                <button type="button" onClick={goPrev} className="text-ink-muted hover:text-ink font-mono text-[12px] px-2">‹</button>
                <div className="font-mono text-[12px] font-medium">{viewYear}년 {viewMonth + 1}월</div>
                <button type="button" onClick={goNext} className="text-ink-muted hover:text-ink font-mono text-[12px] px-2">›</button>
              </div>
              <div className="grid grid-cols-7 gap-0.5 font-mono text-[9px] text-ink-muted text-center mb-1">
                <span className="text-sensor-dangertext">일</span><span>월</span><span>화</span><span>수</span><span>목</span><span>금</span><span className="text-blue-500">토</span>
              </div>
              <div className="grid grid-cols-7 gap-0.5 font-mono text-[11px] text-center">
                {cells.map((c, i) => {
                  const ts = new Date(c.iso + 'T00:00:00').getTime()
                  const inRange = ts >= fromTs && ts <= toTs
                  const isStart = ts === fromTs
                  const isEnd = ts === toTs
                  const dim = !c.inMonth
                  const dow = new Date(c.iso + 'T00:00:00').getDay()
                  let cls = 'py-1.5 cursor-pointer select-none transition-colors '
                  if (isStart || isEnd) {
                    cls += 'bg-brand text-white font-semibold ring-2 ring-brand/40 hover:bg-brand '
                  } else if (inRange) {
                    cls += 'bg-brand/15 text-ink hover:bg-brand/25 '
                  } else if (dim) {
                    cls += 'text-ink-muted/40 hover:bg-surface-subtle '
                  } else {
                    if (dow === 0) cls += 'text-sensor-dangertext '
                    else if (dow === 6) cls += 'text-blue-500 '
                    else cls += 'text-ink '
                    cls += 'hover:bg-brand/10 '
                  }
                  if (isStart && !isEnd) cls += 'rounded-l-md '
                  if (isEnd && !isStart) cls += 'rounded-r-md '
                  if (isStart && isEnd) cls += 'rounded-md '
                  return (
                    <span key={i} className={cls} onClick={() => handleDayClick(c.iso)}>
                      {c.day}
                    </span>
                  )
                })}
              </div>
              <div className="mt-2 pt-2 border-t border-line/70 flex items-center text-[10px] font-mono text-ink-muted">
                <span>{pickFrom ? '시작일을 선택하세요' : '종료일을 선택하세요'}</span>
                <span className="ml-auto">시작: {fmtMD(draftFrom)} · 종료: {fmtMD(draftTo)}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-line px-4 py-2.5 bg-surface-subtle/40">
          <div className="font-mono text-[11px]">
            <span className="text-ink-muted">선택됨:</span>
            <strong className="ml-1 text-ink tabular-nums">{draftFrom.replaceAll('-', '.')} — {draftTo.replaceAll('-', '.')}</strong>
            <span className="ml-1 text-ink-muted">({range}일)</span>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={onCancel} className="font-mono text-[11px] text-ink-muted hover:text-ink px-2">취소</button>
            <button type="button" onClick={() => onApply(draftFrom, draftTo)}
              className="rounded-md bg-brand px-4 py-1 font-mono text-[11px] text-white">적용</button>
          </div>
        </div>
      </div>
    </div>
  )
}

interface MonthCell { iso: string; day: number; inMonth: boolean }

function buildMonthCells(year: number, month: number): MonthCell[] {
  const first = new Date(year, month, 1)
  const startDow = first.getDay()
  const cells: MonthCell[] = []
  const prevMonthLast = new Date(year, month, 0).getDate()
  for (let i = startDow - 1; i >= 0; i--) {
    const d = new Date(year, month - 1, prevMonthLast - i)
    cells.push({ iso: toISO(d), day: d.getDate(), inMonth: false })
  }
  const thisMonthDays = new Date(year, month + 1, 0).getDate()
  for (let d = 1; d <= thisMonthDays; d++) {
    cells.push({ iso: toISO(new Date(year, month, d)), day: d, inMonth: true })
  }
  while (cells.length % 7 !== 0) {
    const last = cells[cells.length - 1]
    const next = new Date(last.iso + 'T00:00:00')
    next.setDate(next.getDate() + 1)
    cells.push({ iso: toISO(next), day: next.getDate(), inMonth: false })
  }
  return cells
}

// ─────────────────────────────────────────────────────────────────────────────
// 단위 팝오버

interface UnitPopoverProps {
  chartMode: ChartMode
  selectedHour: number
  onChartModeChange: (m: ChartMode) => void
  onSelectedHourChange: (h: number) => void
  onClose: () => void
}

function UnitPopover({ chartMode, selectedHour, onChartModeChange, onSelectedHourChange, onClose }: UnitPopoverProps) {
  return (
    <div className="absolute z-50 left-0 top-full mt-2">
      <svg width="16" height="8" viewBox="0 0 16 8" className="absolute -top-2 left-3">
        <path d="M0 8 L8 0 L16 8 Z" fill="white" stroke="#1D9E75" strokeWidth="1" />
      </svg>
      <div className="rounded-xl border border-brand/40 bg-white shadow-xl w-[280px]">
        <div className="flex items-center justify-between border-b border-line px-3 py-2">
          <p className="font-mono text-[10px] uppercase tracking-wider text-ink-muted">조회 단위</p>
          <button type="button" onClick={onClose} className="text-ink-muted hover:text-ink font-mono text-[11px]">✕</button>
        </div>
        <div className="p-3 space-y-3">
          <div className="flex gap-1">
            {(['hourly', 'daily'] as const).map(m => (
              <button key={m} type="button" onClick={() => onChartModeChange(m)}
                className={['flex-1 rounded-md border px-3 py-1.5 font-mono text-[11px]',
                  chartMode === m ? 'border-brand/30 bg-brand/10 text-brand' : 'border-line text-ink-muted hover:bg-surface-subtle'].join(' ')}>
                {m === 'hourly' ? '시간별' : '일별'}
              </button>
            ))}
          </div>
          {chartMode === 'daily' && (
            <div>
              <p className="font-mono text-[9px] uppercase tracking-wider text-ink-muted mb-1">기준 시각</p>
              <select value={selectedHour} onChange={e => onSelectedHourChange(Number(e.target.value))}
                className="w-full rounded-md border border-line bg-surface-card px-2 py-1 font-mono text-[11px] text-ink focus:outline-none">
                {Array.from({ length: 24 }, (_, i) => (
                  <option key={i} value={i}>{hourLabel(i)}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// 기준 모드 팝오버

interface BaselineModePopoverProps {
  mode: BaselineMode
  onChange: (m: BaselineMode) => void
  onCancel: () => void
}

function BaselineModePopover({ mode, onChange, onCancel }: BaselineModePopoverProps) {
  return (
    <div className="absolute z-50 left-0 top-full mt-2">
      <svg width="16" height="8" viewBox="0 0 16 8" className="absolute -top-2 left-3">
        <path d="M0 8 L8 0 L16 8 Z" fill="white" stroke="#1D9E75" strokeWidth="1" />
      </svg>
      <div className="rounded-xl border border-brand/40 bg-white shadow-xl w-[260px]">
        <div className="flex items-center justify-between border-b border-line px-3 py-2">
          <p className="font-mono text-[10px] uppercase tracking-wider text-ink-muted">기준 측정값</p>
          <button type="button" onClick={onCancel} className="text-ink-muted hover:text-ink font-mono text-[11px]">✕</button>
        </div>
        <div className="p-2 space-y-1">
          {[
            { v: 'range' as BaselineMode, label: '기간 첫 측정값', desc: '조회 기간 내 시간순 첫 row' },
            { v: 'allTime' as BaselineMode, label: '센서 전체 기간 최초값', desc: 'API 전체 데이터의 oldest' },
          ].map(opt => (
            <button key={opt.v} type="button" onClick={() => onChange(opt.v)}
              className={['w-full text-left px-2 py-1.5 rounded flex items-start gap-2 transition-colors',
                mode === opt.v ? 'bg-brand/10' : 'hover:bg-surface-subtle'].join(' ')}>
              <span className={['mt-0.5 w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center shrink-0',
                mode === opt.v ? 'border-brand' : 'border-line'].join(' ')}>
                {mode === opt.v && <span className="w-1.5 h-1.5 rounded-full bg-brand" />}
              </span>
              <span className="flex-1">
                <p className={['font-mono text-[11px]', mode === opt.v ? 'text-brand font-medium' : 'text-ink'].join(' ')}>{opt.label}</p>
                <p className="font-mono text-[9px] text-ink-muted mt-0.5">{opt.desc}</p>
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// 보정 팝오버

interface CorrectionPopoverProps {
  value: string
  unit: string
  saving: boolean
  readOnly: boolean
  onChange: (v: string) => void
  onApply: () => void
  onCancel: () => void
}

function CorrectionPopover({ value, unit, saving, readOnly, onChange, onApply, onCancel }: CorrectionPopoverProps) {
  const [draft, setDraft] = useState(value)
  useEffect(() => { setDraft(value) }, [value])

  return (
    <div className="absolute z-50 left-0 top-full mt-2">
      <svg width="16" height="8" viewBox="0 0 16 8" className="absolute -top-2 left-3">
        <path d="M0 8 L8 0 L16 8 Z" fill="white" stroke="#1D9E75" strokeWidth="1" />
      </svg>
      <div className="rounded-xl border border-brand/40 bg-white shadow-xl w-[300px]">
        <div className="flex items-center justify-between border-b border-line px-3 py-2">
          <p className="font-mono text-[10px] uppercase tracking-wider text-ink-muted">보정값</p>
          <button type="button" onClick={onCancel} className="text-ink-muted hover:text-ink font-mono text-[11px]">✕</button>
        </div>
        <div className="p-3 space-y-2">
          <div className="flex items-center gap-2">
            <input type="number" step="0.01" min="-100" max="100" placeholder="0.00"
              value={draft}
              onChange={e => { if (!readOnly) { setDraft(e.target.value); onChange(e.target.value) } }}
              onWheel={e => e.currentTarget.blur()}
              readOnly={readOnly}
              className={`flex-1 rounded-md border border-brand/40 bg-surface-card px-2 py-1 font-mono text-[11px] text-ink text-right focus:outline-none focus:ring-1 focus:ring-brand/40${readOnly ? ' cursor-default opacity-70' : ''}`} />
            <span className="font-mono text-[11px] text-ink-muted shrink-0">{unit}</span>
          </div>
          <p className="font-mono text-[10px] text-ink-muted leading-snug">-100 ~ 100 사이의 숫자만 입력 가능합니다.</p>
          {!readOnly && (
            <div className="flex justify-end gap-2 pt-1">
              <button type="button" onClick={onCancel}
                className="font-mono text-[11px] text-ink-muted hover:text-ink px-2">취소</button>
              <button type="button" disabled={saving} onClick={onApply}
                className="rounded-md bg-sensor-normal px-3 py-1 font-mono text-[11px] text-white disabled:opacity-50">
                {saving ? '저장중' : '✓ 적용'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
