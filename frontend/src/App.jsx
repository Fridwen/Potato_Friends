import { useEffect, useState } from 'react'
import { MapContainer, Marker, TileLayer, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import SpaceModal from './space/SpaceModal'

const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:8000').replace(/\/$/, '')

const OPTION_LIST = ['풀옵션', '에어컨', '세탁기', '냉장고', '엘리베이터', '주차']
const TRANSACTION_TYPES = ['전체', '월세', '전세']

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

function RangeField({ label, minValue, maxValue, onMinChange, onMaxChange, minUnit, maxUnit, step = 1 }) {
  return (
    <div className="field">
      <span>{label}</span>
      <div className="range-inputs">
        <div className="input-wrap">
          <input type="number" min="0" step={step} value={minValue} onChange={(e) => onMinChange(Number(e.target.value))} />
          <b>{minUnit}</b>
        </div>
        <span className="range-separator">~</span>
        <div className="input-wrap">
          <input type="number" min="0" step={step} value={maxValue} onChange={(e) => onMaxChange(Number(e.target.value))} />
          <b>{maxUnit}</b>
        </div>
      </div>
    </div>
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

function EstimatedFloorPlan({ property }) {
  const isTwoRoom = property.rooms >= 2
  const isSeparated = property.room_type === '분리형'

  return (
    <svg className="floor-plan" viewBox="0 0 640 420" role="img" aria-label={`${property.name} 추정 평면도`}>
      <rect className="plan-wall" x="20" y="20" width="600" height="380" rx="4" />
      <rect className="plan-bath" x="35" y="35" width="155" height="125" />
      <text x="112" y="102">욕실</text>
      <path className="plan-door" d="M190 120 A40 40 0 0 1 150 160" />
      <rect className="plan-kitchen" x="35" y="175" width={isSeparated ? 200 : 155} height="105" />
      <text x={isSeparated ? 135 : 112} y="233">주방</text>

      {isTwoRoom ? (
        <>
          <rect className="plan-room" x="255" y="35" width="350" height="165" />
          <text x="430" y="123">방 1</text>
          <rect className="plan-room" x="255" y="215" width="350" height="170" />
          <text x="430" y="306">방 2</text>
          <path className="plan-door" d="M255 160 A40 40 0 0 1 295 200" />
          <path className="plan-door" d="M255 255 A40 40 0 0 0 295 215" />
        </>
      ) : (
        <>
          <rect className="plan-room" x={isSeparated ? 255 : 205} y="35" width={isSeparated ? 350 : 400} height="350" />
          <text x="430" y="210">생활 공간</text>
          {isSeparated && <path className="plan-door" d="M255 245 A40 40 0 0 1 295 285" />}
        </>
      )}

      <line className="plan-window" x1="390" y1="20" x2="535" y2="20" />
      <text className="plan-window-label" x="462" y="48">창문</text>
      <path className="plan-entry" d="M35 350 L35 400 M35 350 A50 50 0 0 1 85 400" />
      <text className="plan-entry-label" x="92" y="380">현관</text>
    </svg>
  )
}

function FloorPlanModal({ property, onClose }) {
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section className="floor-plan-modal" role="dialog" aria-modal="true" aria-labelledby={`floor-plan-title-${property.id}`} onMouseDown={(e) => e.stopPropagation()}>
        <button type="button" className="modal-close" onClick={onClose} aria-label="평면도 닫기">×</button>
        <span className="ai-label">AI 추정 평면도</span>
        <h2 id={`floor-plan-title-${property.id}`}>{property.name}</h2>
        <p className="plan-summary">
          전용 {property.area}㎡ · 방 {property.rooms ?? 1}개 · 욕실 {property.bathrooms ?? 1}개 · {property.room_type ?? '구조 미상'}
        </p>
        <EstimatedFloorPlan property={property} />
        <p className="plan-notice">사진 및 매물 정보를 바탕으로 구성한 참고용 추정도입니다. 실제 구조와 치수는 다를 수 있습니다.</p>
      </section>
    </div>
  )
}

const propertyMarker = L.divIcon({
  className: 'property-marker',
  html: '<span>⌂</span>',
  iconSize: [38, 38],
  iconAnchor: [19, 38],
  popupAnchor: [0, -34],
})

const selectedPropertyMarker = L.divIcon({
  className: 'property-marker property-marker-selected',
  html: '<span>⌂</span>',
  iconSize: [46, 46],
  iconAnchor: [23, 46],
  popupAnchor: [0, -40],
})

function FitPropertyBounds({ properties }) {
  const map = useMap()

  useEffect(() => {
    const points = properties
      .filter((property) => property.latitude && property.longitude)
      .map((property) => [property.latitude, property.longitude])
    if (points.length) map.fitBounds(points, { padding: [55, 55], maxZoom: 17 })
  }, [map, properties])

  return null
}

function FocusSelectedProperty({ position }) {
  const map = useMap()

  useEffect(() => {
    if (position) map.flyTo(position, Math.max(map.getZoom(), 17), { duration: 0.65 })
  }, [map, position])

  return null
}

function PropertyMapExplorer({ properties, selectedId, onSelect, compareItems, onToggleCompare }) {
  const [spaceProperty, setSpaceProperty] = useState(null)
  const markerPositions = properties.map((property, index) => {
    const earlierAtSameAddress = properties
      .slice(0, index)
      .filter((item) => item.latitude === property.latitude && item.longitude === property.longitude)
      .length
    const offset = earlierAtSameAddress * 0.000035
    return [property.latitude + offset, property.longitude + offset]
  })

  const selectedIndex = Math.max(0, properties.findIndex((property) => property.id === selectedId))
  const selectedPosition = markerPositions[selectedIndex]

  const selectAt = (index) => {
    const property = properties[index]
    if (!property) return
    onSelect(property.id)
    document.getElementById(`map-property-${property.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
  }

  const syncMapToSlider = (event) => {
    const slider = event.currentTarget
    const center = slider.scrollLeft + slider.clientWidth / 2
    let nearestIndex = 0
    let nearestDistance = Infinity
    Array.from(slider.children).forEach((card, index) => {
      const cardCenter = card.offsetLeft + card.clientWidth / 2
      const distance = Math.abs(center - cardCenter)
      if (distance < nearestDistance) {
        nearestDistance = distance
        nearestIndex = index
      }
    })
    const nearestProperty = properties[nearestIndex]
    if (nearestProperty && nearestProperty.id !== selectedId) onSelect(nearestProperty.id)
  }

  return (
    <div className="map-explorer">
      <MapContainer className="property-map" center={[37.5861, 127.0304]} zoom={16} scrollWheelZoom>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitPropertyBounds properties={properties} />
        <FocusSelectedProperty position={selectedPosition} />
        {properties.map((property, index) => (
          <Marker
            key={property.id}
            position={markerPositions[index]}
            icon={property.id === selectedId ? selectedPropertyMarker : propertyMarker}
            eventHandlers={{ click: () => selectAt(index) }}
          />
        ))}
      </MapContainer>

      <button type="button" className="map-slide-arrow previous" onClick={() => selectAt((selectedIndex - 1 + properties.length) % properties.length)} aria-label="이전 매물">‹</button>
      <div className="map-property-slider" aria-label="지도 매물 목록" onScroll={syncMapToSlider}>
        {properties.map((property, index) => {
          const monthlyCost = property.monthly_cost ?? property.rent + property.maintenance
          const selected = property.id === selectedId
          const inCompare = compareItems.some((item) => item.id === property.id)
          return (
            <article
              id={`map-property-${property.id}`}
              key={property.id}
              className={selected ? 'map-property-card selected' : 'map-property-card'}
              onClick={() => selectAt(index)}
            >
              <img src={property.images?.[0]} alt={`${property.name} 대표 사진`} />
              <div>
                <span className={`transaction-type ${property.transaction_type === '전세' ? 'jeonse' : 'monthly'}`}>{property.transaction_type}</span>
                <h3>{property.name}</h3>
                <strong>{property.transaction_type === '전세' ? `전세 ${property.deposit}만` : `${property.deposit}/${property.rent}만 · 월 총 ${monthlyCost}만`}</strong>
                <p>{property.area}㎡ · 학교 {property.walk_time}분 · {property.room_type}</p>
                <small>{property.address}</small>
                <button
                  type="button"
                  className={inCompare ? 'slider-compare selected' : 'slider-compare'}
                  onClick={(event) => { event.stopPropagation(); onToggleCompare(property) }}
                >
                  {inCompare ? '비교함에서 빼기' : '비교함에 담기'}
                </button>
                <button
                  type="button"
                  className="slider-space-button"
                  disabled={property.id !== 1}
                  onClick={(event) => { event.stopPropagation(); if (property.id === 1) setSpaceProperty(property) }}
                >
                  {property.id === 1 ? '평면도 · 3D 보기' : '3D 구현 예정'}
                </button>
              </div>
            </article>
          )
        })}
      </div>
      <button type="button" className="map-slide-arrow next" onClick={() => selectAt((selectedIndex + 1) % properties.length)} aria-label="다음 매물">›</button>
      <span className="map-slider-count">{selectedIndex + 1} / {properties.length}</span>
      {spaceProperty && <SpaceModal property={spaceProperty} onClose={() => setSpaceProperty(null)} />}
    </div>
  )
}

function CompareModal({ properties, onClose, onRemove }) {
  const rows = [
    { label: '거래 유형', display: (item) => item.transaction_type },
    { label: '보증금', hint: '낮을수록 유리', display: (item) => `${item.deposit}만원`, score: (item) => item.deposit, better: 'low' },
    { label: '월세', hint: '낮을수록 유리', display: (item) => item.transaction_type === '전세' ? '-' : `${item.rent}만원`, score: (item) => item.transaction_type === '전세' ? null : item.rent, better: 'low' },
    { label: '관리비', hint: '낮을수록 유리', display: (item) => `${item.maintenance}만원`, score: (item) => item.maintenance, better: 'low' },
    { label: '월세 + 관리비', hint: '월 고정 부담 · 낮을수록 유리', display: (item) => `${item.rent + item.maintenance}만원`, score: (item) => item.rent + item.maintenance, better: 'low' },
    { label: '전용면적', hint: '넓을수록 유리', display: (item) => `${item.area}㎡`, score: (item) => item.area, better: 'high' },
    { label: '학교까지', hint: '가까울수록 유리', display: (item) => `${item.walk_time}분`, score: (item) => item.walk_time, better: 'low' },
    { label: '방 구조', display: (item) => `${item.room_type ?? '-'} · 방 ${item.rooms ?? 1}개` },
    { label: '주차', display: (item) => item.parking ?? '-' },
    { label: '방향', display: (item) => item.direction ?? '-' },
    { label: '옵션', display: (item) => item.options.length ? item.options.join(', ') : '-' },
  ]

  const cellGrade = (row, item) => {
    if (!row.score) return ''
    const value = row.score(item)
    if (value === null) return ''
    const values = [...new Set(properties.map(row.score).filter((number) => number !== null))]
      .sort((a, b) => row.better === 'low' ? a - b : b - a)
    if (values.length < 2) return 'same'
    const rank = values.indexOf(value)
    if (rank === 0) return 'best'
    if (rank === values.length - 1) return 'worst'
    return 'middle'
  }

  const gradeLabel = { best: '유리', middle: '중간', worst: '불리', same: '동일' }

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section className="compare-modal" role="dialog" aria-modal="true" aria-labelledby="compare-title" onMouseDown={(e) => e.stopPropagation()}>
        <button type="button" className="modal-close" onClick={onClose} aria-label="비교표 닫기">×</button>
        <span className="badge">매물 비교</span>
        <h2 id="compare-title">어떤 방이 더 잘 맞는지 비교해보세요.</h2>
        <div className="compare-legend">
          <span className="best">유리</span>
          <span className="middle">중간</span>
          <span className="worst">불리</span>
        </div>
        <div className="compare-table-wrap">
          <table className="compare-table">
            <thead>
              <tr>
                <th>항목</th>
                {properties.map((item) => (
                  <th key={item.id}>
                    {item.images?.[0] && <img src={item.images[0]} alt="" />}
                    <strong>{item.name}</strong>
                    <button type="button" onClick={() => onRemove(item.id)}>빼기</button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.label}>
                  <th>
                    {row.label}
                    {row.hint && <small>{row.hint}</small>}
                  </th>
                  {properties.map((item) => {
                    const grade = cellGrade(row, item)
                    return (
                      <td key={item.id} className={grade ? `comparison-${grade}` : ''}>
                        <strong>{row.display(item)}</strong>
                        {grade && <em>{gradeLabel[grade]}</em>}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}

function PropertyCard({ property, index, recommended = false, selected = false, onToggleCompare }) {
  const monthlyCost = property.monthly_cost ?? property.rent + property.maintenance
  const [showSpace, setShowSpace] = useState(false)

  return (
    <article className="property-card">
      <div className="image-box">
        <PropertyImageCarousel property={property} />
        {recommended && <span className="rank">{index + 1}위</span>}
        {recommended && <span className="score">{property.score}점</span>}
      </div>

      <div className="property-body">
        <div className="property-head">
          <div>
            <small>
              <span className={`transaction-type ${property.transaction_type === '전세' ? 'jeonse' : 'monthly'}`}>
                {property.transaction_type}
              </span>
              {property.location}
            </small>
            <h3>{property.name}</h3>
          </div>
          <strong>
            {property.transaction_type === '전세'
              ? `전세 ${property.deposit}만`
              : `월 ${monthlyCost}만`}
          </strong>
        </div>

        <div className="facts">
          <span>보증금 {property.deposit}만</span>
          {property.transaction_type === '월세' && <span>월세 {property.rent}만</span>}
          <span>관리비 {property.maintenance}만</span>
          <span>{property.area}㎡</span>
          <span>학교 {property.walk_time}분</span>
        </div>

        {property.description && <p className="property-description">{property.description}</p>}

        {recommended && property.reasons?.length > 0 && (
          <ul className="reasons">
            {property.reasons.map((reason) => <li key={reason}>{reason}</li>)}
          </ul>
        )}

        <div className="tags">
          {property.options.map((option) => <span key={option}>{option}</span>)}
        </div>

        <div className="property-actions">
          <button type="button" className="floor-plan-button" disabled={property.id !== 1} onClick={() => property.id === 1 && setShowSpace(true)}>
            {property.id === 1 ? '평면도 · 3D 보기' : '3D 구현 예정'}
          </button>
          <button
            type="button"
            className={selected ? 'compare-button selected' : 'compare-button'}
            onClick={() => onToggleCompare(property)}
          >
            {selected ? '비교함에서 빼기' : '비교함에 담기'}
          </button>
        </div>
      </div>
      {showSpace && <SpaceModal property={property} onClose={() => setShowSpace(false)} />}
    </article>
  )
}

function App() {
  const [form, setForm] = useState({
    transaction_type: '월세',
    min_deposit: 0,
    max_deposit: 1000,
    min_rent: 0,
    max_rent: 60,
    max_maintenance: 10,
    min_area: 18,
    max_area: 40,
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
  const [activeTab, setActiveTab] = useState('recommend')
  const [allProperties, setAllProperties] = useState([])
  const [allLoading, setAllLoading] = useState(false)
  const [allError, setAllError] = useState('')
  const [compareItems, setCompareItems] = useState([])
  const [showCompare, setShowCompare] = useState(false)
  const [compareMessage, setCompareMessage] = useState('')
  const [selectedMapPropertyId, setSelectedMapPropertyId] = useState(null)

  useEffect(() => {
    if (activeTab !== 'explore' || allProperties.length) return

    const loadAllProperties = async () => {
      setAllLoading(true)
      setAllError('')
      try {
        const response = await fetch(`${API_URL}/api/properties`)
        if (!response.ok) throw new Error('전체 매물 요청에 실패했습니다.')
        setAllProperties(await response.json())
      } catch (err) {
        setAllError('전체 매물을 불러올 수 없습니다.')
      } finally {
        setAllLoading(false)
      }
    }

    loadAllProperties()
  }, [activeTab, allProperties.length])

  useEffect(() => {
    if (!selectedMapPropertyId && allProperties.length) setSelectedMapPropertyId(allProperties[0].id)
  }, [allProperties, selectedMapPropertyId])

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

  const toggleCompare = (property) => {
    setCompareItems((current) => {
      if (current.some((item) => item.id === property.id)) {
        setCompareMessage('')
        return current.filter((item) => item.id !== property.id)
      }
      if (current.length >= 3) {
        setCompareMessage('비교는 최대 3개까지 가능합니다.')
        return current
      }
      setCompareMessage('')
      return [...current, property]
    })
  }

  const removeCompareItem = (id) => {
    setCompareItems((current) => current.filter((item) => item.id !== id))
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
        <span className="badge">자취방 한눈에 비교하기 🔍</span>
        <h1>나한테 맞는 방을<br />조건부터 골라보세요.</h1>
        <p>
          월세만 보지 않고 가격·거리·면적을 함께 비교해
          나에게 맞는 매물을 추천합니다.
        </p>
      </header>

      <nav className="main-tabs" aria-label="매물 보기 방식">
        <button
          type="button"
          className={activeTab === 'recommend' ? 'active' : ''}
          onClick={() => setActiveTab('recommend')}
        >
          맞춤 추천
        </button>
        <button
          type="button"
          className={activeTab === 'explore' ? 'active' : ''}
          onClick={() => setActiveTab('explore')}
        >
          전체 매물 · 지도
        </button>
      </nav>

      {activeTab === 'recommend' && <form className="filter-card" onSubmit={submit}>
        <section>
          <div className="section-title">
            <span>1</span>
            <div>
              <h2>예산과 기본 조건</h2>
              <p>원하는 조건을 먼저 입력해 주세요.</p>
            </div>
          </div>

          <div className="transaction-filter" role="group" aria-label="거래 유형 선택">
            <strong>거래 유형</strong>
            <div className="option-list">
              {TRANSACTION_TYPES.map((type) => (
                <button
                  type="button"
                  key={type}
                  className={form.transaction_type === type ? 'option active' : 'option'}
                  onClick={() => update('transaction_type', type)}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          <div className="field-grid">
            <RangeField label="보증금" minValue={form.min_deposit} maxValue={form.max_deposit} onMinChange={(v) => update('min_deposit', v)} onMaxChange={(v) => update('max_deposit', v)} minUnit="만원 이상" maxUnit="만원 이하" />
            <RangeField label="월세" minValue={form.min_rent} maxValue={form.max_rent} onMinChange={(v) => update('min_rent', v)} onMaxChange={(v) => update('max_rent', v)} minUnit="만원 이상" maxUnit="만원 이하" />
            <NumberField label="관리비" value={form.max_maintenance} onChange={(v) => update('max_maintenance', v)} unit="만원 이하" />
            <RangeField label="면적" minValue={form.min_area} maxValue={form.max_area} onMinChange={(v) => update('min_area', v)} onMaxChange={(v) => update('max_area', v)} minUnit="㎡ 이상" maxUnit="㎡ 이하" step="0.1" />
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
      </form>}

      {activeTab === 'recommend' && searched && (
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
              <PropertyCard
                key={property.id}
                property={property}
                index={index}
                recommended
                selected={compareItems.some((item) => item.id === property.id)}
                onToggleCompare={toggleCompare}
              />
            ))}
          </div>
        </section>
      )}

      {activeTab === 'explore' && (
        <section className="map-section">
          <div className="results-heading">
            <div>
              <span className="badge">전체 매물 {allProperties.length}개</span>
              <h2>지도 위에서 매물을 넘겨보세요.</h2>
            </div>
            <p>카드를 넘기면 해당 매물 위치로 지도가 이동합니다.</p>
          </div>
          {allError && <p className="error">{allError}</p>}
          {allLoading ? <div className="map-loading">지도를 준비하고 있어요.</div> : allProperties.length ? (
            <PropertyMapExplorer
              properties={allProperties}
              selectedId={selectedMapPropertyId}
              onSelect={setSelectedMapPropertyId}
              compareItems={compareItems}
              onToggleCompare={toggleCompare}
            />
          ) : !allError && <div className="map-loading">등록된 매물이 없습니다.</div>}
        </section>
      )}

      {compareItems.length > 0 && (
        <aside className="compare-tray" aria-label="매물 비교함">
          <div>
            <strong>비교함 {compareItems.length}/3</strong>
            <span>{compareItems.map((item) => item.name).join(' · ')}</span>
            {compareMessage && <small>{compareMessage}</small>}
          </div>
          <button type="button" disabled={compareItems.length < 2} onClick={() => setShowCompare(true)}>
            {compareItems.length < 2 ? '한 개 더 선택하세요' : '비교표 보기'}
          </button>
        </aside>
      )}

      {showCompare && (
        <CompareModal
          properties={compareItems}
          onClose={() => setShowCompare(false)}
          onRemove={removeCompareItem}
        />
      )}
    </div>
  )
}

export default App
