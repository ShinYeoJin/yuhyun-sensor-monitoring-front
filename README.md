# GeoMonitor — 지반 계측 모니터링 시스템

산업용 지반 계측 센서 실시간 모니터링 Next.js 웹 애플리케이션입니다.

---

## 기술 스택

| 항목 | 버전 / 내용 |
|------|------------|
| Framework | Next.js 16 (App Router, Turbopack) |
| Language | TypeScript 5 |
| Styling | Tailwind CSS **v4** |
| Charts | Recharts 2 |
| Runtime | React 19 |
| Deploy | Vercel |

---

## ⚠️ Tailwind v4 주의사항

이 프로젝트는 **Tailwind CSS v4**를 사용합니다. v3과 설정 방식이 다릅니다.

| 항목 | v3 | v4 (현재) |
|------|----|----|
| 설정 파일 | `tailwind.config.ts` | `app/globals.css` 의 `@theme { }` |
| CSS 진입점 | `@tailwind base/components/utilities` | `@import "tailwindcss"` |
| PostCSS 플러그인 | `tailwindcss: {}` | `'@tailwindcss/postcss': {}` |

`tailwind.config.ts`는 v4에서 **무시**됩니다. 모든 커스텀 토큰은 `app/globals.css`의 `@theme` 블록에서 관리합니다.

---

## 프로젝트 구조

```
monitoring-dashboard/
├── app/
│   ├── globals.css             # Tailwind v4 @theme 토큰 + 공통 스타일
│   ├── layout.tsx              # 루트 레이아웃
│   ├── page.tsx                # 루트 → /dashboard redirect
│   ├── dashboard/
│   │   ├── layout.tsx          # 사이드바 포함 어드민 레이아웃
│   │   └── page.tsx            # 대시보드 메인 페이지
│   ├── sensors/
│   │   ├── layout.tsx          # 사이드바 레이아웃
│   │   ├── page.tsx            # 센서 목록 (필터 / 검색)
│   │   └── [id]/
│   │       └── page.tsx        # 센서 상세 + 트렌드 차트
│   ├── alarms/
│   │   ├── layout.tsx
│   │   └── page.tsx            # 알람 목록 + 확인 처리
│   ├── users/
│   │   ├── layout.tsx
│   │   └── page.tsx            # 사용자 관리
│   ├── sites/
│   │   ├── layout.tsx
│   │   └── page.tsx            # 현장 관리
│   ├── qr/
│   │   └── [id]/
│   │       └── page.tsx        # QR 코드 현장 조회 (공개 페이지 — 사이드바 없음)
│   └── api/
│       ├── sensors/route.ts    # GET /api/sensors
│       ├── sensors/[id]/route.ts
│       └── alarms/route.ts     # GET /api/alarms
│
├── components/
│   ├── ui/
│   │   └── StatusBadge.tsx     # 센서 상태 뱃지 / 알람 뱃지 / 배터리 표시
│   ├── charts/
│   │   └── SensorTrendChart.tsx # Recharts 트렌드 차트 (임계선 포함)
│   └── layout/
│       └── Sidebar.tsx         # 사이드바 네비게이션
│
├── lib/
│   └── mock-data.ts            # 목 데이터 & 유틸 함수
│
├── types/
│   └── index.ts                # TypeScript 타입 정의
│
├── package.json
├── postcss.config.mjs          # @tailwindcss/postcss 설정 (ESM)
├── tailwind.config.ts          # v4에서 미사용 (참고용)
└── tsconfig.json
```

---

## 시작하기

```bash
# 의존성 설치 (recharts 포함)
npm install

# 개발 서버 실행
npm run dev
# → http://localhost:3000

# 프로덕션 빌드
npm run build

# Vercel 배포
npx vercel --prod
```

---

## 주요 페이지

| 경로 | 설명 |
|------|------|
| `/dashboard` | KPI 카드 5종, 현장별 상태 현황, 최근 알람 피드 |
| `/sensors` | 전체 센서 목록 — 상태별 필터 탭, 현장 필터, 실시간 검색 |
| `/sensors/[id]` | 센서 상세 정보, 임계값 게이지, Recharts 트렌드 차트 |
| `/alarms` | 알람 목록 — 심각도별 필터, 확인/해제 처리 |
| `/sites` | 현장 목록 — 상태 진행 바, 센서 현황 요약 |
| `/users` | 사용자 목록 — 역할 관리, 활성화/비활성화 |
| `/qr/[id]` | QR 코드 스캔 후 현장 직원 조회용 공개 페이지 |

---

## 색상 토큰 시스템

`app/globals.css`의 `@theme` 블록에 정의된 커스텀 토큰입니다.

### 배경 / 경계 / 텍스트

```
bg-surface-page      #f4f6f9   최외곽 페이지 배경
bg-surface-card      #ffffff   카드 / 패널
bg-surface-subtle    #f0f3f7   강조 영역
bg-surface-muted     #e8ecf2   비활성 / hover

border-line          #dde3ed   기본 경계선
border-line-strong   #c8d2e0   강조 경계선

text-ink             #1a2233   본문
text-ink-sub         #4a5a72   보조
text-ink-muted       #8a9ab8   힌트
```

### 센서 상태

| 상태 | 클래스 접두사 | 색상 |
|------|-------------|------|
| 정상 | `sensor-normal*` | 에메랄드 계열 |
| 주의 | `sensor-warning*` | 앰버/골드 계열 |
| 위험 | `sensor-danger*` | 레드 계열 |
| 오프라인 | `sensor-offline*` | 그레이 계열 |

각 상태별로 `bg-sensor-normalbg`, `border-sensor-normalborder`, `text-sensor-normaltext` 형태로 사용합니다.

---

## API 연동 (실제 배포 시)

현재는 `lib/mock-data.ts`의 목 데이터를 사용합니다. 실제 API 연동 시 아래처럼 교체합니다.

```typescript
// lib/api.ts
export async function getSensors(): Promise<Sensor[]> {
  const res = await fetch('/api/sensors', { next: { revalidate: 30 } })
  return res.json()
}
```

실시간 폴링이 필요한 경우 `SWR` 또는 `TanStack Query` 도입을 권장합니다.

```bash
npm install swr
# 또는
npm install @tanstack/react-query
```