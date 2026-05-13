# GeoMonitor 프론트엔드

> 지반 계측 센서 실시간 모니터링 시스템 - 프론트엔드

## 📋 프로젝트 개요

GeoMonitor는 지반 계측 센서 데이터를 실시간으로 수집·저장·시각화하는 웹 기반 모니터링 시스템입니다.
수위계, 지중경사계 등 다양한 센서의 측정값을 1시간 단위로 자동 수집하며, 임계값 초과 시 알람을 발생시킵니다.

## 🔗 배포 URL


- **프론트엔드**: https://yuhyun-sensor-monitoring-front.vercel.app
- **백엔드 API**: https://yuhyun-sensor-monitoring-back.onrender.com
- **Swagger UI**: https://yuhyun-sensor-monitoring-back.onrender.com/api-docs

## 🛠 기술 스택

- **Framework**: Next.js 16
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **폰트**: 맑은 고딕 (Malgun Gothic) — v1.5.0 적용
- **차트**: Recharts
- **수식 계산**: mathjs (계산식 미리보기용 — v1.5.0)
- **PDF 출력**: jsPDF + jspdf-autotable
- **엑셀 출력**: ExcelJS
- **배포**: Vercel

## 📁 프로젝트 구조
```
app/
├── dashboard/      # 대시보드 (실시간 센서 현황, 카카오맵 플레이스홀더)
├── sensors/        # 센서 관리 및 상세 페이지
├── alarms/         # 알람 관리
├── users/          # 사용자 관리
├── files/          # 파일 관리
├── sites/          # 현장 관리 ("현장 추가 및 편집")
│   └── [id]/       # 현장 상세 페이지 — v1.5.0 신규, v1.6.0 전면 개편
├── login/          # 로그인/회원가입
├── logout/         # 로그아웃
└── qr/[id]/        # QR 코드 현장 조회

components/
├── layout/
│   └── Sidebar.tsx # 사이드바 (현장 이름→/sites/N, 추가및편집 링크, MultiMonitor 기타 그룹 숨김)
├── charts/
│   └── SensorTrendChart.tsx # 트렌드 차트 (ResizeObserver 동적 크기, 가로 스크롤, 범례)
└── ui/
    ├── StatusBadge.tsx
    ├── QRCode.tsx
    └── QRModal.tsx

lib/
├── api.ts          # API 호출 함수 (formula_id 지원)
├── auth-context.tsx # 인증 컨텍스트 (토큰 검증)
└── sensor-store.ts # 센서 상태 관리

types/
└── index.ts        # UnifiedSensor — 계산식 관련 필드 optional 추가
```

## 🚀 로컬 실행 방법
```bash
npm install
npm run dev
npm run build
```

## 🔐 환경변수
```env
NEXT_PUBLIC_API_URL=https://yuhyun-sensor-monitoring-back.onrender.com
NEXT_PUBLIC_KAKAO_MAP_KEY=<카카오 JavaScript 키>
NEXT_PUBLIC_KAKAO_REST_KEY=<카카오 REST API 키>
```

> Vercel 배포 환경에서는 프로젝트 설정 → Environment Variables에서 동일하게 등록합니다.

## 📱 주요 기능

### 대시보드
- 전체 센서 현황 KPI 카드 (전체/정상/주의/위험/오프라인)
- KPI 카드 클릭 시 해당 상태 센서 목록 팝업
- 최근 알람 목록
- 1분마다 자동 갱신, 새로고침 버튼
- **데이터 수신 지연 경고**: 2시간 이상 미수신 시 경고 배너 자동 표시
- **카카오맵 실제 연동** (v1.7.0): 현장 위도/경도 기반 마커 표시, 마커 클릭 → 현장 상세 이동
  - `siteApi.getAll()`(인증 포함)로 현장 목록 조회 → 마커 자동 생성
  - 좌표 없는 현장은 마커 미표시 (현장 편집에서 좌표 입력 필요)
