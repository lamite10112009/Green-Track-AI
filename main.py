"""
GREEN TRACK AI - Backend API
FastAPI Server | Python 3.11+

HOW TO RUN:
  pip install fastapi uvicorn pydantic python-dotenv
  uvicorn main:app --reload --port 8000

AI DEVELOPMENT NOTES (marked with 🤖 AI_TODO):
  - Tất cả logic AI hiện tại dùng rule-based / mock data
  - Thay thế bằng API thật để có AI thực sự
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timedelta
import random
import math

app = FastAPI(title="Green Track AI API", version="1.0.0")

# CORS - cho phép frontend connect
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Production: thay bằng domain cụ thể
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============================================================
# DATA MODELS
# ============================================================

class ActivityLog(BaseModel):
    user_id: str
    date: str  # YYYY-MM-DD
    transport_type: str  # motorbike | bicycle | walk | bus | car
    transport_km: float
    electricity_hours: float
    plastic_items: int
    food_type: str  # meat | vegetarian | vegan
    shower_minutes: int

class UserProfile(BaseModel):
    user_id: str
    name: str
    school: str
    grade: str

# ============================================================
# CARBON CALCULATION ENGINE
# Rule-based, dùng hệ số phát thải thực tế (IPCC + Vietnam data)
# ============================================================

# Hệ số phát thải (kg CO2 per unit)
EMISSION_FACTORS = {
    "transport": {
        "motorbike": 0.104,   # kg CO2 / km
        "car": 0.192,         # kg CO2 / km
        "bus": 0.089,         # kg CO2 / km (shared)
        "bicycle": 0.0,       # zero emission
        "walk": 0.0,          # zero emission
    },
    "electricity": 0.4935,    # kg CO2 / kWh (Vietnam grid factor 2023)
    "electricity_per_hour": 0.15,  # kWh trung bình / giờ dùng điện cá nhân
    "plastic": 0.082,         # kg CO2 / item (lifecycle)
    "food": {
        "meat": 3.3,          # kg CO2 / meal
        "vegetarian": 1.7,
        "vegan": 0.9,
    },
    "water": 0.298 / 60,      # kg CO2 / phút tắm (0.298 kg/lần tắm 60 phút)
}

def calculate_carbon(activity: dict) -> dict:
    """
    Tính lượng CO2 từ các hoạt động của user trong 1 ngày.
    Returns breakdown theo từng category.
    """
    transport = (
        EMISSION_FACTORS["transport"].get(activity.get("transport_type","motorbike"), 0.104)
        * activity.get("transport_km", 0)
    )
    electricity = (
        EMISSION_FACTORS["electricity_per_hour"]
        * activity.get("electricity_hours", 0)
        * EMISSION_FACTORS["electricity"]
    )
    plastic = EMISSION_FACTORS["plastic"] * activity.get("plastic_items", 0)
    food = EMISSION_FACTORS["food"].get(activity.get("food_type","meat"), 3.3)
    water = EMISSION_FACTORS["water"] * activity.get("shower_minutes", 10)

    total = transport + electricity + plastic + food + water

    return {
        "total_kg": round(total, 3),
        "breakdown": {
            "transport": round(transport, 3),
            "electricity": round(electricity, 3),
            "plastic": round(plastic, 3),
            "food": round(food, 3),
            "water": round(water, 3),
        }
    }

def calculate_green_score(total_kg: float, baseline_kg: float = 8.0) -> int:
    """
    Tính Green Score (0–100).
    baseline_kg = mức phát thải trung bình học sinh VN / ngày (ước tính)

    🤖 AI_TODO: Thay công thức này bằng ML model được train
    trên dữ liệu thực tế của user để cá nhân hóa baseline.
    """
    if total_kg <= 0:
        return 100
    ratio = total_kg / baseline_kg
    score = max(0, min(100, int((1 - ratio) * 80 + 20)))
    return score

# ============================================================
# IN-MEMORY DATABASE (Demo)
# 🤖 AI_TODO: Thay bằng PostgreSQL / Supabase thật
# ============================================================

MOCK_DB = {
    "activities": [],
    "users": {
        "demo_user": {
            "name": "Lại Tùng Lâm",
            "school": "THPT Lý Thái Tổ",
            "grade": "11Q1",
            "joined": "2026-01-15"
        }
    }
}

# Tạo mock data 30 ngày cho demo
def _generate_mock_history():
    history = []
    base_date = datetime.now()
    for i in range(30, 0, -1):
        date = (base_date - timedelta(days=i)).strftime("%Y-%m-%d")
        # Mô phỏng xu hướng cải thiện dần
        improvement = i / 30
        activity = {
            "user_id": "demo_user",
            "date": date,
            "transport_type": random.choice(["motorbike","bicycle","walk","bus"]),
            "transport_km": random.uniform(2, 15) * (0.5 + improvement * 0.5),
            "electricity_hours": random.uniform(2, 6) * (0.6 + improvement * 0.4),
            "plastic_items": random.randint(0, 5),
            "food_type": random.choice(["meat","meat","vegetarian","vegan"]),
            "shower_minutes": random.randint(5, 20),
        }
        carbon = calculate_carbon(activity)
        activity["carbon"] = carbon
        activity["green_score"] = calculate_green_score(carbon["total_kg"])
        history.append(activity)
    return history

MOCK_DB["activities"] = _generate_mock_history()

# ============================================================
# API ROUTES
# ============================================================

@app.get("/")
def root():
    return {"message": "Green Track AI API is running 🌿", "version": "1.0.0"}

@app.get("/api/dashboard/{user_id}")
def get_dashboard(user_id: str):
    """
    Trả về toàn bộ data cho dashboard của user:
    - 30 ngày lịch sử
    - Green Score hôm nay
    - So sánh với tuần trước
    - Badges đã đạt
    - Tip của ngày

    🤖 AI_TODO: Tích hợp LLM để generate tip cá nhân hóa
    dựa trên pattern của user thay vì tips cứng bên dưới.
    """
    user = MOCK_DB["users"].get(user_id, MOCK_DB["users"]["demo_user"])
    activities = MOCK_DB["activities"]

    # Tuần này vs tuần trước
    week_avg = sum(a["carbon"]["total_kg"] for a in activities[-7:]) / 7
    prev_week_avg = sum(a["carbon"]["total_kg"] for a in activities[-14:-7]) / 7
    improvement_pct = round((prev_week_avg - week_avg) / prev_week_avg * 100, 1)

    # Green Score hôm nay
    latest = activities[-1] if activities else {}
    today_score = latest.get("green_score", 70)

    # Eco impact: quy đổi sang cây xanh
    total_saved_kg = max(0, sum(
        max(0, 8.0 - a["carbon"]["total_kg"]) for a in activities
    ))
    trees_equivalent = round(total_saved_kg / 21.77, 2)  # 1 cây hấp thụ ~21.77 kg CO2/năm

    # Badges
    badges = _compute_badges(activities)

    # 🤖 AI_TODO: Thay phần này bằng GPT-4o / Gemini API call
    # Prompt gợi ý: "Dựa trên lịch sử 7 ngày của user, hãy đưa ra 1 tip
    # cụ thể, ngắn gọn, phù hợp học sinh THPT VN để giảm phát thải CO2 ngày mai"
    tips = [
        "🚲 Hôm qua bạn đi xe máy 8km – thử đi xe đạp đoạn gần để tiết kiệm 0.8kg CO₂ nhé!",
        "⚡ Tắt điện phòng khi ra ngoài 30 phút có thể tiết kiệm 0.07 kg CO₂/ngày.",
        "🥗 Thay 1 bữa thịt bằng rau củ giúp giảm 1.6kg CO₂ — tương đương 1 ngày đi xe đạp!",
        "💧 Tắm dưới 7 phút tiết kiệm nước và năng lượng đun nóng đáng kể.",
        "🛍️ Mang túi vải đi học thay 1 túi nilon = -0.082 kg CO₂ mỗi ngày.",
    ]
    daily_tip = random.choice(tips)

    return {
        "user": user,
        "today": {
            "green_score": today_score,
            "carbon_kg": latest.get("carbon", {}).get("total_kg", 0),
            "breakdown": latest.get("carbon", {}).get("breakdown", {}),
        },
        "week_summary": {
            "avg_carbon_kg": round(week_avg, 2),
            "improvement_pct": improvement_pct,
            "trend": "improving" if improvement_pct > 0 else "worsening"
        },
        "eco_impact": {
            "total_saved_kg": round(total_saved_kg, 1),
            "trees_equivalent": trees_equivalent,
            "plastic_avoided": sum(
                max(0, 3 - a.get("plastic_items", 3)) for a in activities
            )
        },
        "history_30d": [
            {
                "date": a["date"],
                "green_score": a["green_score"],
                "carbon_kg": a["carbon"]["total_kg"],
                "breakdown": a["carbon"]["breakdown"]
            }
            for a in activities
        ],
        "badges": badges,
        "daily_tip": daily_tip,
        "class_rank": {
            "rank": 7,
            "total": 42,
            "percentile": 83
        }
    }

@app.post("/api/log-activity")
def log_activity(activity: ActivityLog):
    """
    Nhận log hoạt động của user, tính CO2, trả về kết quả ngay.

    🤖 AI_TODO: Sau khi lưu activity, gọi LLM để:
    1. Phân tích pattern thay đổi
    2. Cập nhật personalized recommendations
    3. Check xem user có đạt badge mới không
    """
    data = activity.dict()
    carbon = calculate_carbon(data)
    score = calculate_green_score(carbon["total_kg"])

    data["carbon"] = carbon
    data["green_score"] = score
    MOCK_DB["activities"].append(data)

    return {
        "success": True,
        "carbon": carbon,
        "green_score": score,
        "message": _get_feedback_message(score),
        # 🤖 AI_TODO: Thêm field "ai_recommendation" từ LLM call ở đây
    }

@app.post("/api/analyze-image")
def analyze_image():
    """
    🤖 AI_TODO: ENDPOINT NÀY CẦN AI THẬT
    
    Nhận ảnh rác (base64), phân loại bằng Computer Vision.
    
    Implementation:
    1. Nhận base64 image từ request body
    2. Gửi đến OpenAI Vision API hoặc Google Gemini Vision
       Prompt: "Classify this waste image into: plastic/organic/paper/metal/other.
                Return JSON: {category, confidence, co2_impact_kg}"
    3. Hoặc dùng TensorFlow.js MobileNet trên frontend (không cần server)
    
    Sample response format:
    {
        "category": "plastic",
        "confidence": 0.94,
        "co2_impact_kg": 0.082,
        "tip": "Hãy mang chai nhựa này đến điểm tái chế!"
    }
    """
    # Mock response cho demo
    categories = [
        {"category": "plastic", "confidence": 0.94, "co2_impact_kg": 0.082,
         "tip": "Chai nhựa nên bỏ vào thùng tái chế màu vàng 🟡"},
        {"category": "organic", "confidence": 0.88, "co2_impact_kg": 0.012,
         "tip": "Rác hữu cơ có thể ủ compost để bón cây 🌱"},
        {"category": "paper", "confidence": 0.91, "co2_impact_kg": 0.031,
         "tip": "Giấy sạch có thể tái chế – giảm 70% năng lượng sản xuất 📄"},
    ]
    return random.choice(categories)

@app.get("/api/news")
def get_news():
    """
    🤖 AI_TODO: ENDPOINT NÀY CẦN AI THẬT

    Lấy tin tức môi trường và tóm tắt bằng LLM cho học sinh.

    Implementation:
    1. Crawl RSS từ: VnExpress Môi Trường, BBC Earth, NASA Climate
    2. Gửi từng bài lên GPT-4o với prompt:
       "Tóm tắt bài báo này trong 2 câu, ngôn ngữ đơn giản cho học sinh THPT.
        Thêm 1 hành động cụ thể học sinh có thể làm liên quan đến tin này."
    3. Return list bài đã tóm tắt

    Libraries cần: feedparser, httpx, openai
    """
    # Mock news data
    return {
        "articles": [
            {
                "id": 1,
                "title": "Việt Nam cam kết giảm 43.5% phát thải CO₂ vào 2030",
                "summary": "Chính phủ VN công bố kế hoạch giảm phát thải mạnh mẽ, tập trung vào năng lượng tái tạo và giao thông xanh.",
                "ai_summary": "🌏 VN đang hành động vì khí hậu! Mỗi ngày bạn đi xe đạp thay xe máy là bạn góp phần vào mục tiêu quốc gia này.",
                "action": "Thử đi xe đạp hoặc đi bộ ít nhất 1 lần trong tuần này",
                "source": "VnExpress",
                "date": "2024-01-20",
                "tag": "Chính sách"
            },
            {
                "id": 2,
                "title": "Rác nhựa đại dương đạt mức kỷ lục — 170 nghìn tỷ mảnh",
                "summary": "Nghiên cứu mới cho thấy lượng rác nhựa trong đại dương tăng gấp đôi chỉ trong 15 năm qua.",
                "ai_summary": "🐠 Cá và sinh vật biển đang ăn phải nhựa mỗi ngày. Mỗi chai nhựa bạn không dùng = 1 sinh vật biển an toàn hơn.",
                "action": "Dùng bình nước cá nhân thay chai nhựa trong 7 ngày",
                "source": "BBC Earth",
                "date": "2024-01-19",
                "tag": "Đại dương"
            },
            {
                "id": 3,
                "title": "Rừng nhiệt đới Amazon mất 10.000 km² trong năm 2023",
                "summary": "Tốc độ phá rừng vẫn ở mức đáng lo ngại dù đã giảm so với năm trước.",
                "ai_summary": "🌳 Amazon là lá phổi của Trái Đất. Tiết kiệm giấy và giảm ăn thịt bò là cách gián tiếp bảo vệ rừng.",
                "action": "In 2 mặt giấy và hạn chế dùng giấy không cần thiết tuần này",
                "source": "NASA Climate",
                "date": "2024-01-18",
                "tag": "Rừng"
            }
        ]
    }

@app.get("/api/leaderboard/{school}")
def get_leaderboard(school: str):
    """
    Bảng xếp hạng Green Score trong trường.

    🤖 AI_TODO: Kết hợp AI để:
    - Phát hiện outlier (học sinh đột ngột tăng score bất thường)
    - Gợi ý "học hỏi từ top performer" — AI analyze pattern của top user
      rồi tóm tắt thói quen nổi bật cho cả lớp
    """
    # Mock leaderboard
    names = ["Tùng Lâm", "Thanh Hà", "Đức Anh", "Thu Trang", "Hoàng Nam",
             "Linh Chi", "Văn Đức", "Phương Thảo", "Quang Huy", "Ngọc Bích"]
    return {
        "school": school,
        "period": "Tháng 1/2024",
        "rankings": [
            {
                "rank": i + 1,
                "name": names[i],
                "green_score": max(40, 95 - i * 5 + random.randint(-3, 3)),
                "carbon_kg_avg": round(3.2 + i * 0.4, 1),
                "streak_days": max(1, 28 - i * 2),
                "is_current_user": i == 6,
                "highlight": "🚲 Đi xe đạp 5 ngày/tuần" if i == 0 else None
            }
            for i in range(10)
        ]
    }

# ============================================================
# HELPER FUNCTIONS
# ============================================================

def _compute_badges(activities: list) -> list:
    """Tính badges dựa trên lịch sử hoạt động"""
    badges = []
    recent = activities[-7:] if len(activities) >= 7 else activities

    plastic_free_days = sum(1 for a in recent if a.get("plastic_items", 99) == 0)
    if plastic_free_days >= 7:
        badges.append({"id": "plastic_free_week", "name": "7 Ngày Không Nhựa", "icon": "♻️", "earned": True})
    elif plastic_free_days >= 3:
        badges.append({"id": "plastic_free_3", "name": "3 Ngày Không Nhựa", "icon": "♻️", "earned": True})

    green_transport = sum(1 for a in recent if a.get("transport_type") in ["bicycle","walk"])
    if green_transport >= 5:
        badges.append({"id": "green_commuter", "name": "Người Đi Xanh", "icon": "🚲", "earned": True})

    avg_score = sum(a.get("green_score",0) for a in recent) / max(len(recent),1)
    if avg_score >= 75:
        badges.append({"id": "eco_champion", "name": "Eco Champion", "icon": "🏆", "earned": True})

    # Locked badges
    badges.append({"id": "vegan_week", "name": "Tuần Thuần Chay", "icon": "🥗", "earned": False})
    badges.append({"id": "zero_emission", "name": "Ngày Zero Emission", "icon": "⚡", "earned": False})

    return badges

def _get_feedback_message(score: int) -> str:
    """
    🤖 AI_TODO: Thay bằng LLM-generated message cá nhân hóa.
    Input cho LLM: score, trend 7 ngày, category nào cao nhất hôm nay.
    """
    if score >= 80:
        return "🌟 Xuất sắc! Hôm nay bạn sống rất xanh. Hãy duy trì nhé!"
    elif score >= 60:
        return "👍 Tốt! Bạn đang trên đà cải thiện. Thử giảm thêm 1 thói quen nhỏ ngày mai."
    elif score >= 40:
        return "🌱 Được rồi! Mỗi bước nhỏ đều có ý nghĩa. Hãy thử đi bộ hoặc không dùng nhựa ngày mai."
    else:
        return "💡 Không sao! Biết để cải thiện là bước đầu tiên. Hãy thử 1 thay đổi nhỏ ngày mai."
