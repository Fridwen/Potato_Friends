from app import app, PROPERTIES

PROPERTY_10 = {
    "id": 10,
    "name": "고대 인문계 도보 3분 월세 원룸",
    "transaction_type": "월세",
    "location": "안암동5가",
    "address": "서울특별시 성북구 고려대로24가길 4-7",
    "latitude": 37.58465,
    "longitude": 127.02955,
    "deposit": 500,
    "rent": 55,
    "maintenance": 5,
    "area": 19.17,
    "supply_area": None,
    "walk_time": 3,
    "options": ["수도", "인터넷"],
    "description": "고대 인문계 도보 3분 거리의 가성비 좋은 월세 원룸",
    "floor": "반지하/4층",
    "rooms": 1,
    "bathrooms": 1,
    "direction": None,
    "parking": "불가능",
    "room_type": "오픈형",
    "available_date": "즉시입주 가능",
    "approval_date": None,
    "property_number": None,
    "images": [
        "/properties/id10_1.png",
        "/properties/id10_2.png",
        "/properties/id10_3.png",
        "/properties/id10_4.png",
        "/properties/id10_5.png",
    ],
}

if not any(item.get("id") == 10 for item in PROPERTIES):
    PROPERTIES.append(PROPERTY_10)