- **현장 목록 표** (v1.7.0): 지도 하단에 전체 현장 수 + 현장 목록 테이블
  - 컬럼: 현장명 / 위치
  - 행 클릭 시 현장 상세 이동

### 센서 관리
- 모니터링 / 센서 정의 / 계산식 관리 / 재수집 4개 탭
- 센서 목록: 관리번호 제거, 센서명만 표시
- 상태 필터 (전체/정상/주의/위험/오프라인)
- 2시간 이상 미수신 경고 표시
- **계산식 관리 탭**: 관리자만 추가/수정/삭제, variables(변수 설명) 컬럼 표시
- **재수집 탭**: 에이전트 온라인/오프라인 상태 확인, 재수집 요청 등록 및 이력
- **센서 편집 모달**: 계수값 저장 후 재편집 시 정상 불러오기
- **센서 정의 탭 설치일 형식**: `2026. 04. 07.` 형태 표시

### 센서 편집 모달 — 수식 및 파라미터 설정 (v1.5.0 전면 개편)
- **계산식 선택**: formulas 목록 드롭다운 + `+ 직접 입력` 옵션
  - 직접 입력 시 `customExpression` 별도 state 관리 (입력 중 창 사라짐 방지)
  - 저장 시 계산식 목록 자동 추가
- **depth별 파라미터 설정 토글**: ON 시 depth별 독립 파라미터 입력, 동적 추가/삭제
- **초기값(I) 설정**: 자동(최초 수신 raw_value) / 수동 입력 선택
  - 자동: openEdit 시 DB에서 최초 raw_value 조회 → formula_params에 저장
  - 수동: 유저 입력값 formula_params에 저장, 재편집 시 유지
  - `autoInitValues` ref로 비동기 타이밍 문제 해결
- **저장 전 테스트 계산 미리보기**: 원시값 R 입력 → 실시간 계산 결과 표시
- formula_params 새 구조 `{ "1": {G, K, A, B, C, I}, ... }` 로 저장 (formula_id 함께 저장)
- 80053/일반 센서 모두 동일한 I(초기값) 저장 로직 적용

### 계산식 상수값 표시 (v1.5.0, v1.6.0 확장)
- 센서 편집 모달에서 저장된 formula_params 값 표시 (A, B, C, G(Linear), I(초기값))
- I(초기값): formula_params.initVal 또는 formula_params['1'].I 값만 표시 (계산값과 완전 분리)
- **v1.5.0**: 80053 전용 표시 조건
- **v1.6.0**: `formulaParams`에 값이 하나라도 있는 모든 센서로 확장 (`formulaParams.some(v => v !== '')`)
- MultiMonitor 역할은 숨김 유지

### 센서 상세 페이지 — 레이아웃 (v1.5.0 개편)
- **전체 구조**: 상단 2단(센서정보+평면도) + 하단 시간별 트렌드 + 최하단 측정 데이터 로그
- **좌측 패널**: 센서 정보
  - 관리번호: 평면도 아이콘 클릭 시 해당 아이콘 이름 표시, 직접 진입 시 빈칸
  - 센서명/현장/설치위치/설치일/측정단위/측정주기/계산식
  - **마지막 수신**: NonMultiMonitor만 표시
  - **1차 관리기준 인라인 편집**: 수정 버튼 → 상한/하한 직접 입력 → 저장 즉시 반영
  - 계산식 상수값 (formulaParams 있는 모든 센서)
- **중앙 패널**: 계측계획 평면도 + 센서 아이콘
  - 현재 센서 ID에 해당하는 아이콘만 표시 (타 센서 아이콘 필터링)
  - 아이콘 추가/수정/삭제, 드래그앤드롭 위치 이동
  - 아이콘 클릭 시 센서 전환(80053은 depth 전환) + 관리번호 자동 표시
  - **depth 전환 시 iconLabel 업데이트**: depth 버튼 클릭 시 해당 아이콘 label로 setIconLabel
  - 평면도 변경: PNG/JPG/PDF 업로드 (PDF 자동 PNG 변환)
  - 상태별 색상 (정상: 초록 / 경고: 주황 / 위험: 빨강), 범례
