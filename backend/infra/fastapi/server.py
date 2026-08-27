"""
Nabd | نبض - Healthcare Platform Backend
FastAPI + MongoDB | Full real-time integration with seeded Saudi data
"""
import os
import uuid
import jwt
import bcrypt
import logging
from pathlib import Path
from datetime import datetime, timedelta, timezone
from typing import List, Optional, Dict, Any

from fastapi import FastAPI, APIRouter, HTTPException, Depends, Header, WebSocket, WebSocketDisconnect, UploadFile, File
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
from pydantic import BaseModel
import boto3
from botocore.config import Config as BotocoreConfig

from seed_dev import seed_test_data

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

MONGO_URL = os.environ['MONGO_URL']
DB_NAME = os.environ['DB_NAME']
JWT_SECRET = os.environ.get('JWT_SECRET')
if not JWT_SECRET:
    raise RuntimeError('JWT_SECRET is required')
EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY', '')
JWT_ALGO = 'HS256'

client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

# ============================ R2 / CLOUDFLARE ============================
R2_ACCOUNT_ID = os.environ.get('R2_ACCOUNT_ID')
R2_ACCESS_KEY = os.environ.get('R2_ACCESS_KEY')
R2_SECRET_KEY = os.environ.get('R2_SECRET_KEY')
R2_BUCKET = os.environ.get('R2_BUCKET')
R2_PUBLIC_URL = os.environ.get('R2_PUBLIC_URL', '')

def get_r2_client():
    if not all([R2_ACCOUNT_ID, R2_ACCESS_KEY, R2_SECRET_KEY, R2_BUCKET]):
        raise HTTPException(503, 'object_storage_not_configured')
    return boto3.client(
        's3',
        endpoint_url=f'https://{R2_ACCOUNT_ID}.r2.cloudflarestorage.com',
        aws_access_key_id=R2_ACCESS_KEY,
        aws_secret_access_key=R2_SECRET_KEY,
        config=BotocoreConfig(signature_version='s3v4'),
        region_name='auto',
    )

app = FastAPI(title="Nabd Healthcare API")

# ============ AI router MUST come BEFORE the NestJS proxy to win path matching ============
# (FastAPI matches routes in registration order; the proxy uses /api/v2/{path:path}.)
from ai_routes import ai_router as _ai_router
app.include_router(_ai_router)

# ============ Mount NestJS proxy BEFORE FastAPI's own routes ============
from nestjs_proxy import proxy_router as _nest_proxy_router
app.include_router(_nest_proxy_router)

api = APIRouter(prefix="/api")

logger = logging.getLogger("nabd")
logging.basicConfig(level=logging.INFO)


# ============================ MODELS ============================
class GuestRegisterReq(BaseModel):
    phone: str
    lat: Optional[float] = None
    lng: Optional[float] = None
    city: Optional[str] = None
    district: Optional[str] = None

class UserRegisterReq(BaseModel):
    full_name: str
    phone: str
    password: str
    email: Optional[str] = None
    role: str = "patient"

class LoginReq(BaseModel):
    phone: str
    password: str

class DoctorOnboardingReq(BaseModel):
    full_name_ar: str
    full_name_en: Optional[str] = None
    phone: str
    email: Optional[str] = None
    password: str
    specialty: str
    sub_specialties: List[str] = []
    credentials: str
    title: str
    city: str
    district: str
    hospital: Optional[str] = None
    license_pdf_base64: Optional[str] = None
    avatar_base64: Optional[str] = None
    price_clinic: Optional[float] = 0
    price_online: Optional[float] = 0
    price_home: Optional[float] = 0
    consultation_modes: List[str] = []
    lat: Optional[float] = None
    lng: Optional[float] = None

class ContactTicketReq(BaseModel):
    name: str
    phone: str
    category: str
    subject: Optional[str] = ""
    message: str

class AppointmentReq(BaseModel):
    doctor_id: str
    mode: str
    date: str
    time: str
    notes: Optional[str] = ""
    insurance_id: Optional[str] = None

class OrderItem(BaseModel):
    product_id: str
    qty: int = 1

class OrderReq(BaseModel):
    pharmacy_id: Optional[str] = None
    items: List[OrderItem]
    payment_method: str = "cash"
    insurance_id: Optional[str] = None
    delivery_address: Optional[Dict[str, Any]] = None
    prescription_image_base64: Optional[str] = None

class ChatMessageReq(BaseModel):
    text: Optional[str] = ""
    image_base64: Optional[str] = None
    voice_base64: Optional[str] = None

class ReviewReq(BaseModel):
    target_type: str
    target_id: str
    rating: int
    comment: Optional[str] = ""

class VitalsReq(BaseModel):
    blood_pressure_sys: Optional[int] = None
    blood_pressure_dia: Optional[int] = None
    sugar: Optional[float] = None
    weight: Optional[float] = None
    heart_rate: Optional[int] = None
    notes: Optional[str] = ""

class PillReminderReq(BaseModel):
    medicine_name: str
    dose: str
    times_per_day: int = 1
    times: List[str]
    start_date: str
    end_date: Optional[str] = None

class VisualSearchReq(BaseModel):
    image_base64: str

class ScarcityReportReq(BaseModel):
    product_id: str
    pharmacy_id: str
    severity: str = "low"
    note: Optional[str] = ""

class ProductImageUpdate(BaseModel):
    image_slot: int = 1  # 1..5
    filename: str  # e.g. '234430_1.webp'

class ProductImageUploadRequest(BaseModel):
    product_id: str
    image_slot: int = 1
    content_type: str = 'image/webp'  # mime type
    filename: str  # desired filename


# ============================ HELPERS ============================
def now_utc():
    return datetime.now(timezone.utc).isoformat()

def hash_password(pw: str) -> str:
    return bcrypt.hashpw(pw.encode(), bcrypt.gensalt()).decode()

def verify_password(pw: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(pw.encode(), hashed.encode())
    except Exception:
        return False

def create_token(user_id: str, role: str, is_guest: bool = False) -> str:
    payload = {
        "user_id": user_id,
        "role": role,
        "is_guest": is_guest,
        "exp": datetime.now(timezone.utc) + timedelta(days=30)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGO)

def decode_token(token: str) -> dict:
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGO])
    except Exception:
        return {}

