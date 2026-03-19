# GeoMonitor — 계측 모니터링 시스템

지반 계측 센서의 실시간 모니터링, 알람 관리, 현장 관리를 위한 웹 기반 대시보드입니다.

---

## 🛠 기술 스택

| 구분 | 기술 |
|------|------|
| Framework | Next.js 16 (App Router, Turbopack) |
| UI | React 19 + Tailwind CSS v4 |
| 차트 | Recharts |
| QR 코드 | qrcode |
| 언어 | TypeScript 5 |
| 배포 | Vercel (리전: icn1 서울) |

---

## 📁 주요 파일 구조
```
monitoring-dashboard/
├── app/
│   ├── dashboard/        # 대시보드 (KPI, 현장별 현황, 최근 알람)
│   ├── sensors/          # 센서 관리 (모니터링 + 센서 정의 탭)
│   ├── sensors/[id]/     # 센서 상세 (날짜 범위, 트렌드 차트, 출력)
│   ├── alarms/           # 알람 관리
│   ├── sites/            # 현장 관리
│   ├── users/            # 사용자 관리
│   ├── files/            # 파일 관리
│   ├── qr/[id]/          # QR 공개 조회 페이지
│   ├── login/            # 로그인 / 회원가입
│   └── logout/           # 로그아웃
├── components/
│   ├── layout/
│   │   └── Sidebar.tsx   # 반응형 사이드바 (데스크탑 고정 + 모바일 드로어)
│   ├── charts/
│   │   └── SensorTrendChart.tsx
│   └── ui/
│       ├── StatusBadge.tsx
│       ├── QRCode.tsx
│       ├── QRModal.tsx
│       ├── QRCodeSection.tsx
│       └── QRTrendSection.tsx
├── lib/
│   ├── mock-data.ts       # 목 데이터 + 헬퍼 함수
│   ├── sensor-store.ts    # 전역 센서 상태 스토어 (싱글톤)
│   ├── sensor-simulator.ts # 15분 주기 실시간 시뮬레이터
│   └── auth-context.tsx   # 로그인 세션 Context
└── types/
    └── index.ts           # UnifiedSensor 등 전체 타입 정의
```

---

## ⚙️ 설정 주의사항

### Tailwind CSS v4
- `tailwind.config.ts` **미사용**
- 모든 색상 토큰은 `app/globals.css`의 `@theme {}` 블록에서 관리
- 색상 키 네이밍: **하이픈 없는 flat 키** (`sensor-normalbg`, `sensor-dangerborder` 등)
- CSS 진입점: `@import "tailwindcss"` (v3의 `@tailwind base/components/utilities` 아님)

### 전역 상태
- Zustand/Jotai 없이 **순수 모듈 싱글톤** 패턴 사용
- `useSensorStore()` 훅으로 모든 페이지에서 구독
- 임계값 변경 → 센서 상태 재평가 → 알람 자동 생성까지 스토어에서 처리

### 센서 식별
- `id` : 내부 식별자 (예: GS-001) — URL 라우팅에 사용
- `manageNo` : 화면 표시용 관리번호 (예: MN-001) — UI에 표시
- `alarms.sensorId` : `manageNo` 기준으로 표시, 링크는 실제 `id`로 이동

---

## 🚀 로컬 실행
```bash
# 의존성 설치
npm install

# 개발 서버 시작
npm run dev
# → http://localhost:3000

# 프로덕션 빌드
npm run build
```

---

## 🌐 Vercel 배포
```bash
# Vercel CLI 설치
npm install -g vercel

# 로그인
vercel login

# 배포
vercel --prod
```

### 환경 변수

`.env.local` 파일을 생성하고 아래 값을 입력하세요.
```bash
# QR 코드에 인코딩될 베이스 URL
NEXT_PUBLIC_BASE_URL=https://your-domain.vercel.app
```

> **모바일 QR 스캔을 위해 반드시 설정 필요**
> localhost로 설정된 경우 외부 기기에서 QR 스캔 불가

---

## 🔐 테스트 계정

