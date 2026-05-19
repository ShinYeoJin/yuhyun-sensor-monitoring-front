'use client'

import { useEffect, useMemo, useState } from 'react'

type ChartMode = 'hourly' | 'daily'

export interface MeasurementLogTableProps {
  tableData: any[]
  tableDataAsc: any[]
  chartMode: ChartMode
  unit: string
  sensorCode?: string
  logLabel?: string
  globalInitReading: any
  initValue: number
  dateFrom: string
  dateTo: string
  baselineDate?: string
  correctionValue?: string
}

const PAGE_SIZE_OPTIONS = [10, 15, 30] as const

const fmtDate = (s: string) => {
  if (!s) return ''
  const [y, m, d] = s.split('-')
  return `${y}.${m}.${d}`
}

const fmtMD = (s: string) => {
  if (!s) return ''
  const [, m, d] = s.split('-')
  return `${m}.${d}`
}

const statusPill = (status: string, isGap: boolean) => {
  if (isGap) return { cls: 'bg-surface-subtle border-line text-ink-muted', dot: 'bg-ink-muted/40', label: '미수신' }
  if (status === 'danger') return { cls: 'bg-sensor-dangerbg border-sensor-dangerborder text-sensor-dangertext', dot: 'bg-sensor-danger', label: '위험' }
  if (status === 'warning') return { cls: 'bg-sensor-warningbg border-sensor-warningborder text-sensor-warningtext', dot: 'bg-sensor-warning', label: '주의' }
  return { cls: 'bg-sensor-normalbg border-sensor-normalborder text-sensor-normaltext', dot: 'bg-sensor-normal', label: '정상' }
}

const fmtDiff = (v: number) =>
  v > 0 ? <span className="text-red-500">▲ {v.toFixed(4)}</span>
  : v < 0 ? <span className="text-blue-500">▼ {Math.abs(v).toFixed(4)}</span>
  : <span>0.0000</span>

