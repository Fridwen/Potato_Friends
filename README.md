# 🥔 Potato Friends

> **대학생의 자취방 선택을 더 쉽고, 더 납득 가능하게.**  
> 예산·거리·면적·옵션을 기준으로 매물을 추천하고, 지도와 비교 기능으로 최종 선택까지 도와주는 주거 비교 서비스입니다.

---

## 🏠 서비스 소개

자취방을 구할 때 우리는 보통 **월세 하나만 보고 결정하지 않습니다.**

보증금은 감당 가능한지, 관리비는 얼마나 드는지, 학교까지 얼마나 걸리는지, 방은 충분히 넓은지, 필요한 옵션은 있는지까지 함께 봐야 합니다.

**Potato Friends**는 이런 조건을 한곳에서 비교하고, 사용자가 중요하게 생각하는 기준에 맞춰 매물을 추천해주는 서비스입니다.

현재 MVP는 **고려대학교 인근 매물**을 중심으로 구성되어 있습니다.

---

## ✨ 주요 기능

### 🎯 맞춤형 매물 추천

사용자가 원하는 조건을 입력하면 조건에 맞는 매물을 선별하고 추천 점수를 계산합니다.

- 거래 유형 선택: 월세 / 전세
- 보증금 범위
- 월세 범위
- 관리비 상한
- 희망 면적 범위
- 학교까지 최대 도보 시간
- 필수 옵션 선택
- 가격 / 거리 / 넓이 중요도 조절

추천 결과에는 단순 점수뿐 아니라 **왜 이 매물이 추천되었는지** 이유도 함께 보여줍니다.

---

### 🗺️ 지도 기반 매물 탐색

전체 매물을 지도 위에서 확인할 수 있습니다.

추천 결과에서 **`지도에서 보기`**를 누르면 해당 매물이 선택된 상태로 지도 화면으로 이동합니다.

지도 아래의 매물 카드를 넘기면 지도도 해당 매물 위치로 함께 이동합니다.

---

### ⚖️ 최대 3개 매물 비교

마음에 드는 매물을 비교함에 담아 한눈에 비교할 수 있습니다.

비교 항목 예시:

- 보증금
- 월세
- 관리비
- 월세 + 관리비
- 전용면적
- 학교까지 거리
- 방 구조
- 방향
- 주차 여부
- 옵션

항목별로 어떤 매물이 상대적으로 유리한지도 시각적으로 표시합니다.

---

### 🧊 3D 공간 미리보기

일부 데모 매물에서는 저장된 3D 공간 모델을 직접 둘러볼 수 있습니다.

- 전체 공간 보기
- 실내 시점 전환
- 드래그를 통한 시점 회전
- 전체 화면 보기
- 벽 숨기기 / 표시

> 현재 3D 모델은 데모용 추정 모델이며 실제 구조와 치수는 다를 수 있습니다.

---

### 🖼️ 매물 사진 갤러리

각 매물은 여러 장의 사진을 가질 수 있으며 카드에서 좌우로 넘겨볼 수 있습니다.

```python
"images": [
    "/properties/room-1-1.jpg",
    "/properties/room-1-2.jpg",
    "/properties/room-1-3.jpg",
]
```

이미지는 다음 경로에 저장합니다.

```text
frontend/public/properties/
```

---

## 🧭 사용자 흐름

```text
조건 입력
   ↓
맞춤 추천
   ↓
추천 이유 확인
   ↓
지도에서 위치 확인
   ↓
관심 매물을 비교함에 추가
   ↓
최대 3개 매물 비교
   ↓
일부 매물 3D 공간 확인
```

---

## 🛠 Tech Stack

### Frontend

- React
- Vite
- React Leaflet
- Leaflet
- Three.js
- Lucide React

### Backend

- FastAPI
- Python
- Uvicorn

### Deployment

- Vercel
- GitHub

---

## 📁 Project Structure

```text
Potato_Friends/
├── backend/
│   ├── app.py
│   ├── requirements.txt
│   └── vercel.json
│
├── frontend/
│   ├── public/
│   │   └── properties/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── index.css
│   │   └── space/
│   │       ├── RoomView.tsx
│   │       ├── SpaceModal.jsx
│   │       └── data/
│   ├── package.json
│   └── vite.config.js
│
└── README.md
```

---

## 🚀 로컬 실행

### 1. Backend

```bash
cd backend
python -m pip install -r requirements.txt
uvicorn app:app --reload
```

기본 주소:

```text
http://localhost:8000
```

FastAPI 문서:

```text
http://localhost:8000/docs
```

### 2. Frontend

새 터미널에서 실행합니다.

```bash
cd frontend
npm install
npm run dev
```

기본 주소:

```text
http://localhost:5173
```

---

## 🔐 Environment Variables

### frontend/.env

```env
VITE_API_URL=http://localhost:8000
```

### backend/.env

```env
FRONTEND_ORIGIN=http://localhost:5173
```

실제 API Key나 비밀값은 `.env`에 저장하고 GitHub에는 올리지 않습니다.

`.env.example`에는 값 대신 형식만 남겨주세요.

---

## 💡 우리가 해결하고 싶은 문제

기존 부동산 서비스는 많은 매물을 보여주는 데 강점이 있지만, 사용자는 결국 직접 여러 조건을 비교하며 **“그래서 나한테 어떤 방이 더 좋은가?”**를 판단해야 합니다.

Potato Friends는 단순한 매물 목록이 아니라,

> **내 조건에 맞는 방을 찾고 → 이유를 확인하고 → 위치를 보고 → 직접 비교하는 과정**

자체를 하나의 흐름으로 만드는 것을 목표로 합니다.

---

## 🌱 확장 아이디어

현재는 고려대학교 인근 매물을 중심으로 구현했지만 이후에는 다음과 같이 확장할 수 있습니다.

- 대학 선택 기능 추가
- 전국 대학가 매물 비교
- 실제 거래 가격 기반 가격 적정성 분석
- 사용자 매물 비교 목록 저장
- 매물 등록 요청 및 검수 시스템
- 더 많은 매물의 3D 공간 지원

---

<div align="center">

### 🥔 Potato Friends

**방을 많이 보여주는 서비스보다,  
내가 고르기 쉬운 서비스를 만들고 싶었습니다.**

</div>
