import { SiteStatusBar } from '@/components/features/sites/SiteStatusBar'
import { SiteWithStatus, statusStyle } from '@/components/features/sites/types'

export function SiteCard({ site, dbUsers, canManage, onUserClick, onSensorClick, onEdit, onDelete }: {
  site: SiteWithStatus
  dbUsers: any[]
  canManage: boolean
  onUserClick: (user: any) => void
  onSensorClick: (site: SiteWithStatus) => void
  onEdit: (site: SiteWithStatus) => void
  onDelete: (site: SiteWithStatus) => void
}) {
  const st = statusStyle[site.liveStatus] || statusStyle['normal']

  return (
    <div id={`site-card-${site.dbId}`} className={['geo-card flex flex-col p-5 transition-shadow hover:shadow-cardhover', site.liveStatus === 'danger' ? 'danger-flash' : ''].join(' ')}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h2 className="font-semibold text-ink">{site.name}</h2>
          <p className="font-mono text-xs text-ink-muted">{site.location}</p>
        </div>
        <span className={`shrink-0 whitespace-nowrap rounded-full border px-2.5 py-0.5 font-mono text-[11px] font-medium ${st.badge}`}>
          {site.liveStatus === 'danger' && <span className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-sensor-danger" />}
          {st.label}
        </span>
      </div>
      <p className="mt-2 text-xs text-ink-sub">{site.description || '—'}</p>
      <SiteStatusBar normal={site.liveNormal} warning={site.liveWarning} danger={site.liveDanger} total={site.liveTotal} />
      <div className="mt-2 flex flex-wrap gap-3 font-mono text-[11px]">
        <span className="text-ink-muted">전체 <strong className="text-ink">{site.liveTotal}</strong></span>
        <span className="text-sensor-normaltext">정상 <strong>{site.liveNormal}</strong></span>
        {site.liveWarning > 0 && <span className="text-sensor-warningtext">주의 <strong>{site.liveWarning}</strong></span>}
        {site.liveDanger  > 0 && <span className="text-sensor-dangertext">위험 <strong>{site.liveDanger}</strong></span>}
        {site.liveOffline > 0 && <span className="text-ink-muted">오프라인 <strong>{site.liveOffline}</strong></span>}
      </div>
      <div className="mt-3 border-t border-line pt-3">
        <p className="mb-1.5 font-mono text-[10px] text-ink-muted">담당자</p>
        {!site.managers || site.managers.length === 0 ? (
          <p className="font-mono text-[11px] text-ink-muted">미배정</p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {site.managers.map((username: string) => {
              const user = dbUsers.find((u: any) => u.username === username)
              return (
                <button key={username} type="button"
                  onClick={() => user && onUserClick(user)}
                  className={['inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 font-mono text-[11px] transition-colors',
                    !user ? 'border-line bg-surface-subtle text-ink-sub cursor-default' :
                    user.is_active ? 'border-brand/30 bg-brand/10 text-brand hover:border-brand/50 hover:bg-brand/20' :
                    'border-line-strong bg-surface-muted text-ink-muted hover:bg-surface-subtle'].join(' ')}>
                  <span className={['flex h-4 w-4 items-center justify-center rounded-full font-mono text-[9px] font-semibold',
                    user?.is_active ? 'bg-brand/20 text-brand' : 'bg-surface-muted text-ink-muted'].join(' ')}>
                    {username?.[0]?.toUpperCase()}
                  </span>
                  {username}
                  {user && <span className="text-[9px] opacity-60">↗</span>}
                </button>
              )
            })}
          </div>
        )}
      </div>
      <div className="mt-3 flex items-center justify-between border-t border-line pt-3">
        <button onClick={() => onSensorClick(site)} className="font-mono text-xs text-brand hover:underline">센서 보기 →</button>
        <div className="flex gap-2">
          {canManage && (
            <>
              <button onClick={() => onEdit(site)}
                className="rounded-lg border border-line px-3 py-1.5 font-mono text-xs text-ink-sub transition-colors hover:border-brand/40 hover:bg-brand/10 hover:text-brand">편집</button>
              <button onClick={() => onDelete(site)}
                className="rounded-lg border border-line px-3 py-1.5 font-mono text-xs text-ink-sub transition-colors hover:border-sensor-dangerborder hover:bg-sensor-dangerbg hover:text-sensor-dangertext">삭제</button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
