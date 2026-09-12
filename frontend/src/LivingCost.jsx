import { useState } from 'react'
import { calculateLivingCost, won } from './livingCost'
import './living-cost.css'

export default function LivingCost({ property }) {
  const [useTransport, setUseTransport] = useState(false)
  const [fare, setFare] = useState('3000')
  const [days, setDays] = useState('30')
  const cost = calculateLivingCost(property, useTransport, fare.trim() === '' ? null : Number(fare), days.trim() === '' ? null : Number(days))
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
        <label className="living-fare">하루 1회 왕복비용 <input type="number" min="0" step="100" value={fare} disabled={!useTransport} onChange={e => setFare(e.target.value)} /> 원</label>
        <label className="living-fare">월 이용 일수 <input type="number" min="1" max="31" step="1" value={days} disabled={!useTransport} onChange={e => setDays(e.target.value)} /> 일</label>
        <small>{!useTransport ? '교통비가 총 비용에서 제외됩니다.' : cost.transport === null ? '왕복비용과 이용 일수(1~31일)를 확인해 주세요.' : '교통비가 총 비용에 포함됩니다.'}</small>
      </div>
      <div className="living-total" aria-live="polite" aria-atomic="true"><div><strong>한 달 예상 총 비용</strong><small>월세 포함 · 교통비 {useTransport ? '포함' : '제외'}</small></div><output>{won(cost.total)}</output></div>
      <details><summary>항목별 계산 방법 자세히 보기</summary>
        <p>공과금은 <strong>예시 사용량과 단가를 기준으로 계산한 예상 비용</strong>입니다. 실제 평균 사용량이나 공식 요금을 반영한 금액은 아니며, 100원 단위로 반올림해 표시합니다.</p>
        <ul>
          <li><strong>전기요금:</strong> 1인 기본 사용량에 전용면적에 따른 사용량을 더해 계산합니다.<br />(100 + 전용면적 × 2)kWh × 200원</li>
          <li><strong>가스요금:</strong> 1인 가구의 취사용 가스를 기준으로 계산합니다.<br />3㎥ × 1,000원</li>
          <li><strong>난방요금:</strong> 전용면적에 따라 계산합니다.<br />전용면적 × 3kWh × 100원</li>
          <li><strong>온수요금:</strong> 1인 가구의 온수 사용량을 기준으로 계산합니다.<br />2㎥ × 4,000원</li>
          <li><strong>수도요금:</strong> 1인 가구의 수도 사용량을 기준으로 계산합니다.<br />5㎥ × 1,000원</li>
          <li><strong>인터넷:</strong> 월 20,000원으로 가정합니다.</li>
        </ul>
        <p><strong>관리비에 포함된 항목은 추가 비용 없이 0원으로 표시합니다.</strong> 가스요금은 취사용만 계산하며, 난방·온수·수도 요금의 중복 여부와 계절·지역별 요금 차이는 아직 반영하지 않았습니다. 실제 청구 금액은 달라질 수 있습니다.</p>
        {property.transaction_type === '전세' && <p>전세 보증금과 대출 이자는 이 합계에 포함되지 않습니다.</p>}
      </details>
      <p className="living-note">공과금은 전용면적과 1인 가구의 사용량을 가정한 예시 기준으로 계산합니다. 실제 사용량과 요금에 따라 청구액은 달라질 수 있습니다.{unknown && ' 관리비 포함 여부가 없는 항목은 별도 비용으로 가정했습니다.'}</p>
    </section>
  )
}
