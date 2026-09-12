import { useEffect, useState } from 'react'
import LivingCost from './LivingCost.jsx'
import './map-property-detail.css'

const THREE_D_PROPERTY_IDS = new Set([1, 10])

export default function MapPropertyDetailModal({ property, onClose, inCompare, onToggleCompare, onOpen3D }) {
  const images = property.images?.length ? property.images : []
  const [currentImage, setCurrentImage] = useState(0)
  const monthlyCost = property.monthly_cost ?? property.rent + property.maintenance
  const has3D = THREE_D_PROPERTY_IDS.has(property.id)

  useEffect(() => {
    setCurrentImage(0)
  }, [property.id])

  useEffect(() => {
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', closeOnEscape)
    return () => document.removeEventListener('keydown', closeOnEscape)
  }, [onClose])

  const previousImage = () => {
    if (!images.length) return
    setCurrentImage((current) => (current - 1 + images.length) % images.length)
  }

  const nextImage = () => {
    if (!images.length) return
    setCurrentImage((current) => (current + 1) % images.length)
  }

  return (
    <div className="map-detail-backdrop" onMouseDown={onClose}>
      <section
        className="map-detail-modal"
        role="dialog"
        aria-modal="true"
        aria-label={`${property.name} 상세 정보`}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <button type="button" className="map-detail-close" onClick={onClose} aria-label="상세 정보 닫기">×</button>

        <div className="map-detail-gallery">
          {images.length ? (
            <img src={images[currentImage]} alt={`${property.name} 사진 ${currentImage + 1}`} />
          ) : (
            <div className="map-detail-no-image">사진 없음</div>
          )}

          {images.length > 1 && (
            <>
              <button type="button" className="map-detail-arrow previous" onClick={previousImage} aria-label="이전 사진">‹</button>
              <button type="button" className="map-detail-arrow next" onClick={nextImage} aria-label="다음 사진">›</button>
              <span className="map-detail-image-count">{currentImage + 1} / {images.length}</span>
            </>
          )}
        </div>

        {images.length > 1 && (
          <div className="map-detail-thumbnails" aria-label="매물 사진 목록">
            {images.map((image, index) => (
              <button
                type="button"
                key={`${image}-${index}`}
                className={currentImage === index ? 'active' : ''}
                onClick={() => setCurrentImage(index)}
                aria-label={`${index + 1}번째 사진 보기`}
              >
                <img src={image} alt="" />
              </button>
            ))}
          </div>
        )}

        <div className="map-detail-content">
          <div className="map-detail-title-row">
            <div>
              <span className={`transaction-type ${property.transaction_type === '전세' ? 'jeonse' : 'monthly'}`}>
                {property.transaction_type}
              </span>
              <span className="map-detail-location">{property.location}</span>
              <h2>{property.name}</h2>
            </div>
            <strong className="map-detail-price">
              {property.transaction_type === '전세'
                ? `전세 ${property.deposit}만`
                : `${property.deposit}/${property.rent}만`}
            </strong>
          </div>

          {property.description && <p className="map-detail-description">{property.description}</p>}
          {property.maintenance_note && (
            <p className="map-detail-maintenance"><strong>관리비 안내</strong>{property.maintenance_note}</p>
          )}

          <div className="map-detail-facts">
            <div><span>보증금</span><strong>{property.deposit}만원</strong></div>
            {property.transaction_type === '월세' && <div><span>월세</span><strong>{property.rent}만원</strong></div>}
            <div><span>관리비</span><strong>{property.maintenance}만원</strong></div>
            {property.transaction_type === '월세' && <div><span>월 고정비</span><strong>{monthlyCost}만원</strong></div>}
            <div><span>전용면적</span><strong>{property.area}㎡</strong></div>
            <div><span>학교까지</span><strong>{property.walk_time}분</strong></div>
            <div><span>방 구조</span><strong>{property.room_type ?? '-'}</strong></div>
            <div><span>방향</span><strong>{property.direction ?? '-'}</strong></div>
            <div><span>주차</span><strong>{property.parking ?? '-'}</strong></div>
          </div>

          <div className="map-detail-address">
            <span>주소</span>
            <strong>{property.address}</strong>
          </div>

          <div className="map-detail-options">
            {(property.options || []).map((option) => <span key={option}>{option}</span>)}
          </div>

          <LivingCost property={property} />

          <div className="map-detail-actions">
            <button type="button" className={inCompare ? 'selected' : ''} onClick={() => onToggleCompare(property)}>
              {inCompare ? '비교함에서 빼기' : '비교함에 담기'}
            </button>
            <button type="button" className="primary" disabled={!has3D} onClick={() => has3D && onOpen3D(property)}>
              {has3D ? '3D 공간 보기' : '3D 구현 예정'}
            </button>
          </div>
        </div>
      </section>
    </div>
  )
}
