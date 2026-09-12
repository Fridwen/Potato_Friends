import { lazy, Suspense, useEffect, useState } from 'react'
import { displayZones } from './space'
import roomOneSpace from './data/room-1.json'
import './space.css'

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
        <span className="preset-badge">미리 생성된 3D 모델</span>
        <h2>{property.name} · 3D 공간 보기</h2>
        <p className="space-warning">
          저장된 3D 모델을 즉시 불러왔습니다. 열람 중에는 AI API를 호출하지 않아 비용이 발생하지 않습니다.
        </p>
        <p className="preset-summary">전용 {property.area}㎡ · {property.room_type} · 방 {property.rooms ?? 1}개</p>
        <Suspense fallback={<p>3D 모델 불러오는 중…</p>}>
          <RoomView space={space} active={active} onSelect={setActive} />
        </Suspense>
        <p className="space-warning preset-note">데모용 추정 3D 모델이며 실제 구조와 치수는 다를 수 있습니다.</p>
      </section>
    </div>
  )
}