async def get_current_user(authorization: Optional[str] = Header(None)):
    if not authorization:
        return None
    token = authorization.replace("Bearer ", "").strip()
    payload = decode_token(token)
    if not payload:
        return None
    user = await db.users.find_one({"id": payload["user_id"]}, {"_id": 0, "password": 0})
    return user

async def require_user(authorization: Optional[str] = Header(None)):
    user = await get_current_user(authorization)
    if not user:
        raise HTTPException(401, "Unauthorized")
    return user

async def require_admin(authorization: Optional[str] = Header(None)):
    user = await require_user(authorization)
    if user.get("role") != "admin":
        raise HTTPException(403, "Admin only")
    return user

def clean_doc(doc):
    if doc is None:
        return None
    doc.pop("_id", None)
    doc.pop("password", None)
    return doc


# ============================ STARTUP / SEED ============================
@app.on_event("startup")
async def startup():
    await db.users.create_index("phone")
    await db.doctors.create_index("specialty")
    await db.products.create_index("category")
    if os.environ.get('NODE_ENV') == 'test' and os.environ.get('ALLOW_TEST_SEED') == 'true':
        await seed_test_data(db, now_utc)
        logger.info('Test seed completed because NODE_ENV=test and ALLOW_TEST_SEED=true')


# ============================ AUTH ============================
@api.post("/auth/guest")
async def guest_register(req: GuestRegisterReq):
    existing = await db.users.find_one({"phone": req.phone, "role": "guest"})
    if existing:
        token = create_token(existing["id"], "guest", True)
        return {"token": token, "user": clean_doc(existing)}
    user_id = str(uuid.uuid4())
    user = {
        "id": user_id,
        "full_name": f"زائر-{req.phone[-4:]}",
        "phone": req.phone,
        "role": "guest",
        "is_guest": True,
        "lat": req.lat, "lng": req.lng,
        "city": req.city, "district": req.district,
        "created_at": now_utc(),
        "active": True
    }
    await db.users.insert_one(user)
    token = create_token(user_id, "guest", True)
    return {"token": token, "user": clean_doc(user)}

@api.post("/auth/register")
async def register(req: UserRegisterReq):
    existing = await db.users.find_one({"phone": req.phone, "role": req.role})
    if existing and not existing.get("is_guest"):
        raise HTTPException(400, "User already exists")
    user_id = existing["id"] if existing else str(uuid.uuid4())
    user_doc = {
        "id": user_id,
        "full_name": req.full_name,
        "phone": req.phone,
        "email": req.email,
        "password": hash_password(req.password),
        "role": req.role,
        "is_guest": False,
        "created_at": now_utc(),
        "active": True,
        "verified": False
    }
    if existing:
        await db.users.update_one({"id": user_id}, {"$set": user_doc})
    else:
        await db.users.insert_one(user_doc)
    token = create_token(user_id, req.role, False)
    return {"token": token, "user": clean_doc(user_doc)}

@api.post("/auth/login")
async def login(req: LoginReq):
    user = await db.users.find_one({"phone": req.phone})
    if not user or user.get("is_guest"):
        raise HTTPException(401, "Invalid credentials")
    if not verify_password(req.password, user.get("password", "")):
        raise HTTPException(401, "Invalid credentials")
    token = create_token(user["id"], user["role"], False)
    return {"token": token, "user": clean_doc(user)}

@api.get("/auth/me")
async def me(user=Depends(require_user)):
    return user


# ============================ REFERENCE DATA ============================
@api.get("/ref/cities")
async def get_cities():
    return await db.cities.find({}, {"_id": 0}).to_list(200)

@api.get("/ref/specialties")
async def get_specialties():
    return await db.specialties.find({}, {"_id": 0}).to_list(200)

@api.get("/ref/insurance")
async def get_insurance():
    return await db.insurance_companies.find({}, {"_id": 0}).to_list(200)

@api.get("/ref/lab-tests")
async def get_lab_tests():
    return await db.lab_tests.find({}, {"_id": 0}).to_list(500)

@api.get("/ref/radiology")
async def get_radiology():
    return await db.radiology.find({}, {"_id": 0}).to_list(200)


# ============================ DOCTORS ============================
@api.get("/doctors")
async def list_doctors(
    specialty: Optional[str] = None,
    city: Optional[str] = None,
    mode: Optional[str] = None,
    search: Optional[str] = None,
    only_today: bool = False
):
    q: Dict[str, Any] = {"status": "active"}
    if specialty:
        q["specialty"] = specialty
    if city:
        q["city"] = city
    if mode:
        q["consultation_modes"] = mode
    if only_today:
        q["available_today"] = True
    docs = await db.doctors.find(q, {"_id": 0}).to_list(500)
    if search:
        s = search.lower()
        docs = [d for d in docs if s in (d.get("full_name_ar", "") + d.get("full_name_en", "") + d.get("specialty", "")).lower()]
    return docs

@api.get("/doctors/{doctor_id}")
async def get_doctor(doctor_id: str):
    doc = await db.doctors.find_one({"id": doctor_id}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "Doctor not found")
    doc["reviews"] = await db.reviews.find(
        {"target_id": doctor_id, "is_approved": True}, {"_id": 0}
    ).sort("created_at", -1).to_list(50)
    return doc

@api.post("/doctors/onboarding")
async def doctor_onboarding(req: DoctorOnboardingReq):
    doctor_id = str(uuid.uuid4())
    user_doc = {
        "id": doctor_id,
        "full_name": req.full_name_ar,
        "phone": req.phone,
        "email": req.email,
        "password": hash_password(req.password),
        "role": "doctor",
        "created_at": now_utc(),
        "active": False,
        "verified": False
    }
    doctor_doc = {
        "id": doctor_id,
        "full_name_ar": req.full_name_ar,
        "full_name_en": req.full_name_en or req.full_name_ar,
        "phone": req.phone,
        "email": req.email,
        "specialty": req.specialty,
        "sub_specialties": req.sub_specialties,
        "credentials": req.credentials,
        "title": req.title,
        "city": req.city, "district": req.district,
        "hospital": req.hospital,
        "avatar": req.avatar_base64,
        "license_pdf": req.license_pdf_base64,
        "consultation_modes": req.consultation_modes,
        "price_clinic": req.price_clinic,
        "price_online": req.price_online,
        "price_home": req.price_home,
        "lat": req.lat, "lng": req.lng,
        "rating": 0, "reviews_count": 0,
        "license_verified": False,
        "status": "pending_approval",
        "created_at": now_utc()
    }
    await db.users.insert_one(user_doc)
    await db.doctors.insert_one(doctor_doc)
    return {"ok": True, "doctor_id": doctor_id, "status": "pending_approval"}