- **패널 드래그 리사이즈**: 좌↔중 핸들 (160~360px)
- **시간별 트렌드** (조회 버튼 추가)
  - 조회 버튼 클릭 시에만 fetch (queryCondition state)
  - 일별 모드: 선택 시각 기준 시간 필터링
  - 계산식 (Linear/Polynomial), depth 선택 (아이콘 label 우선)
  - 보정값 입력 (80053 전용, depth별 독립 저장)
- **측정 데이터 로그**: 아이콘 label 헤더 표시, 페이지네이션

### 현장 상세 페이지 (`/sites/[id]`) — v1.6.0 전면 개편
- **뷰 1 (평면도 전체 화면)**: 현장 진입 시 기본 뷰
  - 상단: `← 현장 추가 및 편집 / 현장명` + 노드 제어(+추가/-삭제)
  - 평면도 전체 화면, 센서 아이콘, 범례
  - 센서 아이콘 클릭 → 뷰 2로 전환
  - 평면도 영역: 센서 아이콘(+추가/✏️수정/🗑️삭제) + 📎평면도 변경 버튼
  - **수정/삭제 버튼**: 아이콘이 하나라도 있으면 항상 표시 (`icons.length > 0`)
- **뷰 2 (센서 상세 뷰)**: 아이콘 클릭 후
  - 상단: `← 도면으로 돌아가기` + Excel/PDF/📱QR 버튼
  - 좌측: 센서 트리(타입별 그룹 + 토글 접기/펼치기) + 하단 센서 정보
  - 우측: 트렌드 컨트롤 + 측정값 카드 + 차트 + 측정 데이터 로그
- **아이콘 클릭 시 올바른 depth 보장**: `pendingViewDetail` + `pendingDepth` ref 사용
  - 처음 클릭 시 sensor 데이터 로딩 완료 후 올바른 depth로 뷰 전환
  - 같은 센서 재클릭 시 즉시 depth 적용 및 전환
- **센서 그룹 토글**: `collapsedGroups` state, 그룹명 클릭으로 접기/펼치기
- **노드 제어**: 센서 추가/삭제 (기존 기능 유지, 이름만 변경)
- **센서 아이콘 그룹**: 추가/수정/삭제 (기존 기능 유지, 이름만 변경)
- **보정값 입력**: 80053 전용, depth별 독립 저장 (v1.6.0 추가)
- **QR 기능**: 센서 관리와 동일한 QRModal 사용 (v1.6.0 추가)
- **엑셀/PDF**: 아이콘 라벨을 계측 No로 표시

### 엑셀 출력 (Water Level Meter Report) — v1.6.0 개선
- **컬럼 폭 수정**: `[22, 8, 16, 14, 16, 18]` (측정일 넓게, 헤더 좁게)
- **초기치 행**: `globalInitReading` 기반 전체 기간 최초값을 allRows 맨 앞에 추가
  - 조회 기간과 무관하게 항상 첫 행으로 표시
  - `isInitRow` 마커로 isFirst 판별
- **날짜+시간 표시**: 측정일, 초기측정일 모두 `toLocaleString` 적용 (오전/오후 N시 포함)
- **일별 모드**: 선택 시각이 모든 행에 표시 (예: 오후 2시 선택 → 전체 행 오후 2시)
- 소수점 4자리, 헤더 색상 회색, 차트 이미지 삽입, 범례, A4 인쇄 설정

### PDF 출력 (Water Level Meter Report) — v1.6.0 개선
- **관리자/설치위치 행 삭제**: 현장명+계측기No, 설치현황+초기측정일 2행만 표시
- **헤더 폭 조정**: `columnStyles` → `{0: 27, 1: 64, 2: 27, 3: 64}` (그래프/데이터 표 폭에 맞춤)
- **초기치 행**: 엑셀과 동일하게 전체 기간 최초값 pdfAllRows 맨 앞에 추가
- **날짜+시간 표시**: 측정일 `toLocaleString`, `dateOnlyKey`는 remarks key 전용으로 분리
- NanumGothic 한글 폰트, depth별 기준선, 데이터 끊김 구간 표시

