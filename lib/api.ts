const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://yuhyun-sensor-monitoring-back.onrender.com'

async function request(path: string, options: RequestInit = {}) {
  const token = typeof window !== 'undefined' ? localStorage.getItem('gm_token') : null
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  }
  if (token) headers['Authorization'] = `Bearer ${token}`

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers })
  const data = await res.json()
  if (!res.ok) {
    if (res.status === 401) {
      // 토큰 만료 또는 인증 실패 → 토큰 삭제 후 로그인 페이지로 이동
      if (typeof window !== 'undefined') {
        localStorage.removeItem('gm_token')
        localStorage.removeItem('gm_user')
        window.location.href = '/login?expired=true'
      }
      throw new Error('세션이 만료되었습니다.')
    }
    throw new Error(data.error || '요청 실패')
  }
  return data
}

export const authApi = {
  register: (body: { username: string; email: string; password: string; role?: string; phone?: string }) =>
    request('/api/auth/register', { method: 'POST', body: JSON.stringify(body) }),

  login: (body: { email: string; password: string }) =>
    request('/api/auth/login', { method: 'POST', body: JSON.stringify(body) }),

  logout: () =>
    request('/api/auth/logout', { method: 'POST' }),

  me: () => request('/api/auth/me'),
}

export const sensorApi = {
  getAll: (status?: string) =>
    request(`/api/sensors${status ? `?status=${status}` : ''}`),
  getById: (id: number) =>
    request(`/api/sensors/${id}`),

  getMeasurements: (id: number, params?: { from?: string; to?: string; depthLabel?: string; limit?: number }) => {
    const q = new URLSearchParams()
    if (params?.from) q.set('from', params.from)
    if (params?.to) q.set('to', params.to)
    if (params?.depthLabel) q.set('depthLabel', params.depthLabel)
    if (params?.limit) q.set('limit', String(params.limit))
    return request(`/api/sensors/${id}/measurements?${q.toString()}`)
  },

  getDepths: (id: number) =>
    request(`/api/sensors/${id}/depths`),
  updateInfo: (id: number, body: {
    name?: string; manage_no?: string; sensor_type?: string; unit?: string; field?: string;
    formula?: string;
    level1_upper?: number | string | null;
    level1_lower?: number | string | null;
    level2_upper?: number | string | null;
    level2_lower?: number | string | null;
    criteria_unit?: string | null;
    criteria_unit_name?: string | null;
    install_date?: string | null;
    location_desc?: string | null;
    formula_params?: Record<string, string> | null;
    correction_params?: Record<string, number> | null;
    depth_criteria?: Record<string, { upper: number | null; lower: number | null }> | null;
    formula_id?: number | null;
    }) =>
  request(`/api/sensors/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  updateThreshold: (id: number, body: { threshold_normal_max: any; threshold_warning_max: any; threshold_danger_min: any }) =>
    request(`/api/sensors/${id}/threshold`, { method: 'PATCH', body: JSON.stringify(body) }),
  updateSite: (id: number, site_code: string) =>
    request(`/api/sensors/${id}/site`, { method: 'PATCH', body: JSON.stringify({ site_code }) }),
}

export const formulaApi = {
  getAll: () => request('/api/formulas'),
  create: (body: { name: string; expression: string; description?: string }) =>
    request('/api/formulas', { method: 'POST', body: JSON.stringify(body) }),
  update: (id: number, body: { name: string; expression: string; description?: string }) =>
    request(`/api/formulas/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: (id: number) =>
    request(`/api/formulas/${id}`, { method: 'DELETE' }),
}


export const alarmApi = {
  getAll: (acknowledged?: boolean) =>
    request(`/api/alarms${acknowledged !== undefined ? `?acknowledged=${acknowledged}` : ''}`),

  acknowledge: (id: number, acknowledgedBy?: string) =>
    request(`/api/alarms/${id}/acknowledge`, { method: 'PATCH', body: JSON.stringify({ acknowledgedBy }) }),
}

export const dashboardApi = {
  get: () => request('/api/dashboard'),
}

export const userApi = {
  getAll: () => request('/api/users'),
  getActive: () => request('/api/users/active'),
  getList: () => request('/api/users/list'),
  edit: (id: number, body: { username: string; email: string; role: string; phone?: string }) =>
    request(`/api/users/${id}/edit`, { method: 'PATCH', body: JSON.stringify(body) }),
  changePassword: (id: number, body: { currentPassword: string; newPassword: string }) =>
    request(`/api/users/${id}/password`, { method: 'PATCH', body: JSON.stringify(body) }),
  deactivate: (id: number) => request(`/api/users/${id}/deactivate`, { method: 'PATCH' }),
  activate: (id: number) => request(`/api/users/${id}/activate`, { method: 'PATCH' }),
  delete: (id: number) => request(`/api/users/${id}`, { method: 'DELETE' }),
}

export const fileApi = {
  getAll: () => request('/api/files'),

  upload: (file: File) => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('gm_token') : null
    const formData = new FormData()
    formData.append('file', file)
    return fetch(`${API_BASE}/api/files/upload`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    }).then(r => r.json())
  },

  download: (id: number) => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('gm_token') : null
    return fetch(`${API_BASE}/api/files/${id}/download`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
  },

  delete: (id: number) => request(`/api/files/${id}`, { method: 'DELETE' }),
}

export const siteApi = {
  getAll: () => request('/api/sites'),
  create: (body: { name: string; location: string; description: string; managers: string[]; floor_plan_url?: string }) =>
    request('/api/sites', { method: 'POST', body: JSON.stringify(body) }),
  update: (id: number, body: { name: string; location: string; description: string; managers: string[]; floor_plan_url?: string }) =>
    request(`/api/sites/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: (id: number) =>
    request(`/api/sites/${id}`, { method: 'DELETE' }),
}

export const recollectApi = {
  getAll: () => request('/api/recollect'),
  create: (body: { sensor_id: number; date_from?: string; date_to?: string; reason?: string }) =>
    request('/api/recollect', { method: 'POST', body: JSON.stringify(body) }),
  delete: (id: number) =>
    request(`/api/recollect/${id}`, { method: 'DELETE' }),
}

export const agentApi = {
  getStatus: () => request('/api/agent/status'),
}