# ============================ PHARMACIES & PRODUCTS ============================
@api.get("/pharmacies")
async def list_pharmacies(city: Optional[str] = None):
    q: Dict[str, Any] = {"status": "active"}
    if city:
        q["city"] = city
    return await db.pharmacies.find(q, {"_id": 0}).to_list(200)

def format_pharmacy_product(p: Dict[str, Any], lang: str = "ar") -> Dict[str, Any]:
    translations = p.get("translations", {})
    lang_t = translations.get(lang, {})
    ar_t = translations.get("ar", {})
    en_t = translations.get("en", {})
    
    res = {
        "id": str(p.get("productId", "")),
        "productId": p.get("productId"),
        "barcode": p.get("barcode"),
        "price": p.get("price"),
        "old_price": p.get("old_price"),
        "is_rx": p.get("is_rx", False),
        "available_online": p.get("available_online", True),
        "has_exclusive_online_label": p.get("has_exclusive_online_label"),
        "drugs_com_link": p.get("drugs_com_link"),
        "sfda_link": p.get("sfda_link"),
        "image_1": p.get("image_1"),
        "image_2": p.get("image_2"),
        "image_3": p.get("image_3"),
        "image_4": p.get("image_4"),
        "image_5": p.get("image_5"),
        "translations": translations
    }
    
    fields = [
        "name", "main_category", "sub_category", "sub_sub_category",
        "active_ingredient", "dosage_form", "strength", "size_volume",
        "indications_uses", "dosage_instructions", "side_effects",
        "warnings_precautions", "storage_conditions", "how_to_use",
        "package_content_details", "skin_hair_type", "color_shade",
        "brand_benefits", "country_of_origin", "more_information"
    ]
    for f in fields:
        val = lang_t.get(f) or ar_t.get(f) or en_t.get(f)
        if val is not None:
            res[f] = val
            
    return res

@api.get("/products")
async def list_products(category: Optional[str] = None, search: Optional[str] = None, lang: str = "ar", limit: int = 100):
    db_lang = "tl" if lang == "fil" else lang
    q: Dict[str, Any] = {}
    if category:
        q["$or"] = [
            {f"translations.{db_lang}.main_category": category},
            {"translations.ar.main_category": category},
            {"translations.en.main_category": category}
        ]
    if search:
        s_regex = {"$regex": search, "$options": "i"}
        q_search = [
            {f"translations.{db_lang}.name": s_regex},
            {"translations.ar.name": s_regex},
            {"translations.en.name": s_regex},
            {f"translations.{db_lang}.active_ingredient": s_regex},
            {"translations.ar.active_ingredient": s_regex},
            {"translations.en.active_ingredient": s_regex},
            {"barcode": search}
        ]
        if search.isdigit():
            q_search.append({"productId": int(search)})
        q_search.append({"productId": search})
        
        if q.get("$or"):
            q = {"$and": [q, {"$or": q_search}]}
        else:
            q["$or"] = q_search

    limit = min(limit, 200)
    cursor = db.pharmacy_products.find(q).limit(limit)
    raw_products = await cursor.to_list(limit)
    return [format_pharmacy_product(p, db_lang) for p in raw_products]

@api.get("/products/scarcity/all")
async def get_scarcity_alerts():
    return await db.scarcity.find({}, {"_id": 0}).sort("created_at", -1).to_list(50)

@api.post("/products/scarcity")
async def report_scarcity(req: ScarcityReportReq, user=Depends(require_user)):
    doc = {
        "id": str(uuid.uuid4()),
        "product_id": req.product_id,
        "pharmacy_id": req.pharmacy_id,
        "severity": req.severity,
        "note": req.note,
        "reported_by": user["id"],
        "created_at": now_utc()
    }
    await db.scarcity.insert_one(doc)
    clean_doc(doc)
    return doc

@api.get("/products/{product_id}")
async def get_product(product_id: str, lang: str = "ar"):
    db_lang = "tl" if lang == "fil" else lang
    q = {"productId": product_id}
    if product_id.isdigit():
        q = {"$or": [{"productId": product_id}, {"productId": int(product_id)}]}
    p = await db.pharmacy_products.find_one(q)
    if not p:
        p_seed = await db.products.find_one({"id": product_id})
        if p_seed:
            return p_seed
        raise HTTPException(404, "Product not found")
    return format_pharmacy_product(p, db_lang)

@api.get("/products/{product_id}/alternatives")
async def get_alternatives(product_id: str, lang: str = "ar"):
    db_lang = "tl" if lang == "fil" else lang
    q = {"productId": product_id}
    if product_id.isdigit():
        q = {"$or": [{"productId": product_id}, {"productId": int(product_id)}]}
    p = await db.pharmacy_products.find_one(q)
    if not p:
        p_seed = await db.products.find_one({"id": product_id})
        if not p_seed:
            return []
        ai = p_seed.get("active_ingredient", "")
        if not ai:
            return []
        return await db.products.find(
            {"active_ingredient": ai, "id": {"$ne": product_id}}, {"_id": 0}
        ).to_list(50)
        
    active_ingredient = None
    translations = p.get("translations", {})
    for t_lang in [db_lang, "ar", "en", "ur", "hi", "bn", "tl"]:
        ai = translations.get(t_lang, {}).get("active_ingredient")
        if ai:
            active_ingredient = ai
            break
            
    if not active_ingredient:
        return []
        
    ai_escaped = active_ingredient.strip().replace("(", "\\(").replace(")", "\\)")
    ai_regex = {"$regex": f"^{ai_escaped}$", "$options": "i"}
    alt_q = {
        "$and": [
            {"productId": {"$ne": p["productId"]}},
            {"$or": [
                {f"translations.{db_lang}.active_ingredient": ai_regex},
                {"translations.ar.active_ingredient": ai_regex},
                {"translations.en.active_ingredient": ai_regex}
            ]}
        ]
    }
    cursor = db.pharmacy_products.find(alt_q).limit(20)
    raw_alts = await cursor.to_list(20)
    return [format_pharmacy_product(a, db_lang) for a in raw_alts]


