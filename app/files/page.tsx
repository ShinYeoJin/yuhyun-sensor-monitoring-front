'use client'

import { useState, useRef, useEffect } from 'react'
import { useAuth, DEFAULT_USER } from '@/lib/auth-context'
import { fileApi } from '@/lib/api'

const fileIcon = (name: string) => {
  const ext = name.split('.').pop()?.toLowerCase() ?? ''
  if (['pdf'].includes(ext))              return '📄'
  if (['zip','rar','7z'].includes(ext))   return '🗜'
  if (['pptx','ppt'].includes(ext))       return '📊'
  if (['dwg','dxf'].includes(ext))        return '📐'
  if (['jpg','png','jpeg'].includes(ext)) return '🖼'
  if (['xlsx','xls'].includes(ext))       return '📈'
  return '📎'
}

const formatSize = (bytes: number) => {
  if (!bytes) return '—'
  if (bytes > 1024*1024) return `${(bytes/1024/1024).toFixed(1)} MB`
  return `${(bytes/1024).toFixed(0)} KB`
}

function UploadModal({ onClose, onSubmit, authorName }: {
  onClose: () => void; onSubmit: (file: File) => void; authorName: string
}) {
  const [selFile, setSelFile] = useState<File | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) setSelFile(file)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/30 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="geo-card flex w-full max-w-lg animate-fade-in-up flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-line px-6 py-4">
          <h2 className="text-sm font-semibold text-ink">파일 등록</h2>
          <button onClick={onClose} className="rounded-md p-1 text-ink-muted hover:bg-surface-subtle hover:text-ink">✕</button>
        </div>
        <div className="px-6 py-5 space-y-5">
          <div>
            <label className="mb-1.5 block font-mono text-[10px] font-semibold uppercase tracking-wider text-ink-muted">파일 첨부</label>
            <div
              onClick={() => inputRef.current?.click()}
              onDragOver={e => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              className={[
                'flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-4 py-8 transition-all',
                dragOver ? 'border-brand bg-brand/10' :
                selFile  ? 'border-sensor-normalborder bg-sensor-normalbg' :
                           'border-line bg-surface-subtle hover:border-brand/50 hover:bg-brand/5',
              ].join(' ')}>
              <input ref={inputRef} type="file" className="hidden"
                onChange={e => e.target.files?.[0] && setSelFile(e.target.files[0])} />
              {selFile ? (
                <>
                  <span className="text-3xl">{fileIcon(selFile.name)}</span>
                  <p className="mt-2 text-sm font-medium text-ink">{selFile.name}</p>
                  <p className="font-mono text-xs text-ink-muted">{formatSize(selFile.size)}</p>
                  <button type="button" onClick={e => { e.stopPropagation(); setSelFile(null) }}
                    className="mt-2 font-mono text-[11px] text-sensor-dangertext hover:underline">파일 변경</button>
                </>
              ) : (
                <>
                  <span className="text-3xl text-ink-muted">📁</span>
                  <p className="mt-2 text-sm text-ink-muted">클릭하거나 파일을 여기에 끌어다 놓으세요</p>
                  <p className="font-mono text-[10px] text-ink-muted">모든 파일 형식 지원</p>
                </>
              )}
            </div>
          </div>
          <div className="flex items-center justify-between rounded-lg border border-line bg-surface-subtle px-4 py-3">
            <div>
              <p className="font-mono text-[10px] font-semibold uppercase tracking-wider text-ink-muted">작성자</p>
              <p className="mt-0.5 font-mono text-[10px] text-ink-muted">로그인한 계정 기준 자동 설정</p>
            </div>
            <span className="text-sm font-medium text-ink">{authorName}</span>
          </div>
        </div>
        <div className="flex gap-2 border-t border-line px-6 py-4">
          <button onClick={onClose} className="rounded-lg border border-line px-4 py-2 text-sm font-medium text-ink-sub hover:border-line-strong hover:text-ink">취소</button>
          <button disabled={!selFile} onClick={() => selFile && onSubmit(selFile)}
            className="flex-1 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-40">
            등록
          </button>
        </div>
      </div>
    </div>
  )
}

