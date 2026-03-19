'use client'

import { useState, useRef } from 'react'
import { useAuth, DEFAULT_USER } from '@/lib/auth-context'

// ─── 타입 ─────────────────────────────────────────────────────────────────────
type FileCategory = '계측보고서' | '공정사진' | '설계정보' | '기타'

interface FileItem {
  id:         string
  name:       string
  description: string
  category:   FileCategory
  author:     string
  size:       string
  uploadedAt: string
  blob?:      File
  isDraft?:   boolean   // 임시저장
}

// ─── 목 데이터 ────────────────────────────────────────────────────────────────
const initialFiles: FileItem[] = [
  { id: 'f1', name: '2026년 3월 계측보고서.pdf',  description: '3월 정기 계측 결과 보고서',     category: '계측보고서', author: '김관리자', size: '2.4 MB', uploadedAt: '2026-03-15' },
  { id: 'f2', name: '2026년 2월 계측보고서.pdf',  description: '2월 정기 계측 결과 보고서',     category: '계측보고서', author: '이현장',   size: '1.9 MB', uploadedAt: '2026-02-28' },
  { id: 'f3', name: '현장 A 공정사진_03월.zip',   description: '현장 A 3월 공정 촬영 사진 모음', category: '공정사진',  author: '박운영자', size: '48.2 MB', uploadedAt: '2026-03-14' },
  { id: 'f4', name: '현장 B 공정사진_03월.zip',   description: '현장 B 3월 공정 촬영 사진 모음', category: '공정사진',  author: '박운영자', size: '35.7 MB', uploadedAt: '2026-03-13' },
  { id: 'f5', name: '현장 A 설계도면_v3.dwg',     description: '현장 A 최종 설계도면 v3',       category: '설계정보',  author: '최관리자', size: '8.1 MB',  uploadedAt: '2026-01-20' },
  { id: 'f6', name: '현장 B 구조계산서.pdf',       description: '현장 B 구조 안전 계산서',       category: '설계정보',  author: '최관리자', size: '5.5 MB',  uploadedAt: '2026-01-18' },
  { id: 'f7', name: '안전교육 자료.pptx',           description: '3월 안전교육 자료',             category: '기타',      author: '정모니터', size: '3.2 MB',  uploadedAt: '2026-03-10' },
  { id: 'f8', name: '2026년 1월 계측보고서.pdf',  description: '1월 정기 계측 결과 보고서',     category: '계측보고서', author: '이현장',   size: '1.7 MB', uploadedAt: '2026-01-31' },
]

// ─── 카테고리 ────────────────────────────────────────────────────────────────
const categories: { value: FileCategory | 'all'; label: string; icon: string }[] = [
  { value: 'all',      label: '전체',      icon: '□'  },
  { value: '계측보고서', label: '계측보고서', icon: '📊' },
  { value: '공정사진',  label: '공정사진',  icon: '📷' },
  { value: '설계정보',  label: '설계정보',  icon: '📐' },
  { value: '기타',      label: '기타',      icon: '📎' },
]
const fileCats: FileCategory[] = ['계측보고서', '공정사진', '설계정보', '기타']

const catStyle: Record<FileCategory, string> = {
  '계측보고서': 'border-alarm-infoborder    bg-alarm-infobg    text-alarm-infotext',
  '공정사진':   'border-sensor-normalborder bg-sensor-normalbg text-sensor-normaltext',
  '설계정보':   'border-sensor-warningborder bg-sensor-warningbg text-sensor-warningtext',
  '기타':       'border-line                bg-surface-muted   text-ink-sub',
}
const catActiveStyle: Record<FileCategory, string> = {
  '계측보고서': 'border-alarm-infoborder    bg-alarm-infobg    text-alarm-infotext',
  '공정사진':   'border-sensor-normalborder bg-sensor-normalbg text-sensor-normaltext',
  '설계정보':   'border-sensor-warningborder bg-sensor-warningbg text-sensor-warningtext',
  '기타':       'border-line-strong         bg-surface-muted   text-ink',
}