| ID | PW | 이름 | 권한 |
|----|----|------|------|
| admin01 | 1234 | 김관리자 | Administrator |
| mgr_a | 1234 | 이현장 | Manager |

---

## 📱 주요 기능

### 대시보드
- KPI 카드 5종 (전체/정상/주의/위험/활성알람) — 클릭 시 해당 센서 목록 필터 표시
- 현장별 실시간 상태 집계 및 진행 바
- 최근 알람 피드
- 위험 센서 즉시 확인 배너

### 센서 관리
- **모니터링 탭**: 실시간 센서 상태, 상태별 필터, 현장 필터
- **센서 정의 탭**: 추가/편집/삭제 CRUD
  - 관리번호, 구간-그룹, 관련분야(7종), 측정방법(15종), 계산식(8종)
  - 임계값 설정 (정상/주의/위험 수치) — 저장 즉시 알람 연동
  - 동작 설정, 수식 파라미터, 관리 기준

### 센서 상세 페이지
- 날짜 범위 선택 (빠른 선택: 오늘/7일/30일/90일 + 직접 입력)
- 15분 단위 시간별 트렌드 차트 (X축 최대 12개 틱)
- 측정 데이터 테이블 (15건 페이지네이션)
- 출력 모달: 총괄표 타이틀, 인쇄 범위, 기간, 출력일시, 출력대상(15종 간격), 미리보기, 인쇄
- QR 코드 생성 (PNG 저장 + URL 복사)

### 알람 관리
- 센서 임계값 초과 시 자동 알람 발생 (스토어 실시간 연동)
- 단건/전체 확인 처리 (3단계 애니메이션)
- severity 필터 탭 (전체/위험/주의/정보/해제)

### 현장 관리
- 실시간 센서 상태 기반 현장 상태 집계
- 뷰 필터 탭 (전체/위험/주의/정상)
- 담당자 다중 선택 — 이름 클릭 시 사용자 상세 정보 팝업

### 사용자 관리
- 권한 5종: Administrator / Manager / Operator / Monitor / MultiMonitor
- 뷰 필터 탭 (전체/현재/삭제/비활성화)
- 계정 상태 관리 (활성/비활성화/삭제)

### 파일 관리
- 카테고리: 계측보고서 / 공정사진 / 설계정보 / 기타
- 파일 등록 모달: 드래그&드롭, 종류 선택, 내용 입력, 작성자 자동 입력
- 임시저장 → 호버 팝오버 → 정식 등록 또는 삭제
- 제목/작성자 검색, 다운로드

### QR 코드
- 센서별 QR 생성 — 모바일 스캔 시 센서 현황 페이지로 이동
- QR 공개 페이지: 관리번호, 센서명, 현재값, 임계값, 15분 트렌드 차트

### 인증
- 로그인/회원가입 페이지 (`/login`)
- sessionStorage 기반 세션 유지
- 로그인 사용자 정보가 파일 등록 작성자, 알람 확인자에 자동 반영

---

## 📱 반응형 지원

| 환경 | 동작 |
|------|------|
| 데스크탑 (md 이상) | 좌측 고정 사이드바 |
| 모바일 (md 미만) | 상단 고정 헤더 + 햄버거 버튼 → 슬라이드 드로어 |

- 모바일 헤더 GEOMONITOR 탭 → 대시보드 이동
- 미처리 알람 수 모바일 헤더에 실시간 표시
- 테이블 가로 스크롤 지원
- 필터 탭 가로 스크롤 (스크롤바 숨김)

---

## 🔄 실시간 시뮬레이션

개발/테스트용 센서 측정값 자동 갱신 기능이 포함되어 있습니다.

- 대시보드 마운트 시 15분 주기 시뮬레이터 자동 시작
- 대시보드 헤더 `↻ 즉시 갱신` 버튼으로 즉시 1회 실행 가능
- 측정값 변경 → 임계값 재평가 → 상태 변경 → 알람 자동 생성

---

## 📦 의존성
```json
{
  "dependencies": {
    "next": "16.1.6",
    "react": "19.2.3",
    "react-dom": "19.2.3",
    "recharts": "^2.13.0",
    "qrcode": "^1.5.4"
  }
}
```