export default function FilesPage() {
  const { user } = useAuth()
  const currentUserName = user?.name ?? DEFAULT_USER.name
  const [files,        setFiles]        = useState<any[]>([])
  const [search,       setSearch]       = useState('')
  const [uploadOpen,   setUploadOpen]   = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null)
  const [loading,      setLoading]      = useState(true)
  const [toast,        setToast]        = useState<string | null>(null)

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 2500) }

  const fetchFiles = async () => {
    try {
      const data = await fileApi.getAll()
      setFiles(data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchFiles() }, [])

  const filtered = files.filter(f =>
    search === '' ||
    f.original_name.toLowerCase().includes(search.toLowerCase()) ||
    (f.uploaded_by_name && f.uploaded_by_name.toLowerCase().includes(search.toLowerCase()))
  )

  const handleSubmit = async (file: File) => {
    try {
      await fileApi.upload(file)
      await fetchFiles()
      setUploadOpen(false)
      showToast(`'${file.name}' 파일이 등록되었습니다.`)
    } catch (err: any) {
      showToast(err.message || '업로드 실패')
    }
  }

  const handleDownload = async (file: any) => {
    try {
      const res = await fileApi.download(file.id)
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url; a.download = file.original_name; a.click()
      URL.revokeObjectURL(url)
      showToast(`'${file.original_name}' 다운로드를 시작합니다.`)
    } catch (err) {
      showToast('다운로드 실패')
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      await fileApi.delete(deleteTarget.id)
      await fetchFiles()
      showToast(`'${deleteTarget.original_name}' 파일이 삭제되었습니다.`)
    } catch (err) {
      showToast('삭제 실패')
    } finally {
      setDeleteTarget(null)
    }
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="font-mono text-sm text-ink-muted">파일 목록 불러오는 중...</p>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto bg-surface-page">

      <div className="border-b border-line bg-surface-card/90 px-4 md:px-6 py-3 md:sticky md:top-0 md:z-10 backdrop-blur-md">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h1 className="text-[15px] font-semibold text-ink">파일 관리</h1>
            <p className="font-mono text-xs text-ink-muted">총 {files.length}개 파일</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-ink-muted">⌕</span>
              <input type="search" placeholder="파일명 또는 작성자 검색..." value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full max-w-[200px] rounded-lg border border-line bg-surface-card py-1.5 pl-7 pr-3 font-mono text-xs text-ink outline-none placeholder:text-ink-muted focus:border-brand/50 focus:ring-1 focus:ring-brand/20" />
            </div>
            <button onClick={() => setUploadOpen(true)}
              className="flex items-center gap-1.5 rounded-lg bg-brand px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-brand-hover">
              + 파일 등록
            </button>
          </div>
        </div>
      </div>

      <div className="p-6">
        {filtered.length === 0 ? (
          <div className="geo-card py-16 text-center">
            <p className="text-sm text-ink-muted">
              {search ? `'${search}' 검색 결과가 없습니다.` : '등록된 파일이 없습니다.'}
            </p>
            {!search && (
              <button onClick={() => setUploadOpen(true)}
                className="mt-3 font-mono text-xs text-brand hover:underline">
                + 첫 번째 파일 등록하기
              </button>
            )}
          </div>
        ) : (
          <div className="geo-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-sm">
                <thead>
                  <tr className="border-b border-line bg-surface-subtle">
                    {['파일명','업로드한 사람','크기','등록일',''].map(h => (
                      <th key={h} className="px-4 py-3 text-left font-mono text-[10px] font-semibold uppercase tracking-wide text-ink-muted">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {filtered.map((file: any) => (
                    <tr key={file.id} className="transition-colors hover:bg-surface-subtle">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <span className="text-xl">{fileIcon(file.original_name)}</span>
                          <p className="font-medium text-ink">{file.original_name}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-ink-sub">{file.uploaded_by_name || '—'}</td>
                      <td className="px-4 py-3 font-mono text-xs text-ink-muted">{formatSize(file.file_size)}</td>
                      <td className="px-4 py-3 font-mono text-xs text-ink-muted">
                        {file.created_at ? new Date(file.created_at).toLocaleDateString('ko-KR') : '—'}
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <button onClick={() => handleDownload(file)}
                          className="mr-3 font-mono text-xs text-ink-muted transition-colors hover:text-brand">
                          ↓ 다운로드
                        </button>
                        <button onClick={() => setDeleteTarget(file)}
                          className="font-mono text-xs text-ink-muted transition-colors hover:text-sensor-danger">
                          삭제
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {uploadOpen && (
        <UploadModal onClose={() => setUploadOpen(false)} onSubmit={handleSubmit} authorName={currentUserName} />
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/30 backdrop-blur-sm" onClick={() => setDeleteTarget(null)}>
          <div className="geo-card w-full max-w-sm animate-fade-in-up p-6 text-center" onClick={e => e.stopPropagation()}>
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-sensor-dangerbg text-xl text-sensor-danger">⚠</div>
            <h3 className="text-sm font-semibold text-ink">파일을 삭제하시겠습니까?</h3>
            <p className="mt-1 font-mono text-xs text-ink-muted">{deleteTarget.original_name}</p>
            <p className="mt-1.5 text-xs text-ink-muted">삭제된 파일은 복구할 수 없습니다.</p>
            <div className="mt-5 flex gap-2">
              <button onClick={() => setDeleteTarget(null)} className="flex-1 rounded-lg border border-line px-4 py-2 text-sm font-medium text-ink-sub hover:bg-surface-subtle">취소</button>
              <button onClick={handleDelete} className="flex-1 rounded-lg bg-sensor-danger px-4 py-2 text-sm font-medium text-white hover:opacity-90">삭제</button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 animate-fade-in-up rounded-xl border border-line bg-ink px-5 py-3 font-mono text-sm text-white shadow-cardhover">
          {toast}
        </div>
      )}
    </div>
  )
}