# ============================ VISUAL SEARCH ============================
@api.post("/products/visual-search")
async def visual_search(req: VisualSearchReq):
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage, ImageContent
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"vs-{uuid.uuid4()}",
            system_message=(
                "You are a pharmaceutical expert. The user sends a photo of medicine box, "
                "prescription, or pharma product. Respond ONLY in JSON: "
                "{\"name\": \"<name>\", \"active_ingredient\": \"<scientific name>\", "
                "\"category\": \"medications|skincare|haircare|babycare\", "
                "\"description\": \"<short Arabic description>\", \"confidence\": 0.0-1.0}"
            )
        ).with_model("openai", "gpt-4o-mini")

        b64 = req.image_base64
        if b64.startswith("data:"):
            b64 = b64.split(",", 1)[1]

        msg = UserMessage(
            text="حلل هذه الصورة وحدد الدواء أو المنتج الطبي.",
            file_contents=[ImageContent(image_base64=b64)]
        )
        response = await chat.send_message(msg)

        import json, re
        match = re.search(r'\{[\s\S]*\}', response)
        data = {"name": "غير معروف", "active_ingredient": "", "confidence": 0}
        if match:
            try:
                data = json.loads(match.group(0))
            except Exception:
                pass

        matches = []
        name = data.get("name", "")
        ai = data.get("active_ingredient", "")
        if name or ai:
            all_prods = await db.products.find({}, {"_id": 0}).to_list(500)
            scored = []
            for p in all_prods:
                score = 0
                pn = (p.get("name_ar", "") + " " + p.get("name_en", "")).lower()
                pai = p.get("active_ingredient", "").lower()
                if name and name.lower() in pn:
                    score += 2
                if ai and ai.lower() in pai:
                    score += 3
                if score > 0:
                    scored.append((score, p))
            scored.sort(key=lambda x: -x[0])
            matches = [m[1] for m in scored[:10]]

        return {"identified": data, "matches": matches}
    except Exception as e:
        logger.exception("Visual search failed")
        raise HTTPException(500, f"Visual search failed: {str(e)}")


# ============================ APPOINTMENTS ============================
@api.post("/appointments")
async def create_appointment(req: AppointmentReq, user=Depends(require_user)):
    if user.get("is_guest") and req.insurance_id:
        raise HTTPException(403, "Insurance services require a registered medical profile")
    doctor = await db.doctors.find_one({"id": req.doctor_id})
    if not doctor:
        raise HTTPException(404, "Doctor not found")
    price = doctor.get(f"price_{req.mode}", 0)
    appt_id = str(uuid.uuid4())
    doc = {
        "id": appt_id,
        "patient_id": user["id"],
        "patient_name": user.get("full_name"),
        "patient_phone": user.get("phone"),
        "doctor_id": req.doctor_id,
        "doctor_name": doctor.get("full_name_ar"),
        "mode": req.mode,
        "date": req.date,
        "time": req.time,
        "notes": req.notes,
        "insurance_id": req.insurance_id,
        "price": price,
        "status": "scheduled",
        "is_active": True,
        "created_at": now_utc(),
        "auto_close_at": None
    }
    await db.appointments.insert_one(doc)
    clean_doc(doc)
    return doc

@api.get("/appointments/mine")
async def my_appointments(user=Depends(require_user)):
    if user.get("role") == "doctor":
        q = {"doctor_id": user["id"]}
    else:
        q = {"patient_id": user["id"]}
    return await db.appointments.find(q, {"_id": 0}).sort("created_at", -1).to_list(200)

@api.post("/appointments/{appt_id}/complete")
async def complete_appointment(appt_id: str, user=Depends(require_user)):
    appt = await db.appointments.find_one({"id": appt_id})
    if not appt:
        raise HTTPException(404, "Not found")
    close_at = (datetime.now(timezone.utc) + timedelta(minutes=30)).isoformat()
    await db.appointments.update_one(
        {"id": appt_id},
        {"$set": {"status": "completed", "auto_close_at": close_at}}
    )
    # Wire 30-min auto-close into chat room (room id = appointment id)
    await db.chat_rooms.update_one(
        {"id": appt_id},
        {"$set": {"auto_close_at": close_at, "is_active": False},
         "$setOnInsert": {"participants": [appt["patient_id"], appt["doctor_id"]], "created_at": now_utc()}},
        upsert=True
    )
    return {"ok": True, "auto_close_at": close_at}


# ============================ ORDERS ============================
@api.post("/orders")
async def create_order(req: OrderReq, user=Depends(require_user)):
    if user.get("is_guest") and req.payment_method == "insurance":
        raise HTTPException(403, "Insurance services require a registered medical profile")
    total = 0
    items_data = []
    for it in req.items:
        p = await db.products.find_one({"id": it.product_id})
        if not p:
            continue
        total += p["price"] * it.qty
        items_data.append({
            "product_id": it.product_id,
            "name_ar": p.get("name_ar"),
            "price": p.get("price"),
            "qty": it.qty
        })
    order_id = str(uuid.uuid4())
    doc = {
        "id": order_id,
        "user_id": user["id"],
        "user_phone": user.get("phone"),
        "pharmacy_id": req.pharmacy_id,
        "items": items_data,
        "total": total,
        "payment_method": req.payment_method,
        "insurance_id": req.insurance_id,
        "delivery_address": req.delivery_address,
        "prescription_image_base64": req.prescription_image_base64,
        "status": "pending",
        "is_active": True,
        "created_at": now_utc()
    }
    await db.orders.insert_one(doc)
    clean_doc(doc)
    return doc

@api.get("/orders/mine")
async def my_orders(user=Depends(require_user)):
    return await db.orders.find({"user_id": user["id"]}, {"_id": 0}).sort("created_at", -1).to_list(200)


# ============================ CHAT ============================
class ConnectionManager:
    def __init__(self):
        self.active: Dict[str, List[WebSocket]] = {}
    async def connect(self, ws: WebSocket, room: str):
        await ws.accept()
        self.active.setdefault(room, []).append(ws)
    def disconnect(self, ws: WebSocket, room: str):
        if room in self.active:
            try:
                self.active[room].remove(ws)
            except ValueError:
                pass
    async def broadcast(self, room: str, message: dict):
        for ws in self.active.get(room, []):
            try:
                await ws.send_json(message)
            except Exception:
                pass

manager = ConnectionManager()

@api.get("/chats/{room_id}/messages")
async def get_messages(room_id: str, user=Depends(require_user)):
    msgs = await db.chat_messages.find({"room_id": room_id}, {"_id": 0}).sort("created_at", 1).to_list(500)
    room = await db.chat_rooms.find_one({"id": room_id})
    is_active = True
    if room and room.get("auto_close_at"):
        close_at = datetime.fromisoformat(room["auto_close_at"])
        if datetime.now(timezone.utc) > close_at:
            is_active = False
    return {"messages": msgs, "is_active": is_active}

