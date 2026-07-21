export function ModalSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <span className="h-3 w-0.5 rounded-sm bg-brand" />
        <p className="font-mono text-[10px] font-semibold uppercase tracking-widest text-ink-muted">{title}</p>
      </div>
      {children}
    </div>
  )
}
