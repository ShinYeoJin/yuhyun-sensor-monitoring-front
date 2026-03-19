// ── 서버 컴포넌트 ────────────────────────────────────────────────────────────
import { getSensorById, getThresholds } from '@/lib/mock-data'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { QRCodeSection } from '@/components/ui/QRCodeSection'
import { QRTrendSection } from '@/components/ui/QRTrendSection'
import Link from 'next/link'
import { notFound } from 'next/navigation'

export default async function QRSensorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const sensor = getSensorById(id)
  if (!sensor) notFound()

  const { thresholdWarning, thresholdDanger } = getThresholds(sensor)

  const topBarClass =
    sensor.status === 'danger'  ? 'bg-sensor-danger'  :
    sensor.status === 'warning' ? 'bg-sensor-warning' :
    sensor.status === 'offline' ? 'bg-sensor-offline' :
    'bg-sensor-normal'

  const valueCls =
    sensor.status === 'danger'  ? 'text-sensor-danger'  :
    sensor.status === 'warning' ? 'text-sensor-warning' :
    sensor.status === 'offline' ? 'text-ink-muted'      :
    'text-sensor-normal'

  return (
    <main className="flex min-h-screen items-center justify-center bg-surface-page p-4">
      <div className="w-full max-w-sm space-y-3">

        {/* 로고 */}
        <div className="text-center">
          <div className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-brand font-mono text-sm font-medium text-white shadow-card">
            GM
          </div>
          <p className="mt-1 font-mono text-[10px] text-ink-muted">GeoMonitor 계측 시스템</p>
        </div>

        {/* 메인 카드 */}
        <div className="overflow-hidden rounded-2xl border border-line bg-surface-card shadow-cardhover">
          <div className={`h-1 w-full ${topBarClass}`} />

          <div className="flex items-center justify-between border-b border-line bg-surface-subtle px-5 py-3">
            <StatusBadge status={sensor.status} />
            <span className="font-mono text-[10px] text-ink-muted">QR 현장 조회</span>
          </div>

          <div className="space-y-4 p-5">

            {/* 관리번호 + 센서명 */}
            <div>
              <p className="font-mono text-2xl font-medium tracking-tight text-ink">
                {sensor.manageNo || sensor.id}
              </p>
              <p className="mt-0.5 text-sm font-medium text-ink-sub">{sensor.name}</p>
              {sensor.nameEn && (
                <p className="font-mono text-xs text-ink-muted">{sensor.nameEn}</p>
              )}
              <p className="mt-1 font-mono text-xs text-ink-muted">
                {sensor.siteName} · {sensor.location.description}
              </p>
            </div>

            {/* 대형 측정값 */}
            <div className="rounded-xl border border-line bg-surface-subtle py-4 text-center">
              {sensor.status === 'offline' ? (
                <>
                  <p className="font-mono text-4xl font-light text-ink-muted">—</p>
                  <p className="mt-1 font-mono text-xs text-ink-muted">오프라인 상태</p>
                </>
              ) : (
                <>
                  <p className={`font-mono text-5xl font-light leading-none ${valueCls}`}>
                    {sensor.currentValue}
                    <span className="ml-1.5 text-xl font-normal text-ink-muted">{sensor.unit}</span>
                  </p>
                  <p className="mt-1.5 font-mono text-[10px] uppercase tracking-widest text-ink-muted">
                    현재 측정값
                  </p>
                </>
              )}
            </div>

            {/* 임계값 */}
            {sensor.status !== 'offline' && (
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border border-sensor-warningborder bg-sensor-warningbg p-3">
                  <p className="font-mono text-[10px] text-sensor-warningtext">주의 임계값</p>
                  <p className="mt-0.5 font-mono text-sm font-semibold text-sensor-warningtext">
                    {thresholdWarning} {sensor.unit}
                  </p>
                </div>
                <div className="rounded-lg border border-sensor-dangerborder bg-sensor-dangerbg p-3">
                  <p className="font-mono text-[10px] text-sensor-dangertext">위험 임계값</p>
                  <p className="mt-0.5 font-mono text-sm font-semibold text-sensor-dangertext">
                    {thresholdDanger} {sensor.unit}
                  </p>
                </div>
              </div>
            )}

            {/* 마지막 수신 (15분 단위 표기) */}
            <div className="rounded-lg border border-line bg-surface-subtle px-4 py-3">
              <div className="flex items-center justify-between">
                <p className="font-mono text-[10px] text-ink-muted">마지막 수신</p>
                <p className="font-mono text-xs font-medium text-ink">
                  {new Date(sensor.lastUpdated).toLocaleString('ko-KR', {
                    month: '2-digit', day: '2-digit',
                    hour: '2-digit', minute: '2-digit',
                  })}
                </p>
              </div>
              <p className="mt-0.5 font-mono text-[10px] text-ink-muted">
                15분 간격 자동 수신
              </p>
            </div>

            {/* 시간별 트렌드 + 측정 데이터 (클라이언트 컴포넌트) */}
            <QRTrendSection sensor={sensor} />

            {/* QR 코드 */}
            <QRCodeSection sensorId={sensor.id} />

            {/* 조회 시각 */}
            <p className="border-t border-line pt-3 text-center font-mono text-[10px] text-ink-muted">
              조회 시각: {new Date().toLocaleString('ko-KR')}
            </p>

            {/* 상세 정보 보기 */}
            <Link
              href={`/sensors/${sensor.id}`}
              className="block w-full rounded-xl bg-ink py-3 text-center font-mono text-sm font-semibold text-white transition-colors hover:bg-ink-sub"
            >
              상세 정보 보기 →
            </Link>
          </div>
        </div>

        <p className="text-center font-mono text-[10px] text-ink-muted">
          관리자 로그인이 필요한 기능은 대시보드를 이용하세요.
        </p>
      </div>
    </main>
  )
}