### 80053 수위계 전용 기능
- **WL-02 평균값**: depth 1/3 데이터 평균으로 대체, toHourKey()로 KST 기준 시간 키 생성
- **depth_label 선택**: 아이콘 label 우선 (없으면 N번 수위계 fallback)
- **계산식**: Linear(메인) / Polynomial 토글
- **depth별 보정값 입력**: depth별 독립 입력 및 DB 저장 (correction_params)
- **depth별 1차 관리기준**: depth_criteria DB 저장
- psi→m 변환계수: 0.70307

### I(초기값) 시스템 (v1.6.0 완성)
- **설계 원칙**: I(초기값) = 가장 처음 수신된 raw_value. 계산식/보정값과 완전 독립
- **저장**: formula_params.I 또는 formula_params['1'].I 에 저장
- **표시**: sensor.formulaParams.initVal 전용 (globalInitReading, initValue 등 계산값 미참조)
- **자동 모드**: openEdit 시 최초 raw_value 자동 조회 (80053: depth별, 일반: 단일)
- **수동 모드**: 유저 입력값 유지, 재편집 시 그대로 표시
- **타이밍 문제 해결**: autoInitValues ref로 handleEdit에서 최신값 보장
- globalInitReading에서 보정값 제거 (I(초기값)과 보정값 완전 분리)

### 차트 (SensorTrendChart)
- ResizeObserver 동적 크기, 가로 스크롤 방식
- connectNulls=false (데이터 끊김 구간 선 연결 없음)
- level1Upper/Lower prop으로 depth 전환 시 즉시 반영
- 다이아몬드 마커, Y축 소수 2자리, 범례
- **Min/Max 마커** (v1.7.0): 조회 기간 내 최솟값(빨간 원 + Min 말풍선), 최댓값(파란 원 + Max 말풍선) 강조

### 시간별 트렌드 — 실시간 요약 카드 (v1.7.0 신규)
- 차트 위 드래그 가능한 플로팅 카드
- 표시 항목: 현재값(최근 정시 데이터) / 최댓값 / 최솟값 / 기준값(globalInitReading)
- **기준값 대비 변화량 박스**: `현재값 - globalInitReading`
  - 양수: ↑ N.NNNN단위 + '수위 상승'/'상승' 뱃지 (빨간색)
  - 음수: ↓ N.NNNN단위 + '수위 하강'/'하강' 뱃지 (파란색)
  - globalInitReading null 시 — 표시
- 기간 내 최신값 카드에도 누적 변화량 뱃지 표시 (소수점 2자리)

### 측정 데이터 로그 — 변화량 컬럼 (v1.7.0 개선)
- **시간별**: 날짜 / 시각 / 측정값 / 누적 변화량 / 상태
- **일별**: 날짜 / 시각(일평균) / 측정값 / 일일 변화량 / 누적 변화량 / 상태
  - 누적 변화량 = 현재값 - globalInitReading (고정, 전체 기간 초기치 기준)
  - 일일 변화량 = 현재값 - 전 측정값
  - 상승(▲): 빨간색, 하강(▼): 파란색
- 계산상태 컬럼 삭제

### 인증 및 토큰 관리
- 페이지 진입 시마다 `/api/auth/me` 토큰 서버 검증
- 토큰 없거나 만료 시 `/login?expired=true` 이동
- 로그인 페이지에서 만료 안내 메시지 표시

### 사이드바 네비게이션
- **모니터링 그룹**: 대시보드 → 현장 관리(토글) → 센서 관리 → 알람
- **기타 그룹**: 사용자 관리 → 파일 관리 (MultiMonitor: 기타 그룹 전체 숨김)
- **현장 관리 토글**: 현장 이름 클릭 → `/sites/N`, 하단 "추가 및 편집" → `/sites`

