'use client'

import { useEffect, useRef, useState } from 'react'
import QRCodeLib from 'qrcode'

interface QRCodeProps {
  // QR에 인코딩할 값 (URL 또는 센서 ID)
  value: string
  // 캔버스 크기 (px), 기본 200
  size?: number
  // 다운로드 파일명 (확장자 제외)
  fileName?: string
  // 다운로드 버튼 표시 여부
  showDownload?: boolean
  // 출력 포맷: canvas(기본) | dataurl(img 태그용)
  mode?: 'canvas' | 'img'
}

export function QRCode({
  value,
  size = 200,
  fileName = 'qrcode',
  showDownload = true,
  mode = 'canvas',
}: QRCodeProps) {
  const canvasRef  = useRef<HTMLCanvasElement>(null)
  const [imgSrc, setImgSrc]   = useState<string>('')
  const [copied, setCopied]   = useState(false)
  const [error, setError]     = useState(false)

  useEffect(() => {
    if (!value) return
    setError(false)

    const opts: QRCodeLib.QRCodeRenderersOptions = {
      width: size,
      margin: 2,
      color: { dark: '#1a2233', light: '#ffffff' },
      errorCorrectionLevel: 'M',
    }

    if (mode === 'canvas' && canvasRef.current) {
      QRCodeLib.toCanvas(canvasRef.current, value, opts, (err) => {
        if (err) setError(true)
      })
    } else {
      QRCodeLib.toDataURL(value, opts, (err, url) => {
        if (err) { setError(true); return }
        setImgSrc(url)
      })
    }
  }, [value, size, mode])

  // PNG 다운로드
  const handleDownload = () => {
    let dataUrl = ''
    if (mode === 'canvas' && canvasRef.current) {
      dataUrl = canvasRef.current.toDataURL('image/png')
    } else {
      dataUrl = imgSrc
    }
    if (!dataUrl) return
    const a = document.createElement('a')
    a.href = dataUrl
    a.download = `${fileName}.png`
    a.click()
  }

  // URL 클립보드 복사
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // clipboard API 미지원 환경 fallback
    }
  }

  if (error) {
    return (
      <div
        className="flex items-center justify-center rounded-xl border border-sensor-dangerborder bg-sensor-dangerbg text-xs text-sensor-dangertext"
        style={{ width: size, height: size }}
      >
        QR 생성 오류
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center gap-3">
      {/* QR 이미지 */}
      <div className="rounded-xl border border-line bg-white p-3 shadow-card">
        {mode === 'canvas' ? (
          <canvas ref={canvasRef} width={size} height={size} />
        ) : (
          imgSrc
            ? <img src={imgSrc} alt="QR Code" width={size} height={size} />
            : <div
                className="animate-pulse rounded bg-surface-muted"
                style={{ width: size, height: size }}
              />
        )}
      </div>

      {/* 인코딩된 URL 표시 */}
      <p className="max-w-[200px] truncate text-center font-mono text-[10px] text-ink-muted">
        {value}
      </p>

      {/* 버튼 영역 */}
      {showDownload && (
        <div className="flex gap-2">
          <button
            onClick={handleDownload}
            className="flex items-center gap-1.5 rounded-lg border border-line bg-surface-card px-3 py-1.5 font-mono text-xs text-ink-sub transition-colors hover:border-brand/40 hover:bg-brand/10 hover:text-brand"
          >
            ↓ PNG 저장
          </button>
          <button
            onClick={handleCopy}
            className={[
              'flex items-center gap-1.5 rounded-lg border px-3 py-1.5 font-mono text-xs transition-all duration-200',
              copied
                ? 'border-sensor-normalborder bg-sensor-normalbg text-sensor-normaltext'
                : 'border-line bg-surface-card text-ink-sub hover:border-line-strong hover:text-ink',
            ].join(' ')}
          >
            {copied ? '✓ 복사됨' : '🔗 URL 복사'}
          </button>
        </div>
      )}
    </div>
  )
}
