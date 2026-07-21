import type { ThresholdRange } from '@/types'
import { labelCls } from './formStyles'

export function ThresholdSection({ threshold, unit, onChange }: {
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
