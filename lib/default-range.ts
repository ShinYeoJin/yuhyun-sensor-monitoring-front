// 포트폴리오 데모 DB에는 2026-09-21까지 만들어 둔 샘플 데이터가 있어,
// 센서 상세를 처음 열었을 때 바로 보이도록 기본 조회 기간을 고정합니다.
// 날짜 입력과 기간 선택은 그대로 동작합니다.
const DEMO_RANGE_FROM = '2026-09-01'
const DEMO_RANGE_DAYS = 7

const toLocalDate = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

export function getDefaultRange(): { from: string; to: string } {
  const from = new Date(DEMO_RANGE_FROM + 'T00:00:00')
  const to = new Date(from)
  to.setDate(to.getDate() + (DEMO_RANGE_DAYS - 1))
  return { from: toLocalDate(from), to: toLocalDate(to) }
}
