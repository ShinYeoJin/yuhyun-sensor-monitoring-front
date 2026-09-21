import { SiteForm } from '@/components/features/sites/types'

const inputCls = 'w-full rounded-lg border border-line bg-surface-subtle px-3 py-2 text-sm text-ink outline-none transition-colors placeholder:text-ink-muted focus:border-brand/50 focus:ring-2 focus:ring-brand/10'
const labelCls = 'mb-1.5 block font-mono text-[10px] font-semibold uppercase tracking-wider text-ink-muted'

export function SiteModal({ mode, form, onChange, onSubmit, onClose, users, sensors, siteCode, siteId }: {
  mode: 'add' | 'edit'; form: SiteForm
  onChange: (f: SiteForm) => void; onSubmit: () => void; onClose: () => void
  users: any[]; sensors: any[]; siteCode: string; siteId?: number
}) {
  const isValid = form.name.trim() !== '' && form.location.trim() !== ''
  const toggleManager = (username: string) => {
    const next = form.managers.includes(username)
      ? form.managers.filter(m => m !== username)
      : [...form.managers, username]
    onChange({ ...form, managers: next })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/30 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="geo-card flex w-full max-w-md animate-fade-in-up flex-col" style={{ maxHeight: '90vh' }}
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-line px-6 py-4">
          <h2 className="text-sm font-semibold text-ink">{mode === 'add' ? '현장 추가' : '현장 편집'}</h2>
          <button onClick={onClose} className="rounded-md p-1 text-ink-muted hover:bg-surface-subtle hover:text-ink">✕</button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          <div>
            <label className={labelCls}>현장명 *</label>
            <input type="text" value={form.name} onChange={e => onChange({ ...form, name: e.target.value })} placeholder="현장 A" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>위치 *</label>
            <input type="text" value={form.location} onChange={e => onChange({ ...form, location: e.target.value })} placeholder="서울특별시 마포구" className={inputCls} />
          </div>
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label className={labelCls + ' mb-0'}>현장 좌표</label>
              <button
                type="button"
                onClick={async () => {
                  if (!form.location.trim()) {
                    alert('위치를 먼저 입력해주세요.')
                    return
                  }
                  try {
                    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://yuhyun-sensor-monitoring-back.onrender.com'
                    const res = await fetch(
                      `${apiUrl}/api/geocode?query=${encodeURIComponent(form.location)}`
                    )
                    const data = await res.json()
                    if (data.documents && data.documents.length > 0) {
                      const { x, y } = data.documents[0]
                      onChange({ ...form, latitude: parseFloat(y), longitude: parseFloat(x) })
                    } else {
                      alert('주소를 찾을 수 없습니다. 더 구체적인 주소를 입력해주세요.')
                    }
                  } catch {
                    alert('좌표 검색 중 오류가 발생했습니다.')
                  }
                }}
                className="rounded-lg border border-brand/40 bg-brand/10 px-2.5 py-1 font-mono text-[10px] text-brand hover:bg-brand/20 transition-colors"
              >
                📍 위치로 좌표 자동 검색
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className={labelCls}>위도</label>
                <input
                  type="number"
                  step="any"
                  value={form.latitude ?? ''}
                  onChange={e => onChange({ ...form, latitude: e.target.value === '' ? undefined : parseFloat(e.target.value) })}
                  className={inputCls}
                  placeholder="자동 입력"
                />
              </div>
              <div>
                <label className={labelCls}>경도</label>
                <input
                  type="number"
                  step="any"
                  value={form.longitude ?? ''}
                  onChange={e => onChange({ ...form, longitude: e.target.value === '' ? undefined : parseFloat(e.target.value) })}
                  className={inputCls}
                  placeholder="자동 입력"
                />
              </div>
            </div>
            {form.latitude && form.longitude && (
              <p className="mt-1 font-mono text-[10px] text-sensor-normaltext">
                ✓ 좌표 설정됨 ({Number(form.latitude).toFixed(4)}, {Number(form.longitude).toFixed(4)})
              </p>
            )}
          </div>
          <div>
            <label className={labelCls}>설명</label>
            <textarea rows={2} value={form.description} onChange={e => onChange({ ...form, description: e.target.value })}
              placeholder="현장에 대한 설명을 입력하세요." className={`${inputCls} resize-none`} />
          </div>
          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className={labelCls + ' mb-0'}>담당자 <span className="ml-1 font-normal normal-case tracking-normal text-ink-muted">(복수 선택 가능)</span></label>
              {form.managers.length > 0 && (
                <button type="button" onClick={() => onChange({ ...form, managers: [] })}
                  className="font-mono text-[10px] text-ink-muted hover:text-sensor-dangertext transition-colors">전체 해제</button>
              )}
            </div>
            {users.length === 0 ? (
              <p className="font-mono text-[11px] text-ink-muted">등록된 사용자가 없습니다.</p>
            ) : (
              <div className="rounded-lg border border-line overflow-hidden">
                {users.filter((u: any) => u && u.username).map((user: any, idx: number) => {
                  const isSelected = form.managers.includes(user.username)
                  return (
                    <button key={user.id} type="button" onClick={() => toggleManager(user.username)}
                      className={['flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors',
                        idx !== 0 ? 'border-t border-line' : '',
                        isSelected ? 'bg-brand/10' : 'bg-surface-card hover:bg-surface-subtle'].join(' ')}>
                      <span className={['flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-all',
                        isSelected ? 'border-brand bg-brand text-white' : 'border-line-strong bg-surface-card'].join(' ')}>
                        {isSelected && <svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                      </span>
                      <span className={['flex h-6 w-6 shrink-0 items-center justify-center rounded-full font-mono text-[11px] font-semibold',
                        isSelected ? 'bg-brand/20 text-brand' : 'bg-surface-muted text-ink-sub'].join(' ')}>
                        {user.username?.[0]?.toUpperCase() || '?'}
                      </span>
                      <span className={`flex-1 text-sm font-medium ${isSelected ? 'text-brand' : 'text-ink'}`}>{user.username}</span>
                      <span className="font-mono text-[10px] text-ink-muted">{user.role}</span>
                    </button>
                  )
                })}
              </div>
            )}
            {form.managers.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {form.managers.map(name => (
                  <span key={name} className="inline-flex items-center gap-1 rounded-full border border-brand/30 bg-brand/10 pl-2.5 pr-1.5 py-0.5 font-mono text-[11px] text-brand">
                    {name}
                    <button type="button" onClick={() => toggleManager(name)} className="ml-0.5 rounded-full hover:bg-brand/20 p-0.5 leading-none">✕</button>
                  </span>
                ))}
              </div>
            )}
            {form.managers.length === 0 && <p className="mt-1.5 font-mono text-[10px] text-ink-muted">담당자를 선택하지 않으면 미배정으로 등록됩니다.</p>}
          </div>
          {/* 평면도 업로드 */}
          <div>
            <label className={labelCls}>현장 평면도</label>
            <div className="rounded-xl border border-line overflow-hidden">
              {form.has_floor_plan && siteId ? (
                <div className="relative">
                  <img
                    src={`${process.env.NEXT_PUBLIC_API_URL || 'https://yuhyun-sensor-monitoring-back.onrender.com'}/api/sites/${siteId}/floor-plan-image?t=${Date.now()}`}
                    alt="평면도"
                    className="w-full object-contain max-h-48"
                  />
                  <button
                    type="button"
                    onClick={() => onChange({ ...form, has_floor_plan: false })}
                    className="absolute top-2 right-2 rounded-full bg-ink/50 px-2 py-1 font-mono text-[10px] text-white hover:bg-ink/70"
                  >
                    ✕ 제거
                  </button>
                </div>
              ) : mode === 'add' ? (
                <div className="flex flex-col items-center justify-center gap-2 bg-surface-subtle py-6">
                  <span className="text-2xl">🗺</span>
                  <span className="font-mono text-[11px] text-ink-muted">현장 추가 후 편집에서 업로드 가능합니다</span>
                </div>
              ) : (
                <label className="flex cursor-pointer flex-col items-center justify-center gap-2 bg-surface-subtle py-6 hover:bg-surface-muted transition-colors">
                  <span className="text-2xl">🗺</span>
                  <span className="font-mono text-[11px] text-ink-muted">평면도 이미지 업로드</span>
                  <span className="font-mono text-[10px] text-ink-muted">PNG, JPG, PDF</span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/gif,image/webp,application/pdf"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0]
                      if (!file) return
                      const formData = new FormData()
                      formData.append('file', file)
                      try {
                        const token = localStorage.getItem('gm_token')
                        const apiBase = process.env.NEXT_PUBLIC_API_URL || 'https://yuhyun-sensor-monitoring-back.onrender.com'
                        const res = await fetch(
                          `${apiBase}/api/sites/${siteId}/floor-plan`,
                          { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: formData }
                        )
                        const data = await res.json()
                        if (data.success) {
                          onChange({ ...form, has_floor_plan: true })
                        } else {
                          alert('업로드 실패: ' + (data.error || '알 수 없는 오류'))
                        }
                      } catch { alert('업로드 중 오류가 발생했습니다.') }
                    }}
                  />
                </label>
              )}
            </div>
          </div>

          {/* 센서 선택 */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className={labelCls + ' mb-0'}>센서 <span className="ml-1 font-normal normal-case tracking-normal text-ink-muted">(복수 선택 가능)</span></label>
              {form.selectedSensors.length > 0 && (
                <button type="button" onClick={() => onChange({ ...form, selectedSensors: [] })}
                  className="font-mono text-[10px] text-ink-muted hover:text-sensor-dangertext transition-colors">전체 해제</button>
              )}
            </div>
            {sensors.length === 0 ? (
              <p className="font-mono text-[11px] text-ink-muted">등록된 센서가 없습니다.</p>
            ) : (
              <div className="rounded-lg border border-line overflow-hidden max-h-48 overflow-y-auto">
                {sensors.map((sensor: any, idx: number) => {
                  const isSelected = form.selectedSensors.includes(sensor.id)
                  const isCurrent = sensor.site_code === siteCode
                  const isOtherSite = sensor.site_code && sensor.site_code !== siteCode
                  const otherSiteName = isOtherSite ? sensor.site_name : null
                  const isDisabled = isOtherSite && !isSelected
                  return (
                    <button key={sensor.id} type="button"
                      disabled={isDisabled}
                      onClick={() => {
                        if (isDisabled) return
                        const next = isSelected
                          ? form.selectedSensors.filter(id => id !== sensor.id)
                          : [...form.selectedSensors, sensor.id]
                        onChange({ ...form, selectedSensors: next })
                      }}
                      className={['flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors',
                        idx !== 0 ? 'border-t border-line' : '',
                        isDisabled ? 'bg-surface-muted opacity-50 cursor-not-allowed' :
                        isSelected ? 'bg-brand/10' : 'bg-surface-card hover:bg-surface-subtle'].join(' ')}>
                      <span className={['flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-all',
                        isDisabled ? 'border-line bg-surface-muted' :
                        isSelected ? 'border-brand bg-brand text-white' : 'border-line-strong bg-surface-card'].join(' ')}>
                        {isSelected && !isDisabled && <svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                      </span>
                      <span className={`flex-1 text-sm font-medium ${isDisabled ? 'text-ink-muted' : isSelected ? 'text-brand' : 'text-ink'}`}>
                       {sensor.name || sensor.id}
                      </span>
                      {isCurrent && (
                        <span className="font-mono text-[10px] text-sensor-normaltext border border-sensor-normalborder bg-sensor-normalbg px-1.5 py-0.5 rounded-full">현재</span>
                      )}
                      {isOtherSite && (
                        <span className="font-mono text-[10px] text-ink-muted border border-line bg-surface-muted px-1.5 py-0.5 rounded-full">{otherSiteName}</span>
                      )}
                    </button>
                  )
                })}
              </div>
            )}
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
