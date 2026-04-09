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

- **대시보드**: 전체 센서 현황, KPI 카드, 최근 알람, 1분마다 자동 갱신
- **센서 관리**: 센서 목록, 상태 필터, 상세 페이지, QR 코드
- **새 센서 반자동 등록**: 에이전트가 새 센서 파일 감지 시 자동 DB 등록 → 관리자가 편집 UI에서 정보 수정
- **센서 상세**: 시간별 트렌드 차트, 측정 데이터 테이블, 날짜 범위 선택, 보고서 출력
- **알람 관리**: 알람 목록, 개별/전체 확인 처리, 심각도 필터
- **현장 관리**: 현장 추가/편집/삭제, 센서 배정(타 현장 배정 센서 선택 불가), 담당자 관리, 담당자 클릭 시 상세 정보 모달
- **회원가입**: 로그인 없이 회원가입 가능, 기본 권한은 MultiMonitor로 자동 설정됨. 관리자가 사용자 관리 페이지에서 권한 변경 필요
- **본인 계정 권한 변경 방지**: 사용자 관리 페이지에서 본인 계정 행에는 수정/비활성화/삭제 버튼 표시 안 됨
- **사용자 관리**: 사용자 추가/수정/삭제/비활성화, 핸드폰번호 관리, 권한 관리
- **파일 관리**: 파일 업로드/다운로드/삭제
- **QR 코드**: 로그인 없이 센서 현재 상태 조회, 로그인 시 상세 페이지 이동
- **비밀번호 변경**: 사이드바 하단에서 본인 비밀번호 변경 가능
- **권한별 접근 제어**: MultiMonitor 역할은 조회 및 파일 관리만 가능, 편집/삭제/사용자 관리/알람 처리 불가

## 🔒 권한 구조

| 권한 | 센서 조회 | 센서 편집 | 알람 처리 | 사용자 관리 | 현장 관리 | 파일 관리 |
|------|----------|----------|----------|------------|----------|----------|
| admin | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Administrator | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Manager | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Operator | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Monitor | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| MultiMonitor | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ |

## ⚠️ 주의사항

- **본인 계정의 권한을 변경할 때는 반드시 다른 관리자 계정이 존재하는지 확인하세요.**
- 시스템에 관리자 계정이 본인 하나뿐인 상태에서 자신의 권한을 `MultiMonitor`로 변경하면 사용자 관리 기능을 사용할 수 없게 됩니다.
- 이 경우 UI에서 복구가 불가능하며 별도 복구 작업이 필요합니다.
- **최소 1개 이상의 관리자 계정을 항상 유지하는 것을 권장합니다.**

## 👤 기본 계정

- **이메일**: admin@geomonitor.com
- **비밀번호**: admin1234

## 📌 버전

- **v1.0.0** (2026.04.03)