@api.post("/chats/{room_id}/messages")
async def send_message(room_id: str, req: ChatMessageReq, user=Depends(require_user)):
    room = await db.chat_rooms.find_one({"id": room_id})
    if not room:
        await db.chat_rooms.insert_one({
            "id": room_id, "participants": [user["id"]],
            "is_active": True, "created_at": now_utc()
        })
    elif room.get("auto_close_at"):
        close_at = datetime.fromisoformat(room["auto_close_at"])
        if datetime.now(timezone.utc) > close_at:
            raise HTTPException(403, "Chat is closed")

    msg = {
        "id": str(uuid.uuid4()),
        "room_id": room_id,
        "sender_id": user["id"],
        "sender_name": user.get("full_name"),
        "text": req.text,
        "image_base64": req.image_base64,
        "voice_base64": req.voice_base64,
        "created_at": now_utc()
    }
    await db.chat_messages.insert_one(msg)
    clean_doc(msg)
    await manager.broadcast(room_id, msg)
    return msg

@app.websocket("/api/ws/chat/{room_id}")
async def chat_ws(websocket: WebSocket, room_id: str):
    await manager.connect(websocket, room_id)
    try:
        while True:
            data = await websocket.receive_json()
            await manager.broadcast(room_id, data)
    except WebSocketDisconnect:
        manager.disconnect(websocket, room_id)


# ============================ HEALTH PASSPORT ============================
@api.get("/health-passport")
async def get_passport(user=Depends(require_user)):
    if user.get("is_guest"):
        raise HTTPException(403, "Health Passport requires registered profile")
    doc = await db.health_passport.find_one({"user_id": user["id"]}, {"_id": 0})
    if not doc:
        doc = {
            "id": str(uuid.uuid4()),
            "user_id": user["id"],
            "age": None, "gender": None, "blood_type": None,
            "allergies": [], "chronic_diseases": [],
            "vitals_log": [], "medications": [],
            "created_at": now_utc()
        }
        await db.health_passport.insert_one(doc)
        clean_doc(doc)
    return doc

@api.post("/health-passport/vitals")
async def add_vitals(req: VitalsReq, user=Depends(require_user)):
    entry = {"id": str(uuid.uuid4()), "ts": now_utc(), **req.model_dump(exclude_none=True)}
    await db.health_passport.update_one(
        {"user_id": user["id"]},
        {"$push": {"vitals_log": entry}, "$setOnInsert": {"created_at": now_utc()}},
        upsert=True
    )
    return entry

@api.post("/health-passport/update")
async def update_passport(data: Dict[str, Any], user=Depends(require_user)):
    allowed = ["age", "gender", "blood_type", "allergies", "chronic_diseases"]
    update = {k: v for k, v in data.items() if k in allowed}
    await db.health_passport.update_one(
        {"user_id": user["id"]},
        {"$set": update, "$setOnInsert": {"created_at": now_utc()}},
        upsert=True
    )
    return {"ok": True}


# ============================ PILL REMINDERS ============================
@api.get("/reminders")
async def list_reminders(user=Depends(require_user)):
    return await db.reminders.find({"user_id": user["id"]}, {"_id": 0}).to_list(200)

@api.post("/reminders")
async def add_reminder(req: PillReminderReq, user=Depends(require_user)):
    doc = {
        "id": str(uuid.uuid4()),
        "user_id": user["id"],
        "active": True,
        "created_at": now_utc(),
        **req.model_dump()
    }
    await db.reminders.insert_one(doc)
    clean_doc(doc)
    return doc

@api.delete("/reminders/{rid}")
async def delete_reminder(rid: str, user=Depends(require_user)):
    await db.reminders.delete_one({"id": rid, "user_id": user["id"]})
    return {"ok": True}


# ============================ REVIEWS ============================
@api.post("/reviews")
async def add_review(req: ReviewReq, user=Depends(require_user)):
    is_approved = req.rating >= 4
    doc = {
        "id": str(uuid.uuid4()),
        "user_id": user["id"],
        "user_name": user.get("full_name"),
        "target_type": req.target_type,
        "target_id": req.target_id,
        "rating": req.rating,
        "comment": req.comment,
        "is_approved": is_approved,
        "created_at": now_utc()
    }
    await db.reviews.insert_one(doc)
    clean_doc(doc)
    if is_approved and req.target_type == "doctor":
        revs = await db.reviews.find({"target_id": req.target_id, "is_approved": True}).to_list(1000)
        avg = sum(r["rating"] for r in revs) / len(revs)
        await db.doctors.update_one(
            {"id": req.target_id},
            {"$set": {"rating": round(avg, 1), "reviews_count": len(revs)}}
        )
    return doc

@api.get("/reviews/pending")
async def pending_reviews(user=Depends(require_admin)):
    return await db.reviews.find({"is_approved": False}, {"_id": 0}).to_list(200)

@api.post("/reviews/{rid}/approve")
async def approve_review(rid: str, user=Depends(require_admin)):
    await db.reviews.update_one({"id": rid}, {"$set": {"is_approved": True}})
    return {"ok": True}

@api.delete("/reviews/{rid}")
async def reject_review(rid: str, user=Depends(require_admin)):
    await db.reviews.delete_one({"id": rid})
    return {"ok": True}


# ============================ TICKETS ============================
@api.post("/tickets")
async def create_ticket(req: ContactTicketReq):
    priority_map = {"technical_support": "high", "provider_signup": "medium", "feature_suggestion": "low"}
    doc = {
        "id": str(uuid.uuid4()),
        "name": req.name,
        "phone": req.phone,
        "category": req.category,
        "subject": req.subject,
        "message": req.message,
        "priority": priority_map.get(req.category, "low"),
        "status": "open",
        "created_at": now_utc()
    }
    await db.tickets.insert_one(doc)
    clean_doc(doc)
    return doc

@api.get("/tickets")
async def list_tickets(user=Depends(require_admin)):
    return await db.tickets.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)


