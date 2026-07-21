export function UserInfoModal({ user, onClose }: { user: any; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/30 backdrop-blur-sm" onClick={onClose}>
      <div className="geo-card w-full max-w-sm animate-fade-in-up p-6" onClick={e => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-ink">담당자 정보</h2>
          <button onClick={onClose} className="rounded-md p-1 text-ink-muted hover:bg-surface-subtle hover:text-ink">✕</button>
        </div>
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-brand/30 bg-brand/10 font-mono text-lg font-semibold text-brand">
            {user.username?.[0]?.toUpperCase()}
          </div>
          <div>
            <p className="font-semibold text-ink">{user.username}</p>
            <p className="font-mono text-xs text-ink-muted">{user.role}</p>
          </div>
        </div>
        <dl className="space-y-2.5 text-sm">
          <div className="flex gap-3">
            <dt className="w-24 shrink-0 font-mono text-[10px] text-ink-muted">이메일</dt>
            <dd className="font-medium text-ink">{user.email || '—'}</dd>
          </div>
          <div className="flex gap-3">
            <dt className="w-24 shrink-0 font-mono text-[10px] text-ink-muted">핸드폰</dt>
            <dd className="font-medium text-ink">
              {user.phone
                ? <a href={`tel:${user.phone}`} className="text-brand hover:underline">{user.phone}</a>
                : '—'}
            </dd>
          </div>
          <div className="flex gap-3">
            <dt className="w-24 shrink-0 font-mono text-[10px] text-ink-muted">계정 상태</dt>
            <dd className="font-medium text-ink">{user.is_active ? '활성' : '비활성화'}</dd>
          </div>
        </dl>
        <div className="mt-5 flex gap-2">
          <button onClick={onClose} className="flex-1 rounded-lg border border-line px-4 py-2 text-sm font-medium text-ink-sub hover:bg-surface-subtle">닫기</button>
          <a href="/users" className="flex-1 rounded-lg bg-brand px-4 py-2 text-center text-sm font-medium text-white hover:bg-brand-hover">사용자 관리 →</a>
        </div>
      </div>
    </div>
  )
}
