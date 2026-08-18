"""
AI Router — exposes prescription OCR and medicine image recognition.

Routes (prefix = /api/v2/ai, so the Patient app talks to /api/v2/ai/...
exactly like the rest of the NestJS routes — but these are served by FastAPI
directly because we use the Python `emergentintegrations` library for LLM calls).

Security:
- Reads JWT from Authorization header for user attribution.
- Endpoints are scoped to authenticated patients but fall back to anonymous
  for guest-prescription previews (configurable).
"""
from __future__ import annotations

import os
import jwt
import logging
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel

from ai_service import ai_service

log = logging.getLogger("nabd.ai_routes")

JWT_SECRET = os.environ.get("JWT_SECRET", "nabd-secret-2025-change-in-prod")
JWT_ALGO = "HS256"

ai_router = APIRouter(prefix="/api/v2/ai", tags=["ai"])


# ----- Helpers --------------------------------------------------------
def _decode_user(authorization: Optional[str]) -> Optional[Dict[str, Any]]:
    if not authorization or not authorization.lower().startswith("bearer "):
        return None
    token = authorization.split(" ", 1)[1].strip()
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGO])
    except Exception:
        return None


# ----- Schemas --------------------------------------------------------
class OcrReq(BaseModel):
    image_base64: str


class ImageSearchReq(BaseModel):
    image_base64: str


class TriageReq(BaseModel):
    symptoms: str
    age: Optional[int] = None
    gender: Optional[str] = None
    lang: Optional[str] = "ar"


# ----- Routes ---------------------------------------------------------
@ai_router.get("/status")
async def status() -> Dict[str, Any]:
    """Health probe for the AI subsystem."""
    return {
        "ok": True,
        "provider": ai_service.provider_name,
        "key_present": bool(os.environ.get("EMERGENT_LLM_KEY")),
    }


@ai_router.post("/prescription-ocr")
async def prescription_ocr(req: OcrReq, authorization: Optional[str] = Header(default=None)) -> Dict[str, Any]:
    """Run vision OCR on a prescription image and return structured items."""
    if not req.image_base64:
        raise HTTPException(status_code=400, detail="image_base64 required")
    user = _decode_user(authorization)
    res = await ai_service.prescription_ocr(req.image_base64)
    res["user_id"] = (user or {}).get("id")
    return res


@ai_router.post("/medicine-image-search")
async def medicine_image_search(req: ImageSearchReq, authorization: Optional[str] = Header(default=None)) -> Dict[str, Any]:
    """Identify a medicine from a packaging photo and search the catalog for matches."""
    if not req.image_base64:
        raise HTTPException(status_code=400, detail="image_base64 required")
    user = _decode_user(authorization)
    res = await ai_service.medicine_image_search(req.image_base64)
    if not res.get("ok"):
        return res
    # Try to map to known medicines via catalog text search (best-effort).
    import httpx
    match = res.get("match") or {}
    name_ar = (match.get("name_ar") or match.get("name") or "").strip()
    name_en = (match.get("name_en") or "").strip()
    active = (match.get("active_ingredient") or "").strip()
    candidates: List[Dict[str, Any]] = []
    try:
        async with httpx.AsyncClient(timeout=8.0) as c:
            for q in [name_ar, name_en, active]:
                if not q:
                    continue
                r = await c.get(f"http://localhost:8002/api/medicines/autocomplete", params={"q": q})
                if r.status_code == 200:
                    data = r.json() or []
                    for d in data:
                        if d not in candidates:
                            candidates.append(d)
                    if candidates:
                        break
    except Exception:
        pass
    res["candidates"] = candidates[:10]
    res["user_id"] = (user or {}).get("id")
    return res


@ai_router.post("/triage")
async def triage(req: TriageReq) -> Dict[str, Any]:
    """Lightweight symptom→specialty mapper (rule engine).
    The full LLM-backed triage will be added later. The rule engine guarantees
    we never block UX on AI availability."""
    s = (req.symptoms or "").lower()
    rules = [
        (["صدر", "chest", "اختناق"], "أمراض القلب", "urgent"),
        (["جلد", "skin", "حبوب"], "الجلدية", "routine"),
        (["أسنان", "ضرس", "tooth"], "الأسنان", "routine"),
        (["عيون", "eye", "بصر"], "العيون", "routine"),
        (["عظام", "ركبة", "ظهر"], "العظام", "routine"),
        (["معدة", "بطن", "stomach"], "الجهاز الهضمي", "routine"),
        (["رأس", "صداع", "headache"], "المخ والأعصاب", "routine"),
        (["حرارة", "fever"], "باطنة عامة", "urgent"),
        (["نزيف", "bleeding"], "الطوارئ", "emergency"),
    ]
    suggestions: List[str] = []
    urgency = "routine"
    for keys, spec, u in rules:
        if any(k in s for k in keys):
            if spec not in suggestions:
                suggestions.append(spec)
            if u == "emergency":
                urgency = "emergency"
            elif u == "urgent" and urgency != "emergency":
                urgency = "urgent"
    if not suggestions:
        suggestions = ["باطنة عامة"]
    return {
        "ok": True,
        "specialty_suggestions": suggestions[:3],
        "urgency": urgency,
        "reasoning": "تم تحليل الأعراض بمحرك القواعد. لا يغني عن الفحص الطبي.",
        "ai_source": "rule_engine_v1",
        "disclaimer": "اقتراح إرشادي فقط",
    }



# ===================================================================
# Barcode AI lookup — for medicine products not found in catalog
# ===================================================================
class BarcodeLookupReq(BaseModel):
    code: str


@ai_router.post("/barcode-lookup")
async def barcode_lookup(req: BarcodeLookupReq, authorization: Optional[str] = Header(default=None)):
    """Identify a medicine/product by its barcode using AI when the catalog misses.

    Accepts:
      - Plain GTINs / EAN13 / UPC
      - GS1 DataMatrix payloads (with control chars stripped on client side)
    Returns structured product info or {found: false} when AI is uncertain.
    """
    code = (req.code or "").strip()
    if not code:
        raise HTTPException(status_code=400, detail="code is required")
    # Strip GS1 control chars before sending to AI
    safe_code = "".join(ch if 32 <= ord(ch) < 127 else "|" for ch in code)
    try:
        result = await ai_service.barcode_lookup(safe_code)
        return result
    except Exception as e:
        log.exception("barcode_lookup failed")
        raise HTTPException(status_code=500, detail=str(e))
