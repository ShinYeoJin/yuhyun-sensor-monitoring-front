'use client'

import {
  ResponsiveContainer, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ReferenceLine, TooltipProps,
} from 'recharts'
import type { Sensor, SensorReading } from '@/types'
import { getThresholds } from '@/lib/mock-data'

const statusColor: Record<string, string> = {
  normal:  '#1D9E75',
  warning: '#BA7517',
  danger:  '#C0392B',
  offline: '#8a9ab8',
}

function CustomTooltip({ active, payload }: TooltipProps<number, string>) {
  if (!active || !payload?.[0]) return null
  return (
    <div className="rounded-lg border border-line bg-surface-card px-3 py-2 shadow-cardhover">
      <p className="font-mono text-[10px] text-ink-muted">{payload[0].payload.fullTime}</p>
      <p className="font-mono text-sm font-medium text-ink">
        {payload[0].value}{' '}
        <span className="text-xs text-ink-muted">{payload[0].payload.unit}</span>
      </p>
    </div>
  )
}

interface Props {
  sensor: Sensor
  readings?: SensorReading[]
  hideXAxis?: boolean  // QR 페이지 등에서 X축 레이블 숨김 (툴팁은 유지)
}

export function SensorTrendChart({ sensor, readings, hideXAxis = false }: Props) {
  const source = readings ?? sensor.readings
  const { thresholdWarning, thresholdDanger } = getThresholds(sensor)

  // 모든 포인트를 데이터로 사용 (그래프는 모두 표시)
  const data = source.map((r) => {
    const d = new Date(r.timestamp)
    return {
      // X축 틱용 레이블 (HH:MM 또는 MM/DD)
      time: d.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }),
      // 툴팁용 전체 날짜시각
      fullTime: d.toLocaleString('ko-KR', {
        month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit',
      }),
      value: r.value,
      unit: sensor.unit,
      // 인덱스 저장 (틱 필터링에 사용)
      _idx: 0,
    }
  }).map((d, i) => ({ ...d, _idx: i }))

  const lineColor = statusColor[sensor.status] ?? statusColor.normal

  // X축 틱: 데이터 전체를 12등분한 인덱스만 표시
  // → 데이터가 몇 개든 X축에는 최대 12개 레이블만 나타남
  const tickCount   = Math.min(12, data.length)
  const tickIndices = new Set<number>()
  if (data.length > 0) {
    for (let i = 0; i < tickCount; i++) {
      tickIndices.add(Math.round((i / (tickCount - 1 || 1)) * (data.length - 1)))
    }
  }

  // Recharts는 dataKey 기반 틱 필터를 지원하지 않으므로
  // tickFormatter에서 해당 인덱스가 아니면 빈 문자열 반환
  const tickFormatter = (val: string, index: number) => {
    return tickIndices.has(index) ? val : ''
  }

  return (
    <ResponsiveContainer width="100%" height={240}>
      <LineChart data={data} margin={{ top: 8, right: 12, bottom: 8, left: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#dde3ed" />
        <XAxis
          dataKey="time"
          tick={hideXAxis ? false : { fontSize: 10, fill: '#8a9ab8', fontFamily: 'DM Mono, monospace' }}
          tickLine={false}
          axisLine={false}
          interval={0}
          tickFormatter={hideXAxis ? () => '' : tickFormatter}
          height={hideXAxis ? 4 : 28}
        />
        <YAxis
          tick={{ fontSize: 10, fill: '#8a9ab8', fontFamily: 'DM Mono, monospace' }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v) => `${v}${sensor.unit}`}
          width={56}
        />
        <Tooltip content={<CustomTooltip />} />

        {thresholdWarning > 0 && (
          <ReferenceLine
            y={thresholdWarning}
            stroke="#BA7517"
            strokeDasharray="4 3"
            strokeWidth={1}
            label={{ value: `주의 ${thresholdWarning}`, position: 'insideTopRight', fontSize: 10, fill: '#BA7517', fontFamily: 'DM Mono, monospace' }}
          />
        )}
        {thresholdDanger > 0 && (
          <ReferenceLine
            y={thresholdDanger}
            stroke="#C0392B"
            strokeDasharray="4 3"
            strokeWidth={1}
            label={{ value: `위험 ${thresholdDanger}`, position: 'insideTopRight', fontSize: 10, fill: '#C0392B', fontFamily: 'DM Mono, monospace' }}
          />
        )}

        <Line
          type="monotone"
          dataKey="value"
          stroke={lineColor}
          strokeWidth={2}
          // 데이터가 많으면 dot 숨김 (200개 이상)
          dot={data.length <= 200 ? { r: 2, fill: lineColor, strokeWidth: 0 } : false}
          activeDot={{ r: 5 }}
          isAnimationActive={data.length <= 300}
          animationDuration={350}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
