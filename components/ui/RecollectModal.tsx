import { useState } from 'react'
import { inputCls, selectCls, labelCls } from './formStyles'

export function RecollectModal({ sensors, onSubmit, onClose }: {
  sensors: any[]
  onSubmit: (body: { sensor_id: number; date_from: string; date_to: string; reason: string }) => void
  onClose: () => void
}) {
  const today = (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}` })()
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