# ============================ ADMIN ============================
@api.get("/admin/stats")
async def admin_stats(user=Depends(require_admin)):
    completed_orders = await db.orders.find({"status": {"$in": ["completed", "delivered"]}}).to_list(10000)
    return {
        "total_patients": await db.users.count_documents({"role": "patient"}),
        "total_guests": await db.users.count_documents({"role": "guest"}),
        "total_doctors": await db.doctors.count_documents({}),
        "pending_doctors": await db.doctors.count_documents({"status": "pending_approval"}),
        "total_pharmacies": await db.pharmacies.count_documents({}),
        "total_appointments": await db.appointments.count_documents({}),
        "total_orders": await db.orders.count_documents({}),
        "total_revenue": sum([o["total"] for o in completed_orders]),
        "open_tickets": await db.tickets.count_documents({"status": "open"}),
        "pending_reviews": await db.reviews.count_documents({"is_approved": False})
    }

@api.get("/admin/users")
async def admin_users(role: Optional[str] = None, user=Depends(require_admin)):
    q = {"role": role} if role else {}
    return await db.users.find(q, {"_id": 0, "password": 0}).to_list(1000)

@api.get("/admin/doctors")
async def admin_doctors(status: Optional[str] = None, user=Depends(require_admin)):
    q = {"status": status} if status else {}
    return await db.doctors.find(q, {"_id": 0}).to_list(500)

@api.post("/admin/doctors/{doctor_id}/verify")
async def verify_doctor(doctor_id: str, user=Depends(require_admin)):
    await db.doctors.update_one({"id": doctor_id}, {"$set": {"status": "active", "license_verified": True}})
    await db.users.update_one({"id": doctor_id}, {"$set": {"active": True, "verified": True}})
    return {"ok": True}

@api.post("/admin/doctors/{doctor_id}/reject")
async def reject_doctor(doctor_id: str, user=Depends(require_admin)):
    await db.doctors.update_one({"id": doctor_id}, {"$set": {"status": "rejected"}})
    return {"ok": True}

@api.get("/admin/orders")
async def admin_orders(user=Depends(require_admin)):
    return await db.orders.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)

@api.post("/admin/orders/{order_id}/status")
async def update_order_status(order_id: str, data: Dict[str, Any], user=Depends(require_admin)):
    status = data.get("status", "pending")
    await db.orders.update_one({"id": order_id}, {"$set": {"status": status, "updated_at": now_utc()}})
    return {"ok": True}

@api.delete("/admin/users/{user_id}")
async def admin_delete_user(user_id: str, user=Depends(require_admin)):
    if user_id == user["id"]:
        raise HTTPException(400, "Cannot delete yourself")
    await db.users.delete_one({"id": user_id})
    return {"ok": True}

@api.post("/admin/users/{user_id}/toggle")
async def admin_toggle_user(user_id: str, user=Depends(require_admin)):
    u = await db.users.find_one({"id": user_id})
    if not u:
        raise HTTPException(404, "Not found")
    new_active = not u.get("active", True)
    await db.users.update_one({"id": user_id}, {"$set": {"active": new_active}})
    return {"ok": True, "active": new_active}

@api.get("/admin/appointments")
async def admin_appointments(user=Depends(require_admin)):
    return await db.appointments.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)


# ============================ ADMIN - PRODUCTS CRUD ============================
@api.get("/admin/products")
async def admin_products(user=Depends(require_admin), search: Optional[str] = None):
    q: Dict[str, Any] = {}
    if search:
        q["$or"] = [
            {"name_ar": {"$regex": search, "$options": "i"}},
            {"name_en": {"$regex": search, "$options": "i"}},
            {"active_ingredient": {"$regex": search, "$options": "i"}},
        ]
    return await db.products.find(q, {"_id": 0}).sort("name_ar", 1).to_list(1000)

@api.post("/admin/products")
async def admin_create_product(data: Dict[str, Any], user=Depends(require_admin)):
    pid = str(uuid.uuid4())
    p = {
        "id": pid,
        "name_ar": data.get("name_ar", ""),
        "name_en": data.get("name_en", ""),
        "category": data.get("category", "medications"),
        "active_ingredient": data.get("active_ingredient", ""),
        "price": float(data.get("price", 0)),
        "in_stock": bool(data.get("in_stock", True)),
        "image": data.get("image", ""),
        "description_ar": data.get("description_ar", ""),
        "manufacturer": data.get("manufacturer", ""),
        "created_at": now_utc(),
    }
    await db.products.insert_one(p)
    return {"ok": True, "id": pid}

@api.patch("/admin/products/{product_id}")
async def admin_update_product(product_id: str, data: Dict[str, Any], user=Depends(require_admin)):
    update = {k: v for k, v in data.items() if k in ["name_ar", "name_en", "category", "active_ingredient", "price", "in_stock", "image", "description_ar", "manufacturer"]}
    await db.products.update_one({"id": product_id}, {"$set": update})
    return {"ok": True}

@api.delete("/admin/products/{product_id}")
async def admin_delete_product(product_id: str, user=Depends(require_admin)):
    await db.products.delete_one({"id": product_id})
    return {"ok": True}


# ==================== ADMIN - PHARMACY PRODUCT IMAGE MANAGEMENT ====================

@api.get("/admin/pharmacy-products")
async def admin_pharmacy_products(user=Depends(require_admin), search: Optional[str] = None, limit: int = 100):
    """List pharmacy_products for admin management"""
    q: Dict[str, Any] = {}
    if search:
        q["$or"] = [
            {"name.ar": {"$regex": search, "$options": "i"}},
            {"name.en": {"$regex": search, "$options": "i"}},
        ]
    cursor = db.pharmacy_products.find(q, {"_id": 0}).limit(limit)
    products = await cursor.to_list(limit)
    return [format_pharmacy_product(p, 'ar') for p in products]

@api.patch("/admin/pharmacy-products/{product_id}/images")
async def admin_update_pharmacy_product_images(
    product_id: str,
    data: Dict[str, Any],
    user=Depends(require_admin)
):
    """
    Update image_1..5 filenames for a pharmacy_product.
    data can contain: image_1, image_2, image_3, image_4, image_5 (filenames)
    """
    allowed = {f"image_{i}": v for i, v in [(j, data.get(f"image_{j}")) for j in range(1, 6)] if v is not None}
    if not allowed:
        raise HTTPException(status_code=400, detail="No valid image fields provided")
    q = {"productId": product_id}
    if str(product_id).isdigit():
        q = {"$or": [{"productId": product_id}, {"productId": int(product_id)}]}
    result = await db.pharmacy_products.update_one(q, {"$set": allowed})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Product not found")
    return {"ok": True, "updated": allowed}

