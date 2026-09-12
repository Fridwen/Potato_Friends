import os
from pathlib import Path
from typing import List

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

try:
    from dotenv import load_dotenv
except ImportError:
    # 배포 환경에서 python-dotenv가 없어도 기본 환경 변수로 실행합니다.
    load_dotenv = None

if load_dotenv is not None:
    load_dotenv(dotenv_path=Path(__file__).with_name(".env"))

app = FastAPI(title="KU Room Compare API")

frontend_origins = [
    origin.strip().rstrip("/")
    for origin in os.getenv("FRONTEND_ORIGIN", "http://localhost:5173,http://localhost:5174,http://127.0.0.1:5173,http://127.0.0.1:5174").split(",")
    if origin.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=frontend_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

PROPERTIES = [{'id': 3,
  'name': '제기동 대로변 원룸',
  'transaction_type': '월세',
  'location': '제기동',
  'address': '서울시 동대문구 제기동 67-211',
  'latitude': 37.5855662,
  'longitude': 127.0324143,
  'deposit': 1000,
  'rent': 60,
  'maintenance': 5,
  'area': 16.52,
  'supply_area': 16.52,
  'walk_time': 8,
  'options': ['주차'],
  'description': '학교와 가깝고 희소성 있는 대로변 원룸, 버스정류장 인접',
  'floor': '3/3층',
  'rooms': 1,
  'bathrooms': 1,
  'direction': '남서향',
  'parking': '가능',
  'room_type': '오픈형',
  'available_date': '즉시입주 협의가능',
  'approval_date': '1997.04.07',
  'property_number': '2648970829',
  'images': ['/properties/room-1-1.jpg',
             '/properties/room-1-2.jpg',
             '/properties/room-1-3.jpg',
             '/properties/room-1-4.jpg']},
 {'id': 2,
  'name': '안암동 신축급 반전세 원룸',
  'transaction_type': '월세',
  'location': '안암동5가',
  'address': '서울시 성북구 안암동5가 136-25',
  'latitude': 37.5831906,
  'longitude': 127.028814,
  'deposit': 3000,
  'rent': 70,
  'maintenance': 8,
  'area': 19.83,
  'supply_area': 33.05,
  'walk_time': 7,
  'options': ['건조기', '세탁기'],
  'description': '신축급으로 깔끔한 반전세 원룸, 건조기 구비',
  'floor': '2/3층',
  'rooms': 1,
  'bathrooms': 1,
  'direction': '동향',
  'parking': '불가능',
  'room_type': '오픈형',
  'available_date': '즉시입주 협의가능',
  'approval_date': '2000.06.28',
  'property_number': '2648548732',
  'images': ['/properties/room-2-1.jpg',
             '/properties/room-2-2.jpg',
             '/properties/room-2-3.jpg',
             '/properties/room-2-4.jpg',
             '/properties/room-2-5.jpg',
             '/properties/room-2-6.jpg',
             '/properties/room-2-7.jpg',
             '/properties/room-2-8.jpg',
             '/properties/room-2-9.jpg']},
 {'id': 1,
  'name': '안암동 풀옵션 원룸',
  'transaction_type': '월세',
  'location': '안암동5가',
  'address': '서울시 성북구 안암동5가 136-25',
  'latitude': 37.5831906,
  'longitude': 127.028814,
  'deposit': 3000,
  'rent': 70,
  'maintenance': 8,
  'area': 19.14,
  'supply_area': 21.45,
  'walk_time': 7,
  'options': ['풀옵션'],
  'description': '깔끔한 내부의 풀옵션 원룸, 건조기 구비',
  'floor': '2/3층',
  'rooms': 1,
  'bathrooms': 1,
  'direction': '남서향',
  'parking': '불가능',
  'room_type': '오픈형',
  'available_date': '즉시입주 협의가능',
  'approval_date': '2000.06.28',
  'property_number': '2648145246',
  'images': ['/properties/room-3-1.jpg',
             '/properties/room-3-2.jpg',
             '/properties/room-3-3.jpg',
             '/properties/room-3-4.jpg',
             '/properties/room-3-5.jpg',
             '/properties/room-3-6.jpg',
             '/properties/room-3-7.jpg']},
 {'id': 4,
  'name': '안암역 도보 3분 전세 원룸',
  'transaction_type': '전세',
  'location': '안암동5가',
  'address': '서울시 성북구 안암동5가 103-80',
  'latitude': 37.5848244,
  'longitude': 127.0298593,
  'deposit': 6000,
  'rent': 0,
  'maintenance': 7,
  'area': 18.18,
  'supply_area': 101.11,
  'walk_time': 6,
  'options': ['풀옵션'],
  'description': '안암역 도보 3분 거리의 가성비 좋은 전세 원룸',
  'floor': '3/4층',
  'rooms': 1,
  'bathrooms': 1,
  'direction': '남동향',
  'parking': '불가능',
  'room_type': '오픈형',
  'available_date': '즉시입주 협의가능',
  'approval_date': '1967.12.27',
  'property_number': '2649073274',
  'images': ['/properties/room-4-1.jpg']},
 {'id': 5,
  'name': '제기동 풀옵션 투룸',
  'transaction_type': '월세',
  'location': '제기동',
  'address': '서울시 동대문구 제기동 67-142',
  'latitude': 37.5849614,
  'longitude': 127.0337653,
  'deposit': 1000,
  'rent': 80,
  'maintenance': 0,
  'area': 27.0,
  'supply_area': 27.0,
  'walk_time': 8,
  'options': ['풀옵션'],
  'description': '반려동물 가능, 집기 전체를 사용할 수 있는 풀옵션 투룸',
  'floor': '저/3층',
  'rooms': 2,
  'bathrooms': 1,
  'direction': '남향',
  'parking': '불가능',
  'room_type': '분리형',
  'available_date': '즉시입주 협의가능',
  'approval_date': '1988.12.08',
  'maintenance_note': '관리비 없음, 공과금 실비',
  'images': ['/properties/room-5-1.jpg',
             '/properties/room-5-2.jpg',
             '/properties/room-5-3.jpg',
             '/properties/room-5-4.jpg',
             '/properties/room-5-5.jpg',
             '/properties/room-5-6.jpg']},
 {'id': 6,
  'name': '제기동 고려대 인접 투룸',
  'transaction_type': '월세',
  'location': '제기동',
  'address': '서울시 동대문구 제기동 67-85',
  'latitude': 37.5856281,
  'longitude': 127.0333346,
  'deposit': 2000,
  'rent': 120,
  'maintenance': 8,
  'area': 33.05,
  'supply_area': 42.97,
  'walk_time': 7,
  'options': [],
  'description': '고려대 이공계·문과 캠퍼스 모두 접근하기 좋고 안암역·고려대역 도보 7분 거리',
  'floor': '2/3층',
  'rooms': 2,
  'bathrooms': 1,
  'direction': '동향',
  'parking': '불가능',
  'room_type': '분리형',
  'available_date': '즉시입주 협의가능',
  'approval_date': '1996.10.22',
  'property_number': '2647302804',
  'images': ['/properties/room-6-1.jpg',
             '/properties/room-6-2.jpg',
             '/properties/room-6-3.jpg',
             '/properties/room-6-4.jpg',
             '/properties/room-6-5.jpg',
             '/properties/room-6-6.jpg',
             '/properties/room-6-7.jpg',
             '/properties/room-6-8.jpg',
             '/properties/room-6-9.jpg']},
 {'id': 7,
  'name': '고려대 이공대 후문 분리형 원룸',
  'transaction_type': '월세',
  'location': '종암동',
  'address': '서울시 성북구 종암동 29-14',
  'latitude': 37.593123,
  'longitude': 127.032541,
  'deposit': 1000,
  'rent': 50,
  'maintenance': 5,
  'area': 19.83,
  'supply_area': 23.14,
  'walk_time': 5,
  'options': ['풀옵션', '전자레인지', '책상'],
  'description': '이공대생들이 선호하는 조용한 주택가 분리형 원룸입니다.',
  'floor': '2/4층',
  'rooms': 1,
  'bathrooms': 1,
  'direction': '남향',
  'parking': '1대 가능',
  'room_type': '분리형',
  'available_date': '즉시입주',
  'approval_date': '2015.08.12',
  'property_number': '2649073275',
  'images': ['/properties/room-1-1.jpg', '/properties/room-1-2.jpg']},
 {'id': 8,
  'name': '안암오거리 채광 좋은 신축급 원룸',
  'transaction_type': '월세',
  'location': '안암동5가',
  'address': '서울시 성북구 안암동5가 15-22',
  'latitude': 37.581561,
  'longitude': 127.031201,
  'deposit': 2000,
  'rent': 60,
  'maintenance': 8,
  'area': 22.0,
  'supply_area': 26.5,
  'walk_time': 4,
  'options': ['시스템에어컨', '빌트인냉장고', '인덕션', '풀옵션'],
  'description': '안암오거리 인근으로 교통이 편리하고 채광이 매우 좋습니다.',
  'floor': '4/5층',
  'rooms': 1,
  'bathrooms': 1,
  'direction': '동향',
  'parking': '불가능',
  'room_type': '오픈형',
  'available_date': '2026.10.01 이후',
  'approval_date': '2021.03.15',
  'property_number': '2649073276',
  'images': ['/properties/room-2-1.jpg']},
 {'id': 9,
  'name': '제기동역 초역세권 오피스텔형 원룸',
  'transaction_type': '전세',
  'location': '제기동',
  'address': '서울시 동대문구 제기동 137-9',
  'latitude': 37.578132,
  'longitude': 127.034871,
  'deposit': 12000,
  'rent': 0,
  'maintenance': 10,
  'area': 24.5,
  'supply_area': 33.0,
  'walk_time': 2,
  'options': ['풀옵션', '엘리베이터', 'CCTV', '무인택배함'],
  'description': '지하철역 2분 거리로 안전하며, 보안 시설이 완비된 전세 매물입니다.',
  'floor': '7/10층',
  'rooms': 1,
  'bathrooms': 1,
  'direction': '남서향',
  'parking': '기계식 주차',
  'room_type': '오픈형',
  'available_date': '협의가능',
  'approval_date': '2018.11.20',
  'property_number': '2649073277',
  'images': ['/properties/room-3-1.jpg', '/properties/room-3-2.jpg', '/properties/room-3-3.jpg']}]



class RecommendRequest(BaseModel):
    transaction_type: str = "월세"
    min_deposit: int = Field(ge=0)
    max_deposit: int = Field(ge=0)
    min_rent: int = Field(ge=0)
    max_rent: int = Field(ge=0)
    max_maintenance: int = Field(ge=0)
    min_area: float = Field(ge=0)
    max_area: float = Field(ge=0)
    max_walk_time: int = Field(ge=1)
    required_options: List[str] = Field(default_factory=list)
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
    return sorted(PROPERTIES, key=lambda item: item["id"])


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
        if req.transaction_type != "전체" and item["transaction_type"] != req.transaction_type:
            continue
        if item["deposit"] < req.min_deposit or item["deposit"] > req.max_deposit:
            continue
        if item["rent"] < req.min_rent or item["rent"] > req.max_rent:
            continue
        if item["maintenance"] > req.max_maintenance:
            continue
        if item["area"] < req.min_area or item["area"] > req.max_area:
            continue
        if item["walk_time"] > req.max_walk_time:
            continue
        # 풀옵션 매물은 사용자가 선택한 개별 기본 옵션을 모두 갖춘 것으로 봅니다.
        if "풀옵션" not in item["options"] and any(
            option not in item["options"] for option in req.required_options
        ):
            continue

        matched.append(score_property(item, req))

    matched.sort(key=lambda x: x["score"], reverse=True)

    return {
        "count": len(matched),
        "results": matched,
    }


from space_api import router as space_router

app.include_router(space_router)
