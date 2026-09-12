// Illustrative monthly usage and rates, not verified averages or official tariffs.
// utility_inclusions: { electricity, gas, heating, hotWater, water }: true/false.
// Missing values mean unknown, never implicitly included or confirmed excluded.
export const UTILITY_ITEMS = [
  { key: 'electricity', label: '전기요금', usage: a => 100 + a * 2, rate: 200, unit: 'kWh', basis: '1인 기본 + 전용면적' },
  { key: 'gas', label: '가스요금', usage: () => 3, rate: 1000, unit: '㎥', basis: '1인 가구 · 취사용' },
  { key: 'heating', label: '난방요금', usage: a => a * 3, rate: 100, unit: 'kWh', basis: '전용면적 기준' },
  { key: 'hotWater', label: '온수', usage: () => 2, rate: 4000, unit: '㎥', basis: '1인 가구' },
  { key: 'water', label: '수도세', usage: () => 5, rate: 1000, unit: '㎥', basis: '1인 가구' },
  { key: 'internet', label: '인터넷', usage: () => 1, rate: 20000, unit: '회선', basis: '월 정액 예시' },
]
const validNumber = value => typeof value === 'number' && Number.isFinite(value) && value >= 0
export const won = value => value === null ? '확인 필요' : `${value.toLocaleString('ko-KR')}원`
export function calculateLivingCost(property, useTransport = false, roundTripFare = 3000, transportDays = 30) {
  const area = validNumber(property.area) && property.area > 0 ? property.area : null
  const rent = property.transaction_type === '전세' ? 0 : validNumber(property.rent) ? Math.round(property.rent * 10000) : null
  const maintenance = validNumber(property.maintenance) ? Math.round(property.maintenance * 10000) : null
  const utilities = UTILITY_ITEMS.map(item => {
    const included = property.utility_inclusions?.[item.key]
    const needsArea = item.key === 'electricity' || item.key === 'heating'
    const usage = needsArea && area === null ? null : item.usage(area)
    const cost = included === true ? 0 : usage === null ? null : Math.round(usage * item.rate / 100) * 100
    return { ...item, included, usage, cost }
  })
  const validDays = Number.isInteger(transportDays) && transportDays >= 1 && transportDays <= 31
  const transport = !useTransport ? 0 : validNumber(roundTripFare) && validDays ? Math.round(roundTripFare * transportDays) : null
  const amounts = [rent, maintenance, ...utilities.map(item => item.cost), transport]
  return { area, rent, maintenance, utilities, transport, total: amounts.some(value => value === null) ? null : amounts.reduce((a, b) => a + b, 0) }
}
