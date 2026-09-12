import { useId, useState } from 'react'
import { calculateLivingCost, calculateStayCost, won } from './livingCost'
import './living-cost.css'

export default function LivingCost({ property }) {
  const [useTransport, setUseTransport] = useState(false)
  const [fare, setFare] = useState('3000')
  const [days, setDays] = useState('30')
  const [months, setMonths] = useState('12')
  const stayHelpId = useId()
  const cost = calculateLivingCost(property, useTransport, fare.trim() === '' ? null : Number(fare), days.trim() === '' ? null : Number(days))
  const unknown = cost.utilities.some(item => typeof item.included !== 'boolean')
  const included = Array.isArray(property.maintenance_included) ? property.maintenance_included : []
  const excluded = Array.isArray(property.maintenance_excluded) ? property.maintenance_excluded : []
  const monthCount = months.trim() === '' ? null : Number(months)
  const validMonths = Number.isSafeInteger(monthCount) && monthCount >= 1
  const stayTotal = calculateStayCost(cost.total, monthCount)
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
          <tr><th scope="row">관리비<small>매물 등록 금액</small></th><td>{included.length ? `포함: ${included.join(', ')}` : '포함 항목 없음'}</td><td>{won(cost.maintenance)}</td></tr>
          {cost.utilities.map(item => <tr key={item.key}>
            <th scope="row">{item.label}<small>{item.included === true ? '추가 비용 없음' : item.usage === null ? '전용면적 확인 필요' : `${item.basis} · ${Number(item.usage.toFixed(1))}${item.unit}`}</small></th>
            <td className={item.included === true ? 'living-included' : ''}>{item.included === true ? '관리비 포함' : item.included === false ? '별도 부과' : '포함 미확인'}</td>
            <td className={item.included === true ? 'living-included' : ''}>{won(item.cost)}</td>
          </tr>)}
        </tbody>
      </table>
      {property.maintenance_note && <div className="living-management-detail">
        <strong>관리비 안내</strong>
        <p>{property.maintenance_note}</p>
        {included.length > 0 && <p><b>포함</b> {included.join(', ')}</p>}
        {excluded.length > 0 && <p><b>미포함·별도 부과</b> {excluded.join(', ')}</p>}
      </div>}
      <div className="living-transport">
        <div><label><input type="checkbox" checked={useTransport} onChange={e => setUseTransport(e.target.checked)} />교통비 추가 <small>선택</small></label><strong>{won(cost.transport)}</strong></div>
        <label className="living-fare">하루 1회 왕복비용 <input type="number" min="0" step="100" value={fare} disabled={!useTransport} onChange={e => setFare(e.target.value)} /> 원</label>
        <label className="living-fare">월 이용 일수 <input type="number" min="1" max="31" step="1" value={days} disabled={!useTransport} onChange={e => setDays(e.target.value)} /> 일</label>
        <small>{!useTransport ? '교통비가 총 비용에서 제외됩니다.' : cost.transport === null ? '왕복비용과 이용 일수(1~31일)를 확인해 주세요.' : '교통비가 총 비용에 포함됩니다.'}</small>
      </div>
      <div className="living-total" aria-live="polite" aria-atomic="true"><div><strong>한 달 예상 총 비용</strong><small>월세 포함 · 교통비 {useTransport ? '포함' : '제외'}</small></div><output>{won(cost.total)}</output></div>
      <section className="living-stay" aria-label="거주 기간별 예상 비용">
        <div className="living-stay-entry">
          <h4>얼마나 거주할 예정인가요?</h4>
          <label>거주 기간 <input type="number" min="1" step="1" value={months} onChange={event => setMonths(event.target.value)} aria-invalid={!validMonths} aria-describedby={stayHelpId} /> 개월</label>
        </div>
        <div className="living-stay-result" aria-live="polite" aria-atomic="true">
          <div><strong>{validMonths ? `${monthCount.toLocaleString('ko-KR')}개월 예상 총 비용` : '거주 기간 예상 총 비용'}</strong>
            <small>{validMonths && cost.total !== null ? `월 ${won(cost.total)} × ${monthCount.toLocaleString('ko-KR')}개월` : '월 비용과 거주 기간을 확인해 주세요.'}</small>
          </div>
          <output>{won(stayTotal)}</output>
        </div>
        <small id={stayHelpId}>{!validMonths ? '1개월 이상의 유효한 정수를 입력해 주세요.' : cost.total !== null && stayTotal === null ? '계산 가능한 범위의 거주 기간을 입력해 주세요.' : '거주 기간을 개월 단위로 입력해 주세요.'}</small>
      </section>
      <p className="living-note">현재 한 달 예상 비용이 매월 동일하다고 가정한 금액입니다. 보증금·중개보수·이사비 등 일회성 비용은 제외하며, 실제 비용은 계절과 사용량에 따라 달라질 수 있습니다.</p>
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