### 현장 관리 (`/sites`)
- 현장 카드: 현장명/위치/설명/센서 현황/담당자
- 현장 추가/편집 모달, PDF 업로드 시 PNG 자동 변환
- 현장 편집 저장 시 평면도 유지 (floor_plan_url 별도 관리)
- 페이지 헤더: "현장 추가 및 편집"
- **위도/경도 입력** (v1.7.0): 직접 입력 또는 주소 자동 검색
  - 📍 위치로 좌표 자동 검색 버튼: 주소 입력 → 백엔드 `/api/geocode` 프록시 → 위도/경도 자동 입력
  - 직접 입력 필드도 병행 제공

### QR 기능
- QR 모달: 센서명 표시, `/qr/[id]` 로그인 없이 현재 상태 조회
- 80053: depth별 아이콘 label + Linear/Polynomial 최신값, 보정값 적용

### 기타
- 새 센서 반자동 등록, 비밀번호 변경, 알람 관리, 사용자 관리, 파일 관리
- 권한별 접근 제어, 모바일 반응형

## 🔒 권한 구조

| 권한 | 센서 조회 | 센서 편집 | 알람 처리 | 사용자 관리 | 현장 상세 | 파일 관리 |
|------|----------|----------|----------|------------|----------|----------|
| Administrator | ✅ | ✅ | ✅ | ✅ | ✅ (편집) | ✅ |
| Manager | ✅ | ✅ | ✅ | ✅ | ✅ (편집) | ✅ |
| Operator | ✅ | ✅ | ✅ | ✅ | ✅ (편집) | ✅ |
| Monitor | ✅ | ✅ | ✅ | ✅ | ✅ (편집) | ✅ |
| MultiMonitor | ✅ | ❌ | ❌ | ❌ | ✅ (읽기) | ✅ |

> admin role → Administrator로 DB 업데이트 완료

## ⚠️ 주의사항

- **본인 계정의 권한을 변경할 때는 반드시 다른 관리자 계정이 존재하는지 확인하세요.**
- 시스템에 관리자 계정이 본인 하나뿐인 상태에서 자신의 권한을 `MultiMonitor`로 변경하면 사용자 관리 기능을 사용할 수 없게 됩니다.
- 이 경우 UI에서 복구가 불가능하며 별도 복구 작업이 필요합니다.
- **최소 1개 이상의 관리자 계정을 항상 유지하는 것을 권장합니다.**

## 👤 테스트 계정 (MultiMonitor)

- **이메일**: qwer4321@qwer4321.com
- **비밀번호**: qwer4321

## 📌 버전

