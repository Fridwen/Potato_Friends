import { useState } from 'react'
import { calculateLivingCost, won } from './livingCost'
import './living-cost.css'

export default function LivingCost({ property }) {
  const [useTransport, setUseTransport] = useState(false)
  const [fare, setFare] = useState('3000')
  const cost = calculateLivingCost(property, useTransport, fare.trim() === '' ? null : Number(fare))
  const unknown = cost.utilities.some(item => typeof item.included !== 'boolean')
  return (
    <section className="living-cost" aria-label={`${property.name} 실거주비용`}>
      <div className="living-heading"><h3>실거주비용</h3><span>예시 견적</span></div>
      <p className="living-subtitle">월세부터 생활요금까지, 한 달에 필요한 비용</p>
      <div className="living-basis">전용면적 {cost.area ?? '미확인'}㎡ · 1인 가구 · 30일 기준</div>
      <table>
        <caption className="living-sr-only">항목별 월 비용과 관리비 포함 여부</caption>
        <thead><tr><th scope="col">항목 / 산정 기준</th><th scope="col">매물 정보</th><th scope="col">월 비용</th></tr></thead>
        <tbody>
          <tr><th scope="row">월세<small>{property.transaction_type === '전세' ? '전세 · 월세 없음' : '매물 등록 금액'}</small></th><td>고정 비용</td><td>{won(cost.rent)}</td></tr>
          <tr><th scope="row">관리비<small>매물 등록 금액</small></th><td>고정 비용</td><td>{won(cost.maintenance)}</td></tr>
          {cost.utilities.map(item => <tr key={item.key}>
            <th scope="row">{item.label}<small>{item.included === true ? '추가 비용 없음' : item.usage === null ? '전용면적 확인 필요' : `${item.basis} · ${Number(item.usage.toFixed(1))}${item.unit}`}</small></th>
            <td className={item.included === true ? 'living-included' : ''}>{item.included === true ? '관리비 포함' : item.included === false ? '별도 부과' : '포함 미확인'}</td>
            <td className={item.included === true ? 'living-included' : ''}>{won(item.cost)}</td>
          </tr>)}
        </tbody>
      </table>
      <div className="living-transport">
        <div><label><input type="checkbox" checked={useTransport} onChange={e => setUseTransport(e.target.checked)} />교통비 추가 <small>선택</small></label><strong>{won(cost.transport)}</strong></div>
        <label className="living-fare">하루 1회 왕복비용 <input type="number" min="0" step="100" value={fare} disabled={!useTransport} onChange={e => setFare(e.target.value)} /> 원 × 30일</label>
        <small>{useTransport ? '매일 왕복 1회, 한 달 30회 비용을 더합니다.' : '선택하지 않아 총 비용에서 제외됩니다.'}</small>
      </div>
      <div className="living-total" aria-live="polite" aria-atomic="true"><div><strong>한 달 예상 총 비용</strong><small>월세 포함 · 교통비 {useTransport ? '포함' : '제외'}</small></div><output>{won(cost.total)}</output></div>
      <details><summary>어떻게 계산했나요?</summary>
        <p>공과금은 검증된 평균이나 공식 요금이 아닌 예시 사용량·단가로 계산하고, 100원 단위로 반올림합니다.</p>
        <ul><li>전기: (100 + 전용면적 × 2)kWh × 200원</li><li>취사용 가스: 3㎥ × 1,000원</li><li>난방: 전용면적 × 3kWh × 100원</li><li>온수: 2㎥ × 4,000원</li><li>수도: 5㎥ × 1,000원</li><li>인터넷: 월 20,000원</li></ul>
        <p>관리비 포함으로 등록된 항목은 자동으로 0원 처리합니다. 가스는 취사용만 가정하며, 실제 난방·온수·수도 청구 범위에 맞춘 중복 검증과 계절·지역 요금 반영은 아직 적용되지 않았습니다.</p>
        {property.transaction_type === '전세' && <p>전세 보증금과 대출 이자는 이 합계에 포함되지 않습니다.</p>}
      </details>
      <p className="living-note">공과금 사용량·단가는 예시이며 실제 청구액과 다릅니다.{unknown && ' 관리비 포함 여부가 없는 항목은 별도 비용으로 가정했습니다.'}</p>
    </section>
  )
}