const fileIcon = (name: string) => {
  const ext = name.split('.').pop()?.toLowerCase() ?? ''
  if (['pdf'].includes(ext))             return '📄'
  if (['zip','rar','7z'].includes(ext))  return '🗜'
  if (['pptx','ppt'].includes(ext))      return '📊'
  if (['dwg','dxf'].includes(ext))       return '📐'
  if (['jpg','png','jpeg'].includes(ext))return '🖼'
  if (['xlsx','xls'].includes(ext))      return '📈'
  return '📎'
}

// ─── 파일 등록 모달 ───────────────────────────────────────────────────────────
interface UploadModalProps {
  onClose:   () => void
  onSubmit:  (item: Omit<FileItem,'id'>) => void
  onDraft:   (item: Omit<FileItem,'id'>) => void
  authorName: string
}

function UploadModal({ onClose, onSubmit, onDraft, authorName }: UploadModalProps) {
  const [selFile,      setSelFile]      = useState<File | null>(null)
  const [description,  setDescription]  = useState('')
  const [selCategory,  setSelCategory]  = useState<FileCategory>('계측보고서')
  const [dragOver,     setDragOver]     = useState(false)
  const dropRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const inputCls = 'w-full rounded-lg border border-line bg-surface-subtle px-3 py-2 text-sm text-ink outline-none transition-colors placeholder:text-ink-muted focus:border-brand/50 focus:ring-2 focus:ring-brand/10'
  const labelCls = 'mb-1.5 block font-mono text-[10px] font-semibold uppercase tracking-wider text-ink-muted'

  const buildItem = (isDraft = false): Omit<FileItem,'id'> => ({
    name:        selFile?.name ?? '(파일 없음)',
    description,
    category:    selCategory,
    author:      authorName,
    size:        selFile
      ? selFile.size > 1024*1024
        ? `${(selFile.size/1024/1024).toFixed(1)} MB`
        : `${(selFile.size/1024).toFixed(0)} KB`
      : '—',
    uploadedAt:  new Date().toISOString().slice(0,10),
    blob:        selFile ?? undefined,
    isDraft,
  })

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) setSelFile(file)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/30 backdrop-blur-sm p-4"
      onClick={onClose}>
      <div className="geo-card flex w-full max-w-lg animate-fade-in-up flex-col" style={{ maxHeight: '92vh' }}
        onClick={e => e.stopPropagation()}>

        {/* 헤더 */}
        <div className="flex items-center justify-between border-b border-line px-6 py-4">
          <h2 className="text-sm font-semibold text-ink">파일 등록</h2>
          <button onClick={onClose}
            className="rounded-md p-1 text-ink-muted transition-colors hover:bg-surface-subtle hover:text-ink">✕</button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

          {/* 파일 첨부 영역 (드래그&드롭 + 클릭) */}
          <div>
            <label className={labelCls}>파일 첨부</label>
            <div
              ref={dropRef}
              onClick={() => inputRef.current?.click()}
              onDragOver={e => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              className={[
                'flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-4 py-8 transition-all',
                dragOver
                  ? 'border-brand bg-brand/10'
                  : selFile
                  ? 'border-sensor-normalborder bg-sensor-normalbg'
                  : 'border-line bg-surface-subtle hover:border-brand/50 hover:bg-brand/5',
              ].join(' ')}>
              <input ref={inputRef} type="file" className="hidden"
                onChange={e => e.target.files?.[0] && setSelFile(e.target.files[0])} />
              {selFile ? (
                <>
                  <span className="text-3xl">{fileIcon(selFile.name)}</span>
                  <p className="mt-2 text-sm font-medium text-ink">{selFile.name}</p>
                  <p className="font-mono text-xs text-ink-muted">
                    {selFile.size > 1024*1024
                      ? `${(selFile.size/1024/1024).toFixed(1)} MB`
                      : `${(selFile.size/1024).toFixed(0)} KB`}
                  </p>
                  <button type="button" onClick={e => { e.stopPropagation(); setSelFile(null) }}
                    className="mt-2 font-mono text-[11px] text-sensor-dangertext hover:underline">
                    파일 변경
                  </button>
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

          {/* 파일 종류 선택 */}
          <div>
            <label className={labelCls}>파일 종류 *</label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {fileCats.map(cat => (
                <button key={cat} type="button" onClick={() => setSelCategory(cat)}
                  className={[
                    'rounded-xl border py-2.5 text-center font-mono text-xs font-medium transition-all',
                    selCategory === cat
                      ? catActiveStyle[cat]
                      : 'border-line bg-surface-card text-ink-sub hover:border-line-strong hover:bg-surface-subtle',
                  ].join(' ')}>
                  {selCategory === cat && <span className="mr-1">✓</span>}
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* 내용 */}
          <div>
            <label className={labelCls}>내용</label>
            <textarea rows={3} value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="파일에 대한 설명을 입력하세요."
              className={`${inputCls} resize-none`} />
          </div>

          {/* 작성자 (자동) */}
          <div className="flex items-center justify-between rounded-lg border border-line bg-surface-subtle px-4 py-3">
            <div>
              <p className={labelCls + ' mb-0'}>작성자</p>
              <p className="mt-0.5 font-mono text-[10px] text-ink-muted">로그인한 계정 기준 자동 설정</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full border border-alarm-infoborder bg-alarm-infobg font-mono text-sm font-semibold text-alarm-infotext">
                {authorName[0]}
              </div>
              <span className="text-sm font-medium text-ink">{authorName}</span>
            </div>
          </div>
        </div>

        {/* 하단 버튼 */}
        <div className="flex gap-2 border-t border-line px-6 py-4">
          <button onClick={onClose}
            className="rounded-lg border border-line px-4 py-2 text-sm font-medium text-ink-sub transition-colors hover:border-line-strong hover:text-ink">
            취소
          </button>
          <button onClick={() => onDraft(buildItem(true))}
            className="rounded-lg border border-line px-4 py-2 text-sm font-medium text-ink-muted transition-colors hover:border-brand/30 hover:bg-brand/5 hover:text-brand">
            임시저장
          </button>
          <button
            disabled={!selFile}
            onClick={() => onSubmit(buildItem(false))}
            className="flex-1 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-40">
            등록
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── 메인 페이지 ──────────────────────────────────────────────────────────────
export default function FilesPage() {
  const { user } = useAuth()
  const currentUserName = user?.name ?? DEFAULT_USER.name
  const [files,        setFiles]        = useState<FileItem[]>(initialFiles)
  const [category,     setCategory]     = useState<FileCategory | 'all'>('all')
  const [search,       setSearch]       = useState('')
  const [uploadOpen,   setUploadOpen]   = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<FileItem | null>(null)
  const [toast,        setToast]        = useState<string | null>(null)
  // 임시저장 팝오버 — hover 중인 파일 id
  const [draftHoverId, setDraftHoverId] = useState<string | null>(null)

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 2500) }

  const filtered = files.filter(f => {
    const matchCat    = category === 'all' || f.category === category
    const matchSearch = search === '' ||
      f.name.toLowerCase().includes(search.toLowerCase()) ||
      f.author.toLowerCase().includes(search.toLowerCase())
    return matchCat && matchSearch
  })

  const handleSubmit = (item: Omit<FileItem,'id'>) => {
    setFiles(prev => [{ id: `f${Date.now()}`, ...item }, ...prev])
    setUploadOpen(false)
    showToast(`'${item.name}' 파일이 등록되었습니다.`)
  }

  const handleDraft = (item: Omit<FileItem,'id'>) => {
    setFiles(prev => [{ id: `f${Date.now()}`, ...item }, ...prev])
    setUploadOpen(false)
    showToast(`'${item.name}' 파일이 임시저장되었습니다.`)
  }

  const handleDownload = (file: FileItem) => {
    const source = file.blob
      ? file.blob
      : new Blob([`${file.name} 파일 내용 (시뮬레이션)`], { type: 'text/plain' })
    const url = URL.createObjectURL(source)
    const a = document.createElement('a')
    a.href = url; a.download = file.name; a.click()
    URL.revokeObjectURL(url)
    showToast(`'${file.name}' 다운로드를 시작합니다.`)
  }

  // 임시저장 → 정식 등록
  const handlePublish = (id: string) => {
    setFiles(prev => prev.map(f => f.id === id ? { ...f, isDraft: false } : f))
    showToast('임시저장 파일이 등록되었습니다.')
    setDraftHoverId(null)
  }

  const handleDelete = () => {
    if (!deleteTarget) return
    setFiles(prev => prev.filter(f => f.id !== deleteTarget.id))
    showToast(`'${deleteTarget.name}' 파일이 삭제되었습니다.`)
    setDeleteTarget(null)
  }

  return (
    <div className="flex-1 overflow-y-auto bg-surface-page">

      {/* 헤더 */}
      <div className="sticky top-0 z-10 border-b border-line bg-surface-card/90 px-6 py-3 backdrop-blur-md">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-[15px] font-semibold text-ink">파일 관리</h1>
            <p className="font-mono text-xs text-ink-muted">총 {files.length}개 파일</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-ink-muted">⌕</span>
              <input type="search" placeholder="제목 또는 작성자 검색..." value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-52 rounded-lg border border-line bg-surface-card py-1.5 pl-7 pr-3 font-mono text-xs text-ink outline-none transition-colors placeholder:text-ink-muted focus:border-brand/50 focus:ring-1 focus:ring-brand/20" />
            </div>
            <button onClick={() => setUploadOpen(true)}
              className="flex items-center gap-1.5 rounded-lg bg-brand px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-brand-hover">
              + 파일 등록
            </button>
          </div>
        </div>

        {/* 카테고리 탭 */}
        <div className="mt-3 flex gap-1">
          {categories.map(cat => {
            const count = cat.value === 'all'
              ? files.length
              : files.filter(f => f.category === cat.value).length
            const isActive = category === cat.value
            return (
              <button key={cat.value} onClick={() => setCategory(cat.value)}
                className={[
                  'flex items-center gap-1.5 rounded-full border px-3 py-1 font-mono text-[11px] font-medium transition-colors',
                  isActive
                    ? cat.value === 'all'
                      ? 'border-line-strong bg-surface-muted text-ink'
                      : catStyle[cat.value as FileCategory]
                    : 'border-line text-ink-muted hover:border-line-strong hover:text-ink-sub',
                ].join(' ')}>
                <span>{cat.icon}</span>{cat.label}
                <span className="opacity-60">{count}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* 파일 목록 */}
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
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line bg-surface-subtle">
                  {['파일명 / 내용','종류','작성자','크기','등록일',''].map(h => (
                    <th key={h} className="px-4 py-3 text-left font-mono text-[10px] font-semibold uppercase tracking-wide text-ink-muted">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {filtered.map(file => (
                  <tr key={file.id} className="transition-colors hover:bg-surface-subtle">
                    <td className="px-4 py-3">
                      <div className="flex items-start gap-2.5">
                        <span className="mt-0.5 text-xl leading-none">{fileIcon(file.name)}</span>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-ink">{file.name}</p>
                            {file.isDraft && (
                              <span className="relative inline-block">
                                <button
                                  type="button"
                                  onMouseEnter={() => setDraftHoverId(file.id)}
                                  onMouseLeave={() => setDraftHoverId(null)}
                                  className="rounded-full border border-sensor-warningborder bg-sensor-warningbg px-2 py-0.5 font-mono text-[10px] font-medium text-sensor-warningtext transition-colors hover:border-sensor-warning hover:bg-sensor-warning/20"
                                >
                                  임시저장 ↑
                                </button>

                                {/* 팝오버 */}
                                {draftHoverId === file.id && (
                                  <div
                                    className="absolute left-0 top-full z-30 mt-1.5 w-64 animate-fade-in-up"
                                    onMouseEnter={() => setDraftHoverId(file.id)}
                                    onMouseLeave={() => setDraftHoverId(null)}
                                  >
                                    <div className="geo-card overflow-hidden shadow-cardhover">
                                      {/* 팝오버 헤더 */}
                                      <div className="border-b border-line bg-surface-subtle px-3 py-2">
                                        <p className="font-mono text-[10px] font-semibold uppercase tracking-wider text-ink-muted">임시저장 파일</p>
                                      </div>
                                      {/* 파일 정보 */}
                                      <div className="px-3 py-2.5 space-y-1.5">
                                        <div className="flex items-center gap-2">
                                          <span className="text-lg">{fileIcon(file.name)}</span>
                                          <div className="min-w-0">
                                            <p className="truncate text-xs font-medium text-ink">{file.name}</p>
                                            <p className="font-mono text-[10px] text-ink-muted">{file.size} · {file.uploadedAt}</p>
                                          </div>
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                          <span className={`inline-block rounded-full border px-2 py-0.5 font-mono text-[10px] font-medium ${catStyle[file.category]}`}>
                                            {file.category}
                                          </span>
                                          <span className="font-mono text-[10px] text-ink-muted">작성자: {file.author}</span>
                                        </div>
                                        {file.description && (
                                          <p className="font-mono text-[10px] text-ink-sub">{file.description}</p>
                                        )}
                                      </div>
                                      {/* 액션 버튼 */}
                                      <div className="flex gap-1.5 border-t border-line px-3 py-2.5">
                                        <button
                                          onClick={() => handlePublish(file.id)}
                                          className="flex-1 rounded-lg bg-brand py-1.5 font-mono text-xs font-medium text-white transition-colors hover:bg-brand-hover"
                                        >
                                          ✓ 등록
                                        </button>
                                        <button
                                          onClick={() => { setDeleteTarget(file); setDraftHoverId(null) }}
                                          className="rounded-lg border border-sensor-dangerborder bg-sensor-dangerbg px-3 py-1.5 font-mono text-xs font-medium text-sensor-dangertext transition-colors hover:opacity-80"
                                        >
                                          삭제
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </span>
                            )}
                          </div>
                          {file.description && (
                            <p className="mt-0.5 font-mono text-[11px] text-ink-muted">{file.description}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-block rounded-full border px-2.5 py-0.5 font-mono text-[11px] font-medium ${catStyle[file.category]}`}>
                        {file.category}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-ink-sub">{file.author}</td>
                    <td className="px-4 py-3 font-mono text-xs text-ink-muted">{file.size}</td>
                    <td className="px-4 py-3 font-mono text-xs text-ink-muted">{file.uploadedAt}</td>
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
        )}
      </div>

      {/* 파일 등록 모달 */}
      {uploadOpen && (
        <UploadModal
          onClose={() => setUploadOpen(false)}
          onSubmit={handleSubmit}
          onDraft={handleDraft}
          authorName={currentUserName}
        />
      )}

      {/* 삭제 확인 모달 */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/30 backdrop-blur-sm"
          onClick={() => setDeleteTarget(null)}>
          <div className="geo-card w-full max-w-sm animate-fade-in-up p-6 text-center"
            onClick={e => e.stopPropagation()}>
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-sensor-dangerbg text-xl text-sensor-danger">⚠</div>
            <h3 className="text-sm font-semibold text-ink">파일을 삭제하시겠습니까?</h3>
            <p className="mt-1 font-mono text-xs text-ink-muted">{deleteTarget.name}</p>
            <p className="mt-1.5 text-xs text-ink-muted">삭제된 파일은 복구할 수 없습니다.</p>
            <div className="mt-5 flex gap-2">
              <button onClick={() => setDeleteTarget(null)}
                className="flex-1 rounded-lg border border-line px-4 py-2 text-sm font-medium text-ink-sub transition-colors hover:bg-surface-subtle">취소</button>
              <button onClick={handleDelete}
                className="flex-1 rounded-lg bg-sensor-danger px-4 py-2 text-sm font-medium text-white transition-colors hover:opacity-90">삭제</button>
            </div>
          </div>
        </div>
      )}

      {/* 토스트 */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 animate-fade-in-up rounded-xl border border-line bg-ink px-5 py-3 font-mono text-sm text-white shadow-cardhover">
          {toast}
        </div>
      )}
    </div>
  )
}