- **v1.0.0** (2026.04.03) — 초기 배포
- **v1.1.0** (2026.04.15) — 80053 Poly/Linear 계산식, 재수집 탭, 엑셀/PDF 개선, 수신 지연 경고, 에이전트 v2.1
- **v1.2.0** (2026.04.20) — 80053 depth별 보정값 기능, 1차 상하한 자동 계산, QR 페이지 Linear/Poly 표시, 버튼 UI 개선, 엑셀/PDF 날짜 기준 자동 전환, 모바일 반응형 개선, 센서 편집 계수값 불러오기 버그 수정
- **v1.3.0** (2026.04.22) — 센서 상세 페이지 3단 레이아웃 전면 개편, 평면도 센서 아이콘 드래그앤드롭, 데이터 공백 구간 미수신 처리, 일별 시간 선택 기능, 현장 사이드바 토글 메뉴, 토큰 만료 로그인 자동 이동, 엑셀 표 색상 회색 변경, PDF 차트 개선, 평면도 현장 단위 통일
- **v1.4.0** (2026.04.23) — 센서 목록 관리번호 제거(센서명만 표시), 평면도 아이콘 관리번호 연동, 아이콘 개별 수정/삭제 모달, depth별 1차 관리기준 개별 설정(DB 저장·즉시 반영), 1차 상하한 자동계산 제거(직접 입력 방식), 엑셀/PDF 소수점 4자리 확정, QR 센서명 표시, 현장 추가 평면도 업로드 오류 수정
- **v1.4.1** (2026.04.24) — 로그인 테스트 계정 MultiMonitor로 변경, 사이드바 메뉴 구조 개편(모니터링/기타 그룹), 현장 관리 메뉴 위치 변경(대시보드 아래), 센서 상세 패널 드래그 리사이즈, MultiMonitor 마지막 수신·드래그 안내 숨김, 수신 지연 배너 센서명 표시 통일
- **v1.5.0** (2026.05.04~06)
  - WL-02(depth 2) DB 삭제 후 depth 1/3 평균값으로 대체 (엑셀/PDF 포함 전 반영)
  - WL-02 KST 시간대 불일치로 인한 미수신 버그 수정 (toHourKey 함수)
  - 글꼴 맑은 고딕(Malgun Gothic) 전역 적용
  - 대시보드 카카오맵 플레이스홀더 추가
  - 센서 상세 레이아웃 2단+트렌드 구조로 개편 (기존 3단에서 변경)
  - MultiMonitor 권한 강화: 센서정보 4항목만 표시, Polynomial 버튼 숨김, 사이드바 기타 그룹 숨김
  - SensorTrendChart ResizeObserver 동적 크기 적용, 범례 표시 개선
  - 센서 상세 페이지 아이콘 필터링: 현재 센서 ID에 해당하는 아이콘만 표시
  - 현장 상세 페이지(/sites/[id]) 신규: 센서추가/삭제, 아이콘관리, 트렌드, 엑셀/PDF
  - 사이드바 현장 이름 클릭 → /sites/N, 하단 "추가 및 편집" 링크
  - 현장 관리 페이지 헤더 "현장 추가 및 편집"으로 명칭 변경
  - 센서 편집 모달 수식 및 파라미터 설정 전면 개편 (계산식 선택/직접입력/depth별파라미터/초기값/미리보기)
  - 계산식 관리 탭 variables(변수 설명) 컬럼 추가
  - 조회 버튼 추가 (queryCondition state, 클릭 시에만 fetch)
  - 일별 모드 선택 시각 기준 시간 필터링 수정
  - 엑셀/PDF 계측No에 아이콘 라벨(WL-01 등) 우선 표시
  - 센서 정의 탭 설치일 형식 수정 (ISO → 2026. 04. 07.)
  - formula_params 신구조(depth별)/구구조(coeffA) 호환 처리
- **v1.6.0** (2026.05.07~08)
  - **sensors 목록 current_value raw값 표시 버그 수정**: sensors 쿼리에 formula_params 누락 → SELECT에 추가
  - **depth 전환 시 iconLabel 업데이트**: depth 버튼 onClick에 setIconLabel 추가 (엑셀/PDF 계측No 반영)
  - **현장 상세 PDF 계측No 아이콘 라벨 적용**: handlePdfDownload에 iconLabel 적용
  - **현장 상세 보정값 입력 기능 추가**: 80053 전용, depth별 correction_params 저장
  - **globalInitReading에서 보정값 제거**: I(초기값)은 원시 계산값 기준으로 독립 저장
  - **I(초기값) formula_params 전용 저장/표시 시스템 완성**:
    - 자동 모드: openEdit 시 최초 raw_value 자동 조회 (80053 depth별, 일반 단일)
    - 수동 모드: 유저 입력값 유지, 재편집 시 그대로 표시
    - autoInitValues ref로 비동기 타이밍 해결
    - 표시: formula_params.initVal 전용, 계산값 참조 완전 제거
  - **계산식 상수값 표시 전체 센서 확장**: sensorCode === '80053' 조건 → formulaParams 존재 여부로 변경
  - **현장 상세 페이지 UI 전면 개편** (2단계 뷰):
    - 뷰 1 (평면도 전체): 현장 진입 시 평면도 전체 화면, 노드 제어(+추가/-삭제), 센서 아이콘 그룹
    - 뷰 2 (센서 상세): 아이콘 클릭 후 → 좌측 센서 트리(타입별 그룹+토글) + 하단 센서정보, 우측 트렌드/로그
    - "← 도면으로 돌아가기" 버튼
    - 센서 그룹 토글 (collapsedGroups state)
    - pendingViewDetail/pendingDepth ref: 아이콘 클릭 시 sensor 로딩 완료 후 올바른 depth로 detail 뷰 전환
    - 평면도 수정/삭제 버튼 항상 표시 (icons.length > 0 조건)
  - **QR 기능 추가 (현장 상세)**: 센서 관리와 동일한 QRModal 사용
  - **엑셀 개선** (양쪽 파일):
    - 컬럼 폭 수정: `[22, 8, 16, 14, 16, 18]`
    - 초기치 행: globalInitReading 기반 전체 기간 최초값을 allRows 맨 앞에 추가 (조회 기간 무관)
    - isFirst = row.isInitRow || (i===0 && !initRowData)
    - 날짜+시간 포함: 측정일, 초기측정일 모두 toLocaleString 적용
  - **PDF 개선** (양쪽 파일):
    - 관리자/설치위치 행 삭제 (현장명+계측기No, 설치현황+초기측정일 2행만 유지)
    - columnStyles: `{0: 27, 1: 64, 2: 27, 3: 64}` (헤더 폭=그래프 폭 일치)
    - 초기치 행: 엑셀과 동일하게 pdfAllRows 앞에 추가
    - 날짜+시간 포함, dateOnlyKey는 remarks key 전용으로 분리
  - **useRef import 추가** (sensors/page.tsx 빌드 오류 수정)
