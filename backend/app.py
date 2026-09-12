import os
from typing import List

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

load_dotenv()

app = FastAPI(title="KU Room Compare API")

frontend_origins = [
    origin.strip().rstrip("/")
    for origin in os.getenv("FRONTEND_ORIGIN", "http://localhost:5173").split(",")
    if origin.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=frontend_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

PROPERTIES = [
    {
        "id": 1,
        "name": "안암 원룸 A",
        "location": "안암동",
        "deposit": 500,
        "rent": 52,
        "maintenance": 6,
        "area": 20.4,
        "walk_time": 8,
        "options": ["에어컨", "세탁기", "냉장고"],
        "images": [
            "/properties/room-1-1.svg",
            "/properties/room-1-2.svg",
            "/properties/room-1-3.svg",
        ],
    },
    {
        "id": 2,
        "name": "참살이길 원룸 B",
        "location": "안암동5가",
        "deposit": 1000,
        "rent": 47,
        "maintenance": 8,
        "area": 18.2,
        "walk_time": 5,
        "options": ["에어컨", "세탁기", "냉장고", "엘리베이터"],
        "images": [
            "/properties/room-2-1.svg",
            "/properties/room-2-2.svg",
            "/properties/room-2-3.svg",
        ],
    },
    {
        "id": 3,
        "name": "고대앞 오피스텔 C",
        "location": "제기동",
        "deposit": 1000,
        "rent": 60,
        "maintenance": 9,
        "area": 24.1,
        "walk_time": 12,
        "options": ["에어컨", "세탁기", "냉장고", "엘리베이터", "주차"],
        "images": [
            "/properties/room-3-1.svg",
            "/properties/room-3-2.svg",
            "/properties/room-3-3.svg",
        ],
    },
    {
        "id": 4,
        "name": "개운사길 원룸 D",
        "location": "안암동",
        "deposit": 300,
        "rent": 55,
        "maintenance": 5,
        "area": 16.8,
        "walk_time": 6,
        "options": ["에어컨", "냉장고"],
        "images": [
            "/properties/room-4-1.svg",
            "/properties/room-4-2.svg",
            "/properties/room-4-3.svg",
        ],
    },
    {
        "id": 5,
        "name": "종암동 분리형 원룸 E",
        "location": "종암동",
        "deposit": 700,
        "rent": 49,
        "maintenance": 7,
        "area": 22.5,
        "walk_time": 18,
        "options": ["에어컨", "세탁기", "냉장고"],
        "images": [
            "/properties/room-5-1.svg",
            "/properties/room-5-2.svg",
            "/properties/room-5-3.svg",
        ],
    },
    {
        "id": 6,
        "name": "안암역 오피스텔 F",
        "location": "안암동5가",
        "deposit": 1500,
        "rent": 58,
        "maintenance": 10,
        "area": 21.0,
        "walk_time": 4,
        "options": ["에어컨", "세탁기", "냉장고", "엘리베이터"],
        "images": [
            "/properties/room-6-1.svg",
            "/properties/room-6-2.svg",
            "/properties/room-6-3.svg",
        ],
    },
]


class RecommendRequest(BaseModel):
    max_deposit: int = Field(ge=0)
    max_rent: int = Field(ge=0)
    max_maintenance: int = Field(ge=0)
    min_area: float = Field(ge=0)
    max_walk_time: int = Field(ge=1)
    required_options: List[str] = []
    price_weight: int = Field(default=50, ge=0)
    distance_weight: int = Field(default=30, ge=0)
    area_weight: int = Field(default=20, ge=0)


@app.get("/")
def root():
    return {"message": "KU Room Compare backend is running"}


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/api/properties")
def get_properties():
    return PROPERTIES


def clamp(value, minimum=0.0, maximum=100.0):
    return max(minimum, min(maximum, value))


def score_property(item, req: RecommendRequest):
    # 가격: 월세 + 관리비가 상한에서 멀수록 점수가 높음
    max_monthly = max(req.max_rent + req.max_maintenance, 1)
    monthly = item["rent"] + item["maintenance"]
    price_score = clamp((1 - monthly / max_monthly) * 100 + 50)

    # 거리: 허용한 최대 도보 시간보다 가까울수록 높은 점수
    distance_score = clamp((1 - item["walk_time"] / max(req.max_walk_time, 1)) * 100 + 50)

    # 면적: 최소 면적보다 얼마나 여유 있는지
    area_base = max(req.min_area, 1)
    area_score = clamp(50 + ((item["area"] - req.min_area) / area_base) * 100)

    total_weight = req.price_weight + req.distance_weight + req.area_weight
    if total_weight == 0:
        total_weight = 1

    score = (
        price_score * req.price_weight
        + distance_score * req.distance_weight
        + area_score * req.area_weight
    ) / total_weight

    reasons = []
    if item["rent"] <= req.max_rent - 5:
        reasons.append(f"월세가 예산보다 {req.max_rent - item['rent']}만원 낮아요.")
    if item["walk_time"] <= 10:
        reasons.append(f"고려대까지 도보 약 {item['walk_time']}분으로 가까워요.")
    if item["area"] >= req.min_area + 2:
        reasons.append(f"최소 희망 면적보다 {item['area'] - req.min_area:.1f}㎡ 넓어요.")
    if not reasons:
        reasons.append("입력한 조건을 균형 있게 충족하는 매물이에요.")

    result = dict(item)
    result["score"] = round(score, 1)
    result["monthly_cost"] = item["rent"] + item["maintenance"]
    result["reasons"] = reasons[:3]
    return result


@app.post("/api/recommend")
def recommend(req: RecommendRequest):
    matched = []

    for item in PROPERTIES:
        if item["deposit"] > req.max_deposit:
            continue
        if item["rent"] > req.max_rent:
            continue
        if item["maintenance"] > req.max_maintenance:
            continue
        if item["area"] < req.min_area:
            continue
        if item["walk_time"] > req.max_walk_time:
            continue
        if any(option not in item["options"] for option in req.required_options):
            continue

        matched.append(score_property(item, req))

    matched.sort(key=lambda x: x["score"], reverse=True)

    return {
        "count": len(matched),
        "results": matched,
    }
