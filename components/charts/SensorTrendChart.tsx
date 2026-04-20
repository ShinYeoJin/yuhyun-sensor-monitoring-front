'use client'

import {
  ResponsiveContainer, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ReferenceLine, TooltipProps,
} from 'recharts'
import type { Sensor, SensorReading } from '@/types'

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

// 다이아몬드 마커
function DiamondDot(props: any) {
  const { cx, cy, fill } = props
  if (!cx || !cy) return null
  const size = 5
  return (
    <polygon
      points={`${cx},${cy - size} ${cx + size},${cy} ${cx},${cy + size} ${cx - size},${cy}`}
      fill={fill}
      stroke={fill}
      strokeWidth={1}
    />
  )
}

interface Props {
  sensor: any
  readings?: SensorReading[]
  hideXAxis?: boolean
  initValue?: number
}

export function SensorTrendChart({ sensor, readings, hideXAxis = false , initValue }: Props) {
  const source = readings ?? sensor.readings ?? []

  const sortedSource = [...source].sort((a, b) =>
    new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  )

  const data = sortedSource.map((r: SensorReading) => {
    const d = new Date(r.timestamp)
    return {
      time: d.toLocaleDateString('ko-KR', { month: '2-digit', day: '2-digit' }),
      fullTime: d.toLocaleString('ko-KR', {
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit',
      }),
      value: typeof r.value === 'string' ? parseFloat(r.value) : r.value,
      unit: sensor.unit,
    }
  })

  // 1차 관리기준 값 
  const level1Lower = sensor.criteria?.level1Lower !== '' && sensor.criteria?.level1Lower != null
    ? parseFloat(sensor.criteria.level1Lower) : null
  const level1Upper = sensor.criteria?.level1Upper !== '' && sensor.criteria?.level1Upper != null
    ? parseFloat(sensor.criteria.level1Upper) : null
  const refLine  = sensor.nameAbbr === '80053' && initValue !== undefined
    ? parseFloat((initValue - 4).toFixed(2))
    : (level1Lower !== null && !isNaN(level1Lower)) ? level1Lower : null
  const refLine2 = sensor.nameAbbr === '80053' && initValue !== undefined
    ? parseFloat((initValue + 4).toFixed(2))
    : (level1Upper !== null && !isNaN(level1Upper)) ? level1Upper : null

  // x축 틱: 최대 8개
  const tickCount = Math.min(8, data.length)
  const tickIndices = new Set<number>()
  if (data.length > 0) {
    for (let i = 0; i < tickCount; i++) {
      tickIndices.add(Math.round((i / (tickCount - 1 || 1)) * (data.length - 1)))
    }
  }
  const tickFormatter = (val: string, index: number) => tickIndices.has(index) ? val : ''

  // 데이터 많으면 다이아몬드 숨김
  const showDiamond = data.length <= 100

  return (
    <div>
      <ResponsiveContainer width="100%" height={240}>
        <LineChart data={data} margin={{ top: 8, right: 60, bottom: 8, left: 8 }}>
          <CartesianGrid strokeDasharray="" stroke="#e5e9f0" horizontal={true} vertical={false} />
          <XAxis
            dataKey="time"
            tick={hideXAxis ? false : { fontSize: 10, fill: '#8a9ab8', fontFamily: 'DM Mono, monospace' }}
            tickLine={false}
            axisLine={{ stroke: '#dde3ed' }}
            interval={0}
            tickFormatter={hideXAxis ? () => '' : tickFormatter}
            height={hideXAxis ? 4 : 28}
            label={{ value: '계측일자(Day)', position: 'insideBottomRight', offset: -4, fontSize: 10, fill: '#8a9ab8' }}
          />
          <YAxis
            tick={{ fontSize: 9, fill: '#8a9ab8', fontFamily: 'DM Mono, monospace' }}
            interval="preserveStartEnd"
            minTickGap={40}
            tickLine={false}
            axisLine={{ stroke: '#dde3ed' }}
            tickFormatter={(v) => {
              const num = parseFloat(v)
              if (isNaN(num)) return `${v}`
              return num.toFixed(2)
            }}
            width={52}
            domain={
              (refLine !== null || refLine2 !== null)
                ? [
                    (dataMin: number) => {
                      const candidates = [dataMin, refLine, refLine2].filter(v => v !== null) as number[]
                      const mn = Math.min(...candidates)
                      return mn >= 0 ? mn * 0.997 : mn * 1.003
                    },
                    (dataMax: number) => {
                      const candidates = [dataMax, refLine, refLine2].filter(v => v !== null) as number[]
                      const mx = Math.max(...candidates)
                      return mx >= 0 ? mx * 1.003 : mx * 0.997
                    },
                  ]
                : ['auto', 'auto']
            }
            label={{ value: `G.L(${sensor.unit || 'm'})`, angle: -90, position: 'insideLeft', offset: 10, fontSize: 10, fill: '#8a9ab8' }}
          />
          <Tooltip content={<CustomTooltip />} />

          {/* 1차 관리기준 빨간 점선 */}
          {refLine !== null && (
            <ReferenceLine
              y={refLine}
              stroke="#C0392B"
              strokeDasharray="6 3"
              strokeWidth={1.5}
              label={{ value: '1차 하한', position: 'insideTopLeft', fontSize: 9, fill: '#C0392B' }}
            />
          )}
          {refLine2 !== null && (
            <ReferenceLine
              y={refLine2}
              stroke="#E07000"
              strokeDasharray="6 3"
              strokeWidth={1.5}
              label={{ value: '1차 상한', position: 'insideBottomLeft', fontSize: 9, fill: '#E07000' }}
            />
          )}

          <Line
            type="monotone"
            dataKey="value"
            stroke="#1D9E75"
            strokeWidth={1.5}
            dot={showDiamond ? <DiamondDot fill="#1D9E75" /> : false}
            activeDot={{ r: 5 }}
            isAnimationActive={data.length <= 300}
            animationDuration={350}
          />
        </LineChart>
      </ResponsiveContainer>
      {/* 범례 */}
      <div className="mt-2 flex items-center justify-center gap-6 font-mono text-[11px] text-ink-muted">
      <div className="flex items-center gap-1.5">
        <svg width="24" height="10">
          <line x1="0" y1="5" x2="16" y2="5" stroke="#1D9E75" strokeWidth="2" />
          <polygon points="12,2 16,5 12,8 8,5" fill="#1D9E75" />
        </svg>
        <span>{sensor.manageNo || sensor.name}</span>
      </div>
      {refLine !== null && (
        <div className="flex items-center gap-1.5">
          <svg width="24" height="10">
            <line x1="0" y1="5" x2="24" y2="5" stroke="#C0392B" strokeWidth="1.5" strokeDasharray="4 2" />
          </svg>
          <span className="text-sensor-dangertext">1차 하한기준</span>
        </div>
      )}
      {refLine2 !== null && (
        <div className="flex items-center gap-1.5">
          <svg width="24" height="10">
            <line x1="0" y1="5" x2="24" y2="5" stroke="#E07000" strokeWidth="1.5" strokeDasharray="4 2" />
          </svg>
          <span className="font-mono text-[11px]" style={{ color: '#E07000' }}>1차 상한기준</span>
        </div>
      )}
    </div>
   </div>
  )
}