@api.delete("/admin/pharmacy-products/{product_id}/images/{slot}")
async def admin_delete_pharmacy_product_image(
    product_id: str,
    slot: int,
    user=Depends(require_admin)
):
    """
    Delete image from R2 and remove from MongoDB.
    slot: 1..5
    """
    if slot < 1 or slot > 5:
        raise HTTPException(status_code=400, detail="slot must be 1..5")
    field = f"image_{slot}"
    q = {"productId": product_id}
    if str(product_id).isdigit():
        q = {"$or": [{"productId": product_id}, {"productId": int(product_id)}]}
    product = await db.pharmacy_products.find_one(q, {"_id": 0, field: 1})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    filename = product.get(field)
    if filename:
        try:
            r2 = get_r2_client()
            r2.delete_object(Bucket=R2_BUCKET, Key=filename)
        except Exception as e:
            print(f"R2 delete error: {e}")
    await db.pharmacy_products.update_one(q, {"$unset": {field: ""}})
    return {"ok": True, "deleted": filename}

@api.post("/admin/pharmacy-products/{product_id}/images/presigned")
async def admin_presigned_upload(
    product_id: str,
    body: Dict[str, Any],
    user=Depends(require_admin)
):
    """
    Generate a presigned PUT URL so the admin frontend can upload directly to R2.
    body: { slot: 1..5, content_type: 'image/webp', filename: 'myfile.webp' }
    Returns: { presigned_url, filename, public_url }
    """
    slot = int(body.get("slot", 1))
    content_type = body.get("content_type", "image/webp")
    filename = body.get("filename") or f"{product_id}_img_{slot}.webp"
    if slot < 1 or slot > 5:
        raise HTTPException(status_code=400, detail="slot must be 1..5")
    try:
        r2 = get_r2_client()
        presigned_url = r2.generate_presigned_url(
            'put_object',
            Params={'Bucket': R2_BUCKET, 'Key': filename, 'ContentType': content_type},
            ExpiresIn=900,  # 15 minutes
        )
        return {
            "ok": True,
            "presigned_url": presigned_url,
            "filename": filename,
            "public_url": f"{R2_PUBLIC_URL}/{filename}",
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api.post("/admin/pharmacy-products/{product_id}/images/upload")
async def admin_upload_image_direct(
    product_id: str,
    slot: int,
    file: UploadFile,
    user=Depends(require_admin)
):
    """
    Direct multipart upload to R2, then update DB.
    """
    if slot < 1 or slot > 5:
        raise HTTPException(status_code=400, detail="slot must be 1..5")
    ext = file.filename.rsplit('.', 1)[-1] if '.' in file.filename else 'webp'
    filename = f"{product_id}_img_{slot}.{ext}"
    content = await file.read()
    try:
        r2 = get_r2_client()
        r2.put_object(Bucket=R2_BUCKET, Key=filename, Body=content, ContentType=file.content_type or 'image/webp')
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"R2 upload failed: {e}")
    # Update DB
    field = f"image_{slot}"
    q = {"productId": product_id}
    if str(product_id).isdigit():
        q = {"$or": [{"productId": product_id}, {"productId": int(product_id)}]}
    await db.pharmacy_products.update_one(q, {"$set": {field: filename}}, upsert=False)
    return {
        "ok": True,
        "filename": filename,
        "public_url": f"{R2_PUBLIC_URL}/{filename}",
        "slot": slot,
    }


# ============================ ADMIN - SETTINGS / COMMISSION ============================
DEFAULT_SETTINGS = {
    "commission_doctor": 15.0,     # %
    "commission_pharmacy": 8.0,    # %
    "commission_lab": 10.0,        # %
    "delivery_fee": 15.0,          # SAR
    "delivery_radius_km": 5,
    "tax_rate": 0.0,
    "chat_auto_close_minutes": 30,
    "support_phone": "+966500000000",
    "support_email": "support@nabd.app",
}

@api.get("/admin/settings")
async def admin_settings(user=Depends(require_admin)):
    s = await db.settings.find_one({"id": "global"}, {"_id": 0})
    if not s:
        s = {"id": "global", **DEFAULT_SETTINGS}
        await db.settings.insert_one(s)
        s.pop("_id", None)
    return s

@api.post("/admin/settings")
async def update_settings(data: Dict[str, Any], user=Depends(require_admin)):
    update = {k: v for k, v in data.items() if k in DEFAULT_SETTINGS}
    await db.settings.update_one({"id": "global"}, {"$set": update}, upsert=True)
    return {"ok": True}


# ============================ CLINICS / HOSPITALS ============================
@api.get("/clinics")
async def list_clinics():
    """Group doctors by hospital/clinic name and return as virtual clinic list"""
    pipeline = [
        {"$match": {"hospital": {"$nin": [None, ""]}, "status": "active"}},
        {"$group": {
            "_id": "$hospital",
            "doctors_count": {"$sum": 1},
            "city": {"$first": "$city"},
            "district": {"$first": "$district"},
            "avg_rating": {"$avg": "$rating"},
            "specialties": {"$addToSet": "$specialty"},
            "sample_avatar": {"$first": "$avatar"},
        }},
        {"$sort": {"doctors_count": -1}}
    ]
    rows = await db.doctors.aggregate(pipeline).to_list(200)
    return [
        {
            "id": (r["_id"] or "").replace(" ", "-"),
            "name": r["_id"],
            "doctors_count": r["doctors_count"],
            "city": r.get("city"),
            "district": r.get("district"),
            "rating": round(r.get("avg_rating") or 0, 1),
            "specialties": r.get("specialties", []),
            "image": r.get("sample_avatar"),
        }
        for r in rows
    ]

@api.get("/clinics/{clinic_slug}")
async def clinic_detail(clinic_slug: str):
    name = clinic_slug.replace("-", " ")
    docs = await db.doctors.find({"hospital": name, "status": "active"}, {"_id": 0}).to_list(200)
    if not docs:
        # Maybe a regex match
        docs = await db.doctors.find({"hospital": {"$regex": f"^{name}$", "$options": "i"}, "status": "active"}, {"_id": 0}).to_list(200)
    if not docs:
        raise HTTPException(404, "Clinic not found")
    specs = list({d["specialty"] for d in docs})
    avg_rating = sum(d.get("rating", 0) for d in docs) / max(len(docs), 1)
    return {
        "name": docs[0].get("hospital"),
        "city": docs[0].get("city"),
        "district": docs[0].get("district"),
        "rating": round(avg_rating, 1),
        "doctors_count": len(docs),
        "specialties": specs,
        "doctors": docs,
    }


