import { lazy, Suspense, useEffect, useState } from 'react'
import { displayZones } from './space'
import roomOneSpace from './data/room-1.json'
import './space.css'
import './three-d-only.css'

const RoomView = lazy(() => import('./RoomView'))
const results = new Map()

export const getSpaceResult = (id) => results.get(id)

export default function SpaceModal({ property, onClose }) {
  const space = roomOneSpace
  const [active, setActive] = useState(displayZones(space)[0]?.id || '')

  useEffect(() => {
    results.set(property.id, { space, images: property.images || [], names: [], localUrls: [] })
  }, [property, space])

  useEffect(() => {
    const closeOnEscape = (event) => event.key === 'Escape' && onClose()
    document.addEventListener('keydown', closeOnEscape)
    return () => document.removeEventListener('keydown', closeOnEscape)
  }, [onClose])

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <section
        className="space-modal preset-space-modal"
        role="dialog"
        aria-modal="true"
        aria-label={`${property.name} 3D 공간 보기`}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <button className="modal-close" onClick={onClose} aria-label="3D 공간 보기 닫기">×</button>
        <span className="preset-badge">3D 모델 보기</span>
        <h2>{property.name} · 3D 공간 보기</h2>
        <p className="preset-summary">전용 {property.area}㎡ · {property.room_type} · 방 {property.rooms ?? 1}개</p>
        <Suspense fallback={<p>3D 모델 불러오는 중…</p>}>
          <RoomView space={space} active={active} onSelect={setActive} />
        </Suspense>
        <p className="space-warning preset-note">추정 3D 모델이며 실제와 치수는 다를 수 있습니다.</p>
      </section>
    </div>
  )
}
