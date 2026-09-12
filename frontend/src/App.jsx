import { useEffect, useState } from 'react'

const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:8000').replace(/\/$/, '')

function App() {
  const [backendStatus, setBackendStatus] = useState('연결 확인 중...')

  useEffect(() => {
    fetch(`${API_URL}/health`)
      .then((response) => {
        if (!response.ok) throw new Error('Backend request failed')
        return response.json()
      })
      .then(() => setBackendStatus('백엔드 연결 성공'))
      .catch(() => setBackendStatus('백엔드에 연결할 수 없습니다.'))
  }, [])

  return (
    <main className="container">
      <p className="eyebrow">HACKATHON STARTER</p>
      <h1>프로젝트 시작</h1>
      <p>여기서부터 화면과 기능을 만들어가면 됩니다.</p>
      <div className="status">{backendStatus}</div>
    </main>
  )
}

export default App
