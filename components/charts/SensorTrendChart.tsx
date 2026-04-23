'use client'

import {
  LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ReferenceLine, TooltipProps,
} from 'recharts'
import type { SensorReading } from '@/types'

function CustomTooltip({ active, payload }: TooltipProps<number, string>) {
  if (!active || !payload?.[0]) return null
  return (
    <div className="rounded-lg border border-line bg-surface-card px-3 py-2 shadow-cardhover">
      <p className="font-mono text-[10px] text-ink-muted">{payload[0].payload.fullTime}</p>
      <p className="font-mono text-sm font-medium text-ink">
        {payload[0].value !== null ? payload[0].value : '미수신'}{' '}
        <span className="text-xs text-ink-muted">{payload[0].payload.unit}</span>
      </p>
    </div>
  )
}

function DiamondDot(props: any) {
  const { cx, cy, fill, payload } = props
  if (!cx || !cy || payload?.value === null) return null
  const size = 4
  return (
    <polygon
      points={`${cx},${cy - size} ${cx + size},${cy} ${cx},${cy + size} ${cx - size},${cy}`}
      fill={fill} stroke={fill} strokeWidth={1}
    />
  )
}

interface Props {
  sensor: any
  readings?: SensorReading[]
  hideXAxis?: boolean
  initValue?: number
  level1Upper?: number | null
  level1Lower?: number | null
}

export function SensorTrendChart({ sensor, readings, hideXAxis = false, initValue, level1Upper: propLevel1Upper, level1Lower: propLevel1Lower }: Props) {
  const source = readings ?? sensor.readings ?? []

  const sortedSource = [...source].sort((a, b) =>
    new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  )

  const data = sortedSource.map((r: SensorReading) => {
    const d = new Date(r.timestamp)
    const val = r.value === null ? null : (typeof r.value === 'string' ? parseFloat(r.value) : r.value)
    return {
      time: d.toLocaleDateString('ko-KR', { month: '2-digit', day: '2-digit' }),
      fullTime: d.toLocaleString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }),
      value: val,
      unit: sensor.unit,
      isGap: r.value === null,
    }
  })

  // 1차 관리기준
  const level1Lower = propLevel1Lower !== undefined ? propLevel1Lower
    : (sensor.criteria?.level1Lower !== '' && sensor.criteria?.level1Lower != null ? parseFloat(sensor.criteria.level1Lower) : null)
  const level1Upper = propLevel1Upper !== undefined ? propLevel1Upper
    : (sensor.criteria?.level1Upper !== '' && sensor.criteria?.level1Upper != null ? parseFloat(sensor.criteria.level1Upper) : null)
  const refLine  = (level1Lower !== null && level1Lower !== undefined && !isNaN(level1Lower)) ? level1Lower : null
  const refLine2 = (level1Upper !== null && level1Upper !== undefined && !isNaN(level1Upper)) ? level1Upper : null

  // 가로 스크롤: 데이터 1건당 최소 12px, 최소 전체 너비
  const MIN_WIDTH_PER_POINT = 12
  const chartWidth = Math.max(data.length * MIN_WIDTH_PER_POINT, 500)
  const chartHeight = 200

  // x축 틱: 너무 많으면 간격 조정
  const maxTicks = Math.floor(chartWidth / 60)
  const tickStep = Math.max(1, Math.ceil(data.length / maxTicks))

  return (
    <div>
      {/* 가로 스크롤 컨테이너 */}
      <div
        style={{ overflowX: 'auto', overflowY: 'hidden', width: '100%', cursor: 'default' }}
        className="scrollbar-thin"
      >
        <div style={{ width: chartWidth, minWidth: '100%' }}>
          <LineChart
            width={chartWidth}
            height={chartHeight}
            data={data}
            margin={{ top: 20, right: 70, bottom: hideXAxis ? 4 : 28, left: 8 }}
          >
            <CartesianGrid strokeDasharray="" stroke="#e5e9f0" horizontal={true} vertical={false} />
            <XAxis
              dataKey="time"
              tick={hideXAxis ? false : { fontSize: 10, fill: '#8a9ab8', fontFamily: 'DM Mono, monospace' }}
              tickLine={false}
              axisLine={{ stroke: '#dde3ed' }}
              interval={tickStep - 1}
              height={hideXAxis ? 4 : 28}
              label={{ value: '계측일자(Day)', position: 'insideBottomRight', offset: -4, fontSize: 10, fill: '#8a9ab8' }}
            />
            <YAxis
              tick={{ fontSize: 9, fill: '#8a9ab8', fontFamily: 'DM Mono, monospace' }}
              interval="preserveStartEnd"
              minTickGap={30}
              tickLine={false}
              axisLine={{ stroke: '#dde3ed' }}
              tickFormatter={(v) => { const n = parseFloat(v); return isNaN(n) ? `${v}` : n.toFixed(2) }}
              width={52}
              domain={
                (refLine !== null || refLine2 !== null)
                  ? [
                      (dataMin: number) => {
                        const c = [dataMin, refLine, refLine2].filter(v => v !== null) as number[]
                        const mn = Math.min(...c)
                        return mn >= 0 ? mn * 0.997 : mn * 1.003
                      },
                      (dataMax: number) => {
                        const c = [dataMax, refLine, refLine2].filter(v => v !== null) as number[]
                        const mx = Math.max(...c)
                        return mx >= 0 ? mx * 1.003 : mx * 0.997
                      },
                    ]
                  : ['auto', 'auto']
              }
              label={{ value: `G.L(${sensor.unit || 'm'})`, angle: -90, position: 'insideLeft', offset: 10, fontSize: 10, fill: '#8a9ab8' }}
            />
            <Tooltip content={<CustomTooltip />} />

            {/* 1차 하한기준 */}
            {refLine !== null && (
              <ReferenceLine y={refLine} stroke="#C0392B" strokeDasharray="6 3" strokeWidth={1.5}
                label={({ viewBox }: any) => (
                  <text x={viewBox.x + 6} y={viewBox.y - 4} fill="#C0392B" fontSize={9} fontFamily="DM Mono, monospace">
                    1차 하한기준 ({refLine})
                  </text>
                )}
              />
            )}
            {/* 1차 상한기준 */}
            {refLine2 !== null && (
              <ReferenceLine y={refLine2} stroke="#E07000" strokeDasharray="6 3" strokeWidth={1.5}
                label={({ viewBox }: any) => (
                  <text x={viewBox.x + 6} y={viewBox.y + 12} fill="#E07000" fontSize={9} fontFamily="DM Mono, monospace">
                    1차 상한기준 ({refLine2})
                  </text>
                )}
              />
            )}

            <Line
              type="monotone"
              dataKey="value"
              stroke="#1D9E75"
              strokeWidth={1.5}
              dot={data.length <= 200 ? <DiamondDot fill="#1D9E75" /> : false}
              activeDot={{ r: 4 }}
              isAnimationActive={false}
              connectNulls={false}
            />
          </LineChart>
        </div>
      </div>

      {/* 범례 */}
      <div className="mt-1 flex items-center justify-center gap-6 font-mono text-[11px] text-ink-muted">
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
            <span style={{ color: '#E07000' }}>1차 상한기준</span>
          </div>
        )}
      </div>
    </div>
  )
}