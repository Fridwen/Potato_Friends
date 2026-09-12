import { useState } from 'react'

const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:8000').replace(/\/$/, '')

const OPTION_LIST = ['에어컨', '세탁기', '냉장고', '엘리베이터', '주차']

function NumberField({ label, value, onChange, unit, min = 0, step = 1 }) {
  return (
    <label className="field">
      <span>{label}</span>
      <div className="input-wrap">
        <input
          type="number"
          min={min}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
        />
        <b>{unit}</b>
      </div>
    </label>
  )
}

function WeightSlider({ label, value, onChange }) {
  return (
    <label className="weight-row">
      <span>{label}</span>
      <input
        type="range"
        min="0"
        max="100"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      <strong>{value}</strong>
    </label>
  )
}


function PropertyImageCarousel({ property }) {
  const [current, setCurrent] = useState(0)
  const images = property.images?.length ? property.images : []

  if (!images.length) {
    return <div className="image-placeholder">사진 없음</div>
  }

  const prevImage = () => {
    setCurrent((prev) => (prev - 1 + images.length) % images.length)
  }

  const nextImage = () => {
    setCurrent((prev) => (prev + 1) % images.length)
  }

  return (
    <>
      <img
        src={images[current]}
        alt={`${property.name} 사진 ${current + 1}`}
      />

      {images.length > 1 && (
        <>
          <button
            type="button"
            className="image-nav image-nav-left"
            onClick={prevImage}
            aria-label="이전 사진"
          >
            ‹
          </button>

          <button
            type="button"
            className="image-nav image-nav-right"
            onClick={nextImage}
            aria-label="다음 사진"
          >
            ›
          </button>

          <div className="image-dots">
            {images.map((_, index) => (
              <button
                type="button"
                key={index}
                className={index === current ? 'image-dot active' : 'image-dot'}
                onClick={() => setCurrent(index)}
                aria-label={`${index + 1}번째 사진 보기`}
              />
            ))}
          </div>

          <span className="image-count">
            {current + 1} / {images.length}
          </span>
        </>
      )}
    </>
  )
}

function App() {
  const [form, setForm] = useState({
    max_deposit: 1000,
    max_rent: 60,
    max_maintenance: 10,
    min_area: 18,
    max_walk_time: 15,
    required_options: ['에어컨', '세탁기'],
    price_weight: 50,
    distance_weight: 30,
    area_weight: 20,
  })

  const [results, setResults] = useState([])
  const [searched, setSearched] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const update = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const toggleOption = (option) => {
    setForm((prev) => ({
      ...prev,
      required_options: prev.required_options.includes(option)
        ? prev.required_options.filter((item) => item !== option)
        : [...prev.required_options, option],
    }))
  }

  const submit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const response = await fetch(`${API_URL}/api/recommend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })

      if (!response.ok) throw new Error('추천 요청에 실패했습니다.')

      const data = await response.json()
      setResults(data.results)
      setSearched(true)
    } catch (err) {
      setError('백엔드에 연결할 수 없습니다.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="page">
      <header className="hero">
        <span className="badge">고려대학교 자취방 비교</span>
        <h1>나한테 맞는 방을<br />조건부터 골라보세요.</h1>
        <p>
          월세만 보지 않고 가격·거리·면적을 함께 비교해
          나에게 맞는 매물을 추천합니다.
        </p>
      </header>

      <form className="filter-card" onSubmit={submit}>
        <section>
          <div className="section-title">
            <span>1</span>
            <div>
              <h2>예산과 기본 조건</h2>
              <p>원하는 조건을 먼저 입력해 주세요.</p>
            </div>
          </div>

          <div className="field-grid">
            <NumberField label="보증금" value={form.max_deposit} onChange={(v) => update('max_deposit', v)} unit="만원 이하" />
            <NumberField label="월세" value={form.max_rent} onChange={(v) => update('max_rent', v)} unit="만원 이하" />
            <NumberField label="관리비" value={form.max_maintenance} onChange={(v) => update('max_maintenance', v)} unit="만원 이하" />
            <NumberField label="최소 면적" value={form.min_area} onChange={(v) => update('min_area', v)} unit="㎡ 이상" step="0.1" />
            <NumberField label="학교까지" value={form.max_walk_time} onChange={(v) => update('max_walk_time', v)} unit="분 이내" min="1" />
          </div>
        </section>

        <section>
          <div className="section-title">
            <span>2</span>
            <div>
              <h2>필수 옵션</h2>
              <p>반드시 있었으면 하는 옵션만 선택하세요.</p>
            </div>
          </div>

          <div className="option-list">
            {OPTION_LIST.map((option) => (
              <button
                type="button"
                key={option}
                className={form.required_options.includes(option) ? 'option active' : 'option'}
                onClick={() => toggleOption(option)}
              >
                {option}
              </button>
            ))}
          </div>
        </section>

        <section>
          <div className="section-title">
            <span>3</span>
            <div>
              <h2>무엇이 더 중요한가요?</h2>
              <p>슬라이더에 따라 추천 순위가 달라집니다.</p>
            </div>
          </div>

          <div className="weights">
            <WeightSlider label="가격" value={form.price_weight} onChange={(v) => update('price_weight', v)} />
            <WeightSlider label="거리" value={form.distance_weight} onChange={(v) => update('distance_weight', v)} />
            <WeightSlider label="넓이" value={form.area_weight} onChange={(v) => update('area_weight', v)} />
          </div>
        </section>

        <button className="submit-button" disabled={loading}>
          {loading ? '추천 계산 중...' : '나에게 맞는 방 찾기'}
        </button>

        {error && <p className="error">{error}</p>}
      </form>

      {searched && (
        <section className="results-section">
          <div className="results-heading">
            <div>
              <span className="badge">추천 결과</span>
              <h2>{results.length ? `${results.length}개의 매물을 찾았어요.` : '조건에 맞는 매물이 없어요.'}</h2>
            </div>
            <p>추천 점수가 높은 순서입니다.</p>
          </div>

          <div className="result-grid">
            {results.map((property, index) => (
              <article className="property-card" key={property.id}>
                <div className="image-box">
                  <PropertyImageCarousel property={property} />
                  <span className="rank">{index + 1}위</span>
                  <span className="score">{property.score}점</span>
                </div>

                <div className="property-body">
                  <div className="property-head">
                    <div>
                      <small>{property.location}</small>
                      <h3>{property.name}</h3>
                    </div>
                    <strong>월 {property.monthly_cost}만</strong>
                  </div>

                  <div className="facts">
                    <span>보증금 {property.deposit}만</span>
                    <span>월세 {property.rent}만</span>
                    <span>관리비 {property.maintenance}만</span>
                    <span>{property.area}㎡</span>
                    <span>학교 {property.walk_time}분</span>
                  </div>

                  <ul className="reasons">
                    {property.reasons.map((reason) => (
                      <li key={reason}>{reason}</li>
                    ))}
                  </ul>

                  <div className="tags">
                    {property.options.map((option) => (
                      <span key={option}>{option}</span>
                    ))}
                  </div>

                  <button className="compare-button">비교함에 담기</button>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

export default App
