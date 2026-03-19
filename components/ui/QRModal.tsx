'use client'

import { useEffect, useState } from 'react'
import { QRCode } from '@/components/ui/QRCode'
import Link from 'next/link'

interface QRModalProps {
  sensorId: string
  onClose: () => void
}

export function QRModal({ sensorId, onClose }: QRModalProps) {
  const [qrUrl, setQrUrl] = useState('')

  useEffect(() => {
    setQrUrl(`${window.location.origin}/qr/${sensorId}`)
  }, [sensorId])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/30 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="geo-card w-full max-w-xs animate-fade-in-up p-6 text-center"
        onClick={e => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <div className="text-left">
            <h2 className="text-sm font-semibold text-ink">QR 코드</h2>
            <p className="font-mono text-[10px] text-ink-muted">{sensorId}</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-ink-muted transition-colors hover:bg-surface-subtle hover:text-ink"
          >
            ✕
          </button>
        </div>

        {qrUrl ? (
          <QRCode
            value={qrUrl}
            size={200}
            fileName={`qr-${sensorId}`}
            showDownload={true}
          />
        ) : (
          <div className="flex h-[200px] items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-line border-t-brand" />
          </div>
        )}

        <p className="mt-4 font-mono text-[10px] text-ink-muted">
          현장 직원이 스캔하면 센서 현황을 바로 확인할 수 있습니다.
        </p>

        <Link
          href={`/qr/${sensorId}`}
          target="_blank"
          className="mt-3 block rounded-lg border border-line py-2 font-mono text-xs text-ink-sub transition-colors hover:border-brand/40 hover:text-brand"
        >
          QR 상세 페이지 열기 →
        </Link>
      </div>
    </div>
  )
}