# ============================ NOTIFICATIONS ============================
class NotifReq(BaseModel):
    user_id: Optional[str] = None
    role: Optional[str] = None  # 'all' | 'patient' | 'doctor' | 'admin'
    title: str
    body: str
    type: str = "info"  # info | appointment | order | promo | alert

@api.get("/notifications")
async def list_notifications(user=Depends(get_current_user)):
    if not user:
        raise HTTPException(401, "Login required")
    items = await db.notifications.find({
        "$or": [
            {"user_id": user["id"]},
            {"role": user.get("role")},
            {"role": "all"},
        ]
    }, {"_id": 0}).sort("created_at", -1).to_list(200)
    return items

@api.post("/notifications/{notif_id}/read")
async def mark_notif_read(notif_id: str, user=Depends(get_current_user)):
    if not user:
        raise HTTPException(401, "Login required")
    await db.notifications.update_one({"id": notif_id}, {"$addToSet": {"read_by": user["id"]}})
    return {"ok": True}

@api.post("/notifications/read-all")
async def mark_all_read(user=Depends(get_current_user)):
    if not user:
        raise HTTPException(401, "Login required")
    await db.notifications.update_many({
        "$or": [{"user_id": user["id"]}, {"role": user.get("role")}, {"role": "all"}]
    }, {"$addToSet": {"read_by": user["id"]}})
    return {"ok": True}

@api.post("/admin/notifications")
async def admin_send_notification(data: NotifReq, user=Depends(require_admin)):
    n = {
        "id": str(uuid.uuid4()),
        "user_id": data.user_id,
        "role": data.role,
        "title": data.title,
        "body": data.body,
        "type": data.type,
        "created_at": now_utc(),
        "read_by": [],
    }
    await db.notifications.insert_one(n)
    return {"ok": True, "id": n["id"]}


# ============================ AI SYMPTOM TRIAGE ============================
class TriageReq(BaseModel):
    symptoms: str
    age: Optional[int] = None
    gender: Optional[str] = None

@api.post("/ai/triage")
async def ai_triage(req: TriageReq):
    """Suggest medical specialty based on symptoms using Emergent LLM"""
    if not EMERGENT_LLM_KEY:
        # Fallback: simple keyword matching
        s = req.symptoms.lower()
        rules = [
            (["قلب", "صدر", "خفقان", "نبضات", "heart", "chest"], "أمراض القلب"),
            (["جلد", "حبوب", "بثور", "حساسية الجلد", "skin", "acne"], "الجلدية"),
            (["أسنان", "ضرس", "لثة", "tooth", "teeth"], "الأسنان"),
            (["عيون", "بصر", "نظر", "eye"], "العيون"),
            (["مفاصل", "ركبة", "ظهر", "عظام", "bone", "knee"], "العظام"),
            (["معدة", "بطن", "إسهال", "هضم", "stomach"], "الجهاز الهضمي"),
            (["أنف", "أذن", "حلق", "ent"], "أنف وأذن وحنجرة"),
            (["طفل", "رضيع", "child", "baby"], "أطفال"),
            (["نساء", "حمل", "ولادة", "gyno"], "نساء وولادة"),
            (["رأس", "صداع", "دوار", "head"], "المخ والأعصاب"),
            (["نفسي", "اكتئاب", "قلق", "psych"], "الطب النفسي"),
        ]
        suggestions = []
        for keys, spec in rules:
            if any(k in s for k in keys):
                suggestions.append(spec)
        if not suggestions:
            suggestions = ["باطنة عامة"]
        return {
            "ok": True,
            "specialty_suggestions": suggestions[:3],
            "reasoning": "بناءً على الأعراض المذكورة، ننصح بزيارة هذه التخصصات",
            "urgency": "routine",
            "ai_source": "fallback_keyword",
        }
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"triage-{uuid.uuid4()}",
            system_message=(
                "أنت طبيب فرز ذكي. بناءً على الأعراض، اقترح أنسب التخصصات الطبية من القائمة التالية فقط: "
                + ", ".join([s["ar"] for s in SPECIALTIES])
                + ". أعد الإجابة كـ JSON بهذا الشكل دون أي نص آخر: "
                + '{"specialties":["تخصص1","تخصص2"],"reasoning":"شرح موجز","urgency":"routine|urgent|emergency"}'
            ),
        ).with_model("openai", "gpt-4o-mini")
        msg = UserMessage(text=f"العمر: {req.age or 'غير محدد'}\nالجنس: {req.gender or 'غير محدد'}\nالأعراض: {req.symptoms}")
        result = await chat.send_message(msg)
        import json, re
        text = result.strip()
        # Extract JSON
        m = re.search(r'\{[\s\S]*\}', text)
        if m:
            data = json.loads(m.group(0))
            return {
                "ok": True,
                "specialty_suggestions": data.get("specialties", [])[:3],
                "reasoning": data.get("reasoning", ""),
                "urgency": data.get("urgency", "routine"),
                "ai_source": "openai_gpt4o_mini",
            }
        return {"ok": True, "specialty_suggestions": [], "reasoning": text, "urgency": "routine", "ai_source": "openai_raw"}
    except Exception as e:
        logger.error(f"AI triage error: {e}")
        return {"ok": True, "specialty_suggestions": ["باطنة عامة"], "reasoning": "خطأ في الذكاء الاصطناعي - يُنصح بمراجعة طبيب باطنة", "urgency": "routine", "ai_source": "error_fallback"}


# ============================ AGORA TOKEN ============================
@api.post("/agora/token")
async def agora_token(data: Dict[str, Any], user=Depends(get_current_user)):
    """Returns Agora APP_ID (no token mode for testing). For production, use Agora token server."""
    if not user:
        raise HTTPException(401, "Login required")
    return {
        "app_id": os.environ.get("AGORA_APP_ID", ""),
        "channel": data.get("channel", f"nabd-{uuid.uuid4().hex[:8]}"),
        "uid": user["id"],
        "token": None,  # null = no token authentication (development mode)
    }


# ============================ HEALTH ============================
@api.get("/")
async def root():
    return {"app": "Nabd | نبض", "status": "ok", "time": now_utc()}


app.include_router(api)
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("shutdown")
async def shutdown():
    client.close()
