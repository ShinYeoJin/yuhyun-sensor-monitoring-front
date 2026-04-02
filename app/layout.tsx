import type { Metadata } from 'next'
import './globals.css'
import { AuthProvider } from '@/lib/auth-context'

export const metadata: Metadata = {
  title: 'GeoMonitor — 계측 모니터링 시스템',
  description: '지반 계측 센서 데이터를 실시간으로 수집·저장·시각화하는 모니터링 시스템입니다. 수위계, 지중경사계 등 다양한 센서의 측정값을 1시간 단위로 자동 수집하며, 임계값 초과 시 알람을 발생시킵니다.',
  openGraph: {
    title: 'GeoMonitor — 계측 모니터링 시스템',
    description: '지반 계측 센서 데이터를 실시간으로 수집·저장·시각화하는 모니터링 시스템',
    type: 'website',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  )
}
