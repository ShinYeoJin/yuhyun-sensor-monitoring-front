import { inputCls, labelCls } from './formStyles'

export function FormulaModal({ mode, form, onChange, onSubmit, onClose }: {
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