export function MeasurementLogTable(props: MeasurementLogTableProps) {
  const {
    tableData, tableDataAsc, chartMode, unit, logLabel,
    globalInitReading, initValue,
    dateFrom, dateTo, baselineDate, correctionValue,
  } = props

  const [pageSize, setPageSize] = useState<number>(15)
  const [tablePage, setTablePage] = useState(1)

  const totalPages = Math.max(1, Math.ceil(tableData.length / pageSize))

  useEffect(() => {
    setTablePage(p => Math.min(Math.max(1, p), totalPages))
  }, [tableData.length, pageSize, totalPages])

  const counts = useMemo(() => {
    const c = { normal: 0, warning: 0, danger: 0, gap: 0 }
    tableData.forEach((r: any) => {
      const isGap = r.status === 'gap' || r.value === null
      if (isGap) c.gap++
      else if (r.status === 'danger') c.danger++
      else if (r.status === 'warning') c.warning++
      else c.normal++
    })
    return c
  }, [tableData])

  const latestNonGapTs = useMemo(() => {
    const r = tableData.find((r: any) => !(r.status === 'gap' || r.value === null))
    return r?.timestamp
  }, [tableData])

  const pagedTable = tableData.slice((tablePage - 1) * pageSize, tablePage * pageSize)

  const pageNumbers = useMemo(() => {
    const ps: number[] = []
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) ps.push(i)
    } else {
      ps.push(1)
      if (tablePage > 3) ps.push(-1)
      for (let i = Math.max(2, tablePage - 1); i <= Math.min(totalPages - 1, tablePage + 1); i++) ps.push(i)
      if (tablePage < totalPages - 2) ps.push(-1)
      ps.push(totalPages)
    }
    return ps
  }, [totalPages, tablePage])

  const dateRangeText = useMemo(() => {
    if (!dateFrom || !dateTo) return ''
    const fromStr = fmtDate(dateFrom)
    const sameYear = dateFrom.split('-')[0] === dateTo.split('-')[0]
    return `${fromStr} — ${sameYear ? fmtMD(dateTo) : fmtDate(dateTo)}`
  }, [dateFrom, dateTo])

  const baselineDisplay = baselineDate ? fmtMD(baselineDate) : '—'
  const showCorrection = !!(correctionValue && correctionValue !== '0' && correctionValue !== '')

  return (
    <div className="rounded-xl border border-line bg-surface-card overflow-hidden shadow-sm">
      <div className="flex items-center justify-between px-5 py-3 border-b border-line">
        <div className="flex items-baseline gap-3 flex-wrap">
          <h2 className="text-sm font-semibold text-ink">측정 데이터 로그</h2>
          <span className="font-mono text-[11px] text-ink-muted">
            총 <strong className="text-ink tabular-nums">{tableData.length}</strong>건
          </span>
          {logLabel && (
            <span className="font-mono text-[11px] text-brand">({logLabel})</span>
          )}
          <span className="font-mono text-[10px] text-ink-muted">·</span>
          <span className="font-mono text-[11px] text-sensor-normaltext tabular-nums">정상 {counts.normal}</span>
          {counts.warning > 0 && <span className="font-mono text-[11px] text-sensor-warningtext tabular-nums">주의 {counts.warning}</span>}
          {counts.danger > 0 && <span className="font-mono text-[11px] text-sensor-dangertext tabular-nums">위험 {counts.danger}</span>}
          {counts.gap > 0 && <span className="font-mono text-[11px] text-ink-muted tabular-nums">미수신 {counts.gap}</span>}
        </div>
      </div>

      <div className="flex items-center gap-2 flex-wrap px-5 py-1.5 bg-surface-subtle/40 border-b border-line/60">
        <span className="font-mono text-[9px] uppercase tracking-wider text-ink-muted">조회 중</span>
        {dateRangeText && (
          <span className="font-mono text-[10px] text-ink-sub tabular-nums">{dateRangeText}</span>
        )}
        <span className="font-mono text-[10px] text-ink-muted">·</span>
        <span className="font-mono text-[10px] text-ink-sub">{chartMode === 'hourly' ? '시간별' : '일별'}</span>
        {baselineDate && globalInitReading !== null && (
          <>
            <span className="font-mono text-[10px] text-ink-muted">·</span>
            <span className="font-mono text-[10px] text-ink-sub tabular-nums">
              기준 {baselineDisplay} ({initValue.toFixed(4)} {unit})
            </span>
          </>
        )}
        {showCorrection && (
          <>
            <span className="font-mono text-[10px] text-ink-muted">·</span>
            <span className="font-mono text-[10px] text-ink-sub tabular-nums">보정 {correctionValue} {unit}</span>
          </>
        )}
      </div>

      <table className="w-full text-xs">
        <colgroup>
          {chartMode === 'daily' ? (
            <>
              <col style={{ width: '10%' }} />
              <col style={{ width: '14%' }} />
              <col style={{ width: '20%' }} />
              <col style={{ width: '20%' }} />
              <col style={{ width: '20%' }} />
              <col style={{ width: '16%' }} />
            </>
          ) : (
            <>
              <col style={{ width: '12%' }} />
              <col style={{ width: '14%' }} />
              <col style={{ width: '24%' }} />
              <col style={{ width: '30%' }} />
              <col style={{ width: '20%' }} />
            </>
          )}
        </colgroup>
        <thead className="bg-surface-subtle/60 border-b border-line">
          <tr>
            <th className="px-5 py-2 text-left font-mono text-[10px] uppercase tracking-wider text-ink-muted font-semibold">날짜</th>
            <th className="px-3 py-2 text-left font-mono text-[10px] uppercase tracking-wider text-ink-muted font-semibold">
              {chartMode === 'daily' ? '시각(일평균)' : '시각'}
            </th>
            <th className="px-3 py-2 text-right font-mono text-[10px] uppercase tracking-wider text-ink-muted font-semibold">
              측정값 <span className="normal-case text-ink-muted/70">({unit})</span>
            </th>
            {chartMode === 'daily' && (
              <th className="px-3 py-2 text-left font-mono text-[10px] uppercase tracking-wider text-ink-muted font-semibold">일일 변화량</th>
            )}
            <th className="px-3 py-2 text-left font-mono text-[10px] uppercase tracking-wider text-ink-muted font-semibold">
              누적 변화량
              {baselineDate && <span className="normal-case font-normal text-ink-muted/70 ml-1">기준 {baselineDisplay}</span>}
            </th>
            <th className="px-3 py-2 text-left font-mono text-[10px] uppercase tracking-wider text-ink-muted font-semibold">상태</th>
          </tr>
        </thead>
        <tbody className="font-mono">
          {pagedTable.length === 0 ? (
            <tr>
              <td colSpan={chartMode === 'daily' ? 6 : 5} className="px-4 py-8 text-center font-mono text-xs text-ink-muted">
                데이터가 없습니다.
              </td>
            </tr>
          ) : pagedTable.map((row: any, i: number) => {
            const isGap = row.status === 'gap' || row.value === null
            const d = new Date(row.timestamp)
            const curVal = isGap ? null : parseFloat(String(row.value))
            const rowIdxAsc = tableDataAsc.findIndex((r: any) => r.timestamp === row.timestamp)
            const prevRow = rowIdxAsc > 0 ? tableDataAsc.slice(0, rowIdxAsc).reverse().find((r: any) => r.value !== null) : null
            const cumulativeDiff = (curVal != null && globalInitReading !== null) ? parseFloat((curVal - initValue).toFixed(4)) : null
            const dailyDiff = curVal != null && prevRow?.value != null ? parseFloat((curVal - parseFloat(String(prevRow.value))).toFixed(4)) : null

            const dateStr = d.toLocaleDateString('ko-KR', { month: '2-digit', day: '2-digit' })
            const weekdayStr = d.toLocaleDateString('ko-KR', { weekday: 'long' })
            const timeStr = chartMode === 'daily'
              ? '오후 12:00'
              : d.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
            const isSameDateAsPrev = i > 0 && new Date(pagedTable[i - 1].timestamp).toDateString() === d.toDateString()
            const isLatest = !isGap && row.timestamp === latestNonGapTs

            const pill = statusPill(row.status, isGap)

            return (
              <tr key={i} className={`group border-b border-line/50 transition-colors ${isLatest ? 'bg-brand/[0.03] hover:bg-brand/[0.06]' : 'hover:bg-surface-subtle/40'}`}>
                <td className="px-5 py-2.5">
                  {isSameDateAsPrev ? (
                    <span className="font-mono text-[10px] text-ink-muted/50">″</span>
                  ) : (
                    <>
                      <div className="font-mono font-medium text-ink text-[11px]">{dateStr}</div>
                      <div className="font-mono text-[9px] text-ink-muted leading-tight">{weekdayStr}</div>
                    </>
                  )}
                </td>
                <td className="px-3 py-2.5">
                  {isLatest ? (
                    <div className="flex items-baseline gap-1.5">
                      <span className="font-mono text-[12px] font-semibold text-ink tabular-nums">{timeStr}</span>
                      <span className="font-mono text-[9px] px-1 py-0.5 rounded bg-brand/10 text-brand">최신</span>
                    </div>
                  ) : (
                    <span className={`font-mono text-[12px] tabular-nums ${isGap ? 'text-ink-muted' : 'font-medium text-ink-sub'}`}>{timeStr}</span>
                  )}
                </td>
                <td className="px-3 py-2.5 text-right">
                  {isGap ? (
                    <span className="font-mono text-[12px] text-ink-muted/60 tabular-nums">— — — —</span>
                  ) : (
                    <span className={`font-mono ${isLatest ? 'text-[13px] font-semibold' : 'text-[12px] font-medium'} text-ink tabular-nums`}>
                      {Number(row.value).toFixed(4)} {unit}
                    </span>
                  )}
                </td>
                {chartMode === 'daily' && (
                  <td className="px-3 py-2.5 font-mono text-[11px]">
                    {isGap || dailyDiff == null ? <span className="text-ink-muted/60">—</span> : fmtDiff(dailyDiff)}
                  </td>
                )}
                <td className="px-3 py-2.5 font-mono text-[11px]">
                  {isGap || cumulativeDiff == null ? <span className="text-ink-muted/60">—</span> : fmtDiff(cumulativeDiff)}
                </td>
                <td className="px-3 py-2.5">
                  <span className={`inline-flex items-center gap-1.5 rounded-md ${pill.cls} border px-2 py-0.5 font-mono text-[10px]`}>
                    <span className={`inline-block w-1.5 h-1.5 rounded-full ${pill.dot}`} />
                    {pill.label}
                  </span>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>

      {tableData.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr] items-center gap-3 border-t border-line bg-surface-subtle/40 px-5 py-3">
          <div className="font-mono text-[11px] text-ink-sub justify-self-center sm:justify-self-start">
            <strong className="text-ink tabular-nums">
              {Math.min((tablePage - 1) * pageSize + 1, tableData.length)} — {Math.min(tablePage * pageSize, tableData.length)}
            </strong>
            <span className="text-ink-muted"> / {tableData.length}건</span>
          </div>

          <div className="flex items-center gap-1 justify-self-center">
            <button type="button" disabled={tablePage === 1} onClick={() => setTablePage(1)}
              className="rounded-md border border-line w-8 h-8 flex items-center justify-center font-mono text-[12px] text-ink-sub transition-colors enabled:hover:bg-brand enabled:hover:text-white enabled:hover:border-brand disabled:opacity-30 disabled:cursor-not-allowed">«</button>
            <button type="button" disabled={tablePage === 1} onClick={() => setTablePage(p => p - 1)}
              className="rounded-md border border-line w-8 h-8 flex items-center justify-center font-mono text-[12px] text-ink-sub transition-colors enabled:hover:bg-brand enabled:hover:text-white enabled:hover:border-brand disabled:opacity-30 disabled:cursor-not-allowed">‹</button>
            <div className="flex items-center gap-0.5 mx-1">
              {pageNumbers.map((n, idx) => n === -1 ? (
                <span key={`e${idx}`} className="font-mono text-[11px] text-ink-muted px-1">…</span>
              ) : (
                <button key={n} type="button" onClick={() => setTablePage(n)}
                  className={`rounded-md w-8 h-8 flex items-center justify-center font-mono text-[12px] transition-all ${
                    tablePage === n
                      ? 'bg-brand text-white font-semibold shadow-md shadow-brand/30 scale-105'
                      : 'text-ink-sub border border-line hover:bg-brand/10 hover:text-brand hover:border-brand/40'
                  }`}>{n}</button>
              ))}
            </div>
            <button type="button" disabled={tablePage === totalPages} onClick={() => setTablePage(p => p + 1)}
              className="rounded-md border border-line w-8 h-8 flex items-center justify-center font-mono text-[12px] text-ink-sub transition-colors enabled:hover:bg-brand enabled:hover:text-white enabled:hover:border-brand disabled:opacity-30 disabled:cursor-not-allowed">›</button>
            <button type="button" disabled={tablePage === totalPages} onClick={() => setTablePage(totalPages)}
              className="rounded-md border border-line w-8 h-8 flex items-center justify-center font-mono text-[12px] text-ink-sub transition-colors enabled:hover:bg-brand enabled:hover:text-white enabled:hover:border-brand disabled:opacity-30 disabled:cursor-not-allowed">»</button>
          </div>

          <div className="flex items-center gap-1.5 justify-self-center sm:justify-self-end">
            <div className="relative">
              <select value={pageSize} onChange={(e) => setPageSize(Number(e.target.value))}
                className="appearance-none rounded-md border border-line bg-white pl-3 pr-7 py-1.5 font-mono text-[11px] text-ink cursor-pointer transition-colors hover:border-brand/40 focus:outline-none focus:border-brand/60 focus:ring-1 focus:ring-brand/20">
                {PAGE_SIZE_OPTIONS.map(n => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
              <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 font-mono text-[9px] text-ink-muted">▾</span>
            </div>
            <span className="font-mono text-[10px] text-ink-muted">/쪽</span>
          </div>
        </div>
      )}
    </div>
  )
}
