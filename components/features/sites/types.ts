import type { Site } from '@/types'

export type SiteForm = {
  name: string; location: string; description: string; managers: string[]; selectedSensors: number[]; has_floor_plan?: boolean; latitude?: number; longitude?: number
}

export type SiteStatus = 'danger' | 'warning' | 'normal'
export type ViewFilter = 'all' | 'danger' | 'warning' | 'normal'

export interface SiteWithStatus extends Site {
  liveStatus:  SiteStatus
  liveDanger:  number
  liveWarning: number
  liveNormal:  number
  liveOffline: number
  liveTotal:   number
  dbId:        number
  managers:    string[]
}

export const statusStyle: Record<SiteStatus, { badge: string; tab: string; label: string }> = {
  danger:  { badge: 'bg-sensor-dangerbg  border-sensor-dangerborder  text-sensor-dangertext',  tab: 'border-sensor-dangerborder  bg-sensor-dangerbg  text-sensor-dangertext',  label: '위험' },
  warning: { badge: 'bg-sensor-warningbg border-sensor-warningborder text-sensor-warningtext', tab: 'border-sensor-warningborder bg-sensor-warningbg text-sensor-warningtext', label: '주의' },
  normal:  { badge: 'bg-sensor-normalbg  border-sensor-normalborder  text-sensor-normaltext',  tab: 'border-sensor-normalborder  bg-sensor-normalbg  text-sensor-normaltext',  label: '정상' },
}
