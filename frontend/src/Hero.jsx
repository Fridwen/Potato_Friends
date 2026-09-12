import { useEffect, useState } from 'react'

const PHOTOS = [
  '/properties/room-1-1.jpg',
  '/properties/room-3-1.jpg',
  '/properties/room-5-1.jpg',
]

export default function Hero() {
  const [active, setActive] = useState(0)
  const [playing, setPlaying] = useState(
    () => !window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  )

  useEffect(() => {
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)')
    const stopForReducedMotion = () => {
      if (preference.matches) setPlaying(false)
    }
    preference.addEventListener('change', stopForReducedMotion)
    return () => preference.removeEventListener('change', stopForReducedMotion)
  }, [])

  useEffect(() => {
    if (!playing) return
    const timer = window.setInterval(() => {
      setActive((index) => (index + 1) % PHOTOS.length)
    }, 5000)
    return () => window.clearInterval(timer)
  }, [playing, active])

  return (
    <header className="hero">
      <div className="hero-photos" aria-hidden="true">
        {PHOTOS.map((src, index) => (
          <img key={src} src={src} alt="" className={index === active ? 'current' : ''} />
        ))}
      </div>
      <span className="badge">자취방 한눈에 비교하기 🔍</span>
      <h1>Roomio</h1>
      <p><strong>지금, 나에게 딱 맞는 자취방 찾기!</strong><br />예산부터 위치, 방 크기까지 한눈에 비교하고 마음에 드는 자취방을 찾아보세요.</p>
      <div className="hero-playback" role="group" aria-label="배경 사진 전환">
        {PHOTOS.map((src, index) => (
          <button
            key={src}
            type="button"
            className="hero-photo-dot"
            aria-label={`${index + 1}번째 매물 사진`}
            aria-pressed={active === index}
            onClick={() => setActive(index)}
          >
            <span />
          </button>
        ))}
        <button type="button" className="hero-pause" onClick={() => setPlaying((value) => !value)}>
          {playing ? '일시 정지' : '자동 재생'}
        </button>
      </div>
    </header>
  )
}
