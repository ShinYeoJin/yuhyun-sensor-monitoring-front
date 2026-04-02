# GeoMonitor 프론트엔드

> 지반 계측 센서 실시간 모니터링 시스템 - 프론트엔드

## 📋 프로젝트 개요

GeoMonitor는 지반 계측 센서 데이터를 실시간으로 수집·저장·시각화하는 모니터링 시스템입니다.
수위계, 지중경사계 등 다양한 센서의 측정값을 1시간 단위로 자동 수집하며, 임계값 초과 시 알람을 발생시킵니다.

## 🔗 배포 URL

- **프론트엔드**: https://yuhyun-sensor-monitoring-front.vercel.app
- **백엔드 API**: https://yuhyun-sensor-monitoring-back.onrender.com
- **Swagger UI**: https://yuhyun-sensor-monitoring-back.onrender.com/api-docs

## 🛠 기술 스택

- **Framework**: Next.js 16
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **배포**: Vercel

## 📁 프로젝트 구조
```
app/
├── dashboard/      # 대시보드 (실시간 센서 현황)
├── sensors/        # 센서 관리 및 상세 페이지
├── alarms/         # 알람 관리
├── users/          # 사용자 관리
├── files/          # 파일 관리
├── sites/          # 현장 관리
├── login/          # 로그인/회원가입
├── logout/         # 로그아웃
└── qr/[id]/        # QR 코드 현장 조회

components/
├── layout/
│   └── Sidebar.tsx # 사이드바 네비게이션
├── charts/
│   └── SensorTrendChart.tsx # 센서 트렌드 차트
└── ui/
    ├── StatusBadge.tsx
    ├── QRCode.tsx
    └── QRModal.tsx

lib/
├── api.ts          # API 호출 함수
├── auth-context.tsx # 인증 컨텍스트
└── sensor-store.ts # 센서 상태 관리
```

## 🚀 로컬 실행 방법
```bash
# 패키지 설치
npm install

# 개발 서버 실행
npm run dev

# 빌드
npm run build
```

## 🔐 환경변수
```env
NEXT_PUBLIC_API_URL=https://yuhyun-sensor-monitoring-back.onrender.com
```

## 📱 주요 기능

- **대시보드**: 전체 센서 현황, KPI 카드, 최근 알람
- **센서 관리**: 센서 목록, 상태 필터, 상세 페이지, QR 코드
- **센서 상세**: 시간별 트렌드 차트, 측정 데이터 테이블
- **알람 관리**: 알람 목록, 확인 처리, 전체 확인
- **사용자 관리**: 사용자 추가/수정/삭제/비활성화
- **파일 관리**: 파일 업로드/다운로드/삭제
- **현장 관리**: 현장별 센서 현황, 담당자 관리

## 👤 기본 계정

- **이메일**: admin@geomonitor.com
- **비밀번호**: admin1234

## 📌 버전

- **v1.0.0** (2026.04.03)