- **v1.7.0** (2026.05.08~14)
  - **MultiMonitor 보정값 권한 분리**: 보정값 input readOnly 처리, 적용 버튼 숨김
  - **엑셀 보고서 양식 개선**: 5행(관리자/설치위치) 삭제, 값 열 너비 확대 (20→50, 26→56)
  - **today 날짜 UTC→KST 수정**: `toISOString().slice(0,10)` → 로컬 시간 기준 (자정~오전 8:59 전날 표시 버그 수정)
  - **hourly 모드 API 파라미터 시간 명시**: `T00:00:00` / `T23:59:59` 추가 (오후 데이터 미수신 방지)
  - **WL-02 depthLabel 의존성 누락 수정**: depth1/3 fetch useEffect deps에 depthLabel 추가
  - **ESLint react-hooks/exhaustive-deps error 격상**: useEffect 의존성 누락 시 빌드 오류로 감지
  - **Sidebar React key prop 경고 수정**: `<>` → `<React.Fragment key={...}>`
  - **엑셀/PDF 변화량 컬럼 개편**:
    - 일별: '전측정치대비'→'일일 변화량', '초기치대비'→'누적 변화량', ▲▼ 기호 표기
    - 시간별: '전측정치대비' 제거, '초기치대비'→'누적 변화량', ▲▼ 기호 표기
    - PDF 변화량 컬럼 텍스트 색상 적용 (`didParseCell`, 상승 빨강/하강 파랑)
  - **PDF 현장관리 표 너비 통일**: info 테이블 열 너비 140mm→182mm, margin 맞춤
  - **실시간 요약 카드**: 차트 위 드래그 가능 플로팅 카드 추가 (현재값/최댓값/최솟값/기준값/기준값 대비 변화량)
  - **기간 내 최신값 카드 누적 변화량 뱃지** 추가
  - **SensorTrendChart Min/Max 강조 마커** 추가
  - **측정 데이터 로그 컬럼 개편**: 누적 변화량 / 일일 변화량 추가, 계산상태 삭제
  - **기준값 대비 변화량 버그 수정**: globalInitReading null 시 diff=0 반환 → — 표시로 수정
  - **누적 변화량 소수점 4자리 수정** (N.NNNN)
  - **대시보드 카카오맵 실제 연동**: 현장 위치 마커 표시, 마커 클릭 → 현장 상세 이동
  - **대시보드 현장 목록 표 추가**: 총 현장 수, 현장명/위치 컬럼 표시
  - **현장 편집 모달 위도/경도 자동 검색**: 주소 입력 → `/api/geocode` 프록시 → 좌표 자동 입력
