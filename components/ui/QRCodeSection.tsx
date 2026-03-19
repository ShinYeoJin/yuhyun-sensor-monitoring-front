'use client'

import { QRCode } from '@/components/ui/QRCode'
import { useEffect, useState } from 'react'

export function QRCodeSection({ sensorId }: { sensorId: string }) {
  const [qrUrl, setQrUrl] = useState('')

  useEffect(() => {
    setQrUrl(`${window.location.origin}/qr/${sensorId}`)
  }, [sensorId])

  if (!qrUrl) return null

  return (
    <div className="border-t border-line pt-4">
      <p className="mb-3 section-title">이 페이지 QR 코드</p>
      <div className="flex justify-center">
        <QRCode
          value={qrUrl}
          size={160}
          fileName={`qr-${sensorId}`}
          showDownload={true}
        />
      </div>
    </div>
  )
}
