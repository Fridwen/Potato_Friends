# 고려대 자취방 비교 서비스 - Starter

## Backend
```bash
cd backend
python -m pip install -r requirements.txt
uvicorn app:app --reload
```

## Frontend
새 터미널에서:
```bash
cd frontend
npm install
npm run dev
```

## 이미지 연결 방식

각 매물 데이터에 `image` 필드를 둡니다.

```python
{
    "id": 1,
    "name": "안암 원룸 A",
    "image": "/properties/room-1.svg"
}
```

프론트의 `frontend/public/properties/` 안에 실제 사진을 넣고,
매물의 `image` 값만 그 파일명에 맞춰 바꾸면 됩니다.

예:
```text
frontend/public/properties/room-1.jpg
```

```python
"image": "/properties/room-1.jpg"
```

즉 `id`로 직접 이미지를 찾게 만들어도 되지만,
현재 버전은 데이터 안에 `image` 경로를 같이 넣는 방식이라 더 단순합니다.


## 여러 이미지 넣는 방법

이 버전에서는 `image`가 아니라 `images` 배열을 사용합니다.

예:
```python
"images": [
    "/properties/room-1-1.jpg",
    "/properties/room-1-2.jpg",
    "/properties/room-1-3.jpg",
]
```

실제 사진 파일은 아래 폴더에 넣으세요.

```text
frontend/public/properties/
```

예:
```text
room-1-1.jpg
room-1-2.jpg
room-1-3.jpg
```

프론트 카드에서 좌우 화살표, 점 표시, 현재 사진 번호로 넘겨볼 수 있습니다.
