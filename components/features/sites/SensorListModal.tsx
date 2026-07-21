'use client'

import { useRouter } from 'next/navigation'

const statusStyle: Record<string, { bg: string; text: string; label: string }> = {
  normal:  { bg: 'bg-sensor-normalbg border-sensor-normalborder',   text: 'text-sensor-normaltext',  label: '정상' },
  warning: { bg: 'bg-sensor-warningbg border-sensor-warningborder', text: 'text-sensor-warningtext', label: '주의' },
  danger:  { bg: 'bg-sensor-dangerbg border-sensor-dangerborder',   text: 'text-sensor-dangertext',  label: '위험' },
  offline: { bg: 'bg-sensor-offlinebg border-sensor-offlineborder', text: 'text-sensor-offlinetext', label: '오프라인' },
}

export function SensorListModal({ site, sensors, onClose }: { site: any; sensors: any[]; onClose: () => void }) {
  const siteSensors = sensors.filter((s: any) => s.site_code === site.site_code)
  const router = useRouter()

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/30 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="geo-card flex w-full max-w-md animate-fade-in-up flex-col" style={{ maxHeight: '80vh' }}
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-line px-6 py-4">
          <div>
            <h2 className="text-sm font-semibold text-ink">{site.name} 센서 목록</h2>
            <p className="font-mono text-xs text-ink-muted">총 {siteSensors.length}개</p>
          </div>
          <button onClick={onClose} className="rounded-md p-1 text-ink-muted hover:bg-surface-subtle hover:text-ink">✕</button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {siteSensors.length === 0 ? (
            <div className="py-10 text-center font-mono text-sm text-ink-muted">등록된 센서가 없습니다.</div>
          ) : (
            <div className="divide-y divide-line">
              {siteSensors.map((sensor: any) => {
                const st = statusStyle[sensor.status] || statusStyle['offline']
                return (
                  <button key={sensor.id} type="button"
                    onClick={() => { onClose(); router.push(`/sensors/${sensor.id}`) }}
                    className="flex w-full items-center gap-4 px-6 py-3.5 text-left transition-colors hover:bg-surface-subtle">
                    <div className="flex-1 min-w-0">
                      <p className="font-mono text-sm font-semibold text-brand">{sensor.name || sensor.id}</p>
                      <p className="text-xs text-ink-muted truncate">{sensor.name}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-mono text-sm font-medium text-ink">
                        {sensor.status === 'offline' ? '—' : `${parseFloat(sensor.current_value || 0).toFixed(1)} ${sensor.unit || ''}`}
                      </p>
                    </div>
                    <span className={`shrink-0 rounded-full border px-2.5 py-0.5 font-mono text-[11px] font-medium ${st.bg} ${st.text}`}>
                      {st.label}
                    </span>
                    <span className="text-ink-muted text-xs">→</span>
                  </button>
                )
              })}
            </div>
          )}
        </div>
        <div className="border-t border-line px-6 py-4">
          <button onClick={onClose} className="w-full rounded-lg border border-line px-4 py-2 text-sm font-medium text-ink-sub hover:border-line-strong hover:text-ink">닫기</button>
        </div>
      </div>
    </div>
  )
}
