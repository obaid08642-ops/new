"""
AI Service — Provider-agnostic LLM abstraction layer.

Design goals:
- Pluggable providers (Emergent universal key today, OpenAI/Anthropic/Gemini/local tomorrow).
- All AI calls go through a single interface so we never bind business logic to one vendor.
- Used for:
    1. Prescription OCR (image → structured medicine list)
    2. Medicine image recognition (medicine box photo → name/ingredient)
    3. Triage / specialty suggestion (extensible)

The actual heavy lift is delegated to `emergentintegrations.llm.chat.LlmChat`
when EMERGENT_LLM_KEY is configured. If the key is missing or the call fails,
we degrade gracefully and return `ok=False` with a reason so the UI can still
work (manual entry, retry, etc).
"""
from __future__ import annotations

import base64
import io
import json
import logging
import os
import re
import time
import uuid
from typing import Any, Dict, List, Optional, Protocol

from dotenv import load_dotenv

load_dotenv()

EMERGENT_LLM_KEY = os.environ.get("EMERGENT_LLM_KEY", "")
DEFAULT_VISION_MODEL = os.environ.get("AI_VISION_MODEL", "gpt-4o")
DEFAULT_VISION_PROVIDER = os.environ.get("AI_VISION_PROVIDER", "openai")

log = logging.getLogger("nabd.ai")

# ============================================================
# Provider Interface (Protocol)
# ============================================================
class VisionProvider(Protocol):
    name: str
    async def analyze_image(self, *, system: str, prompt: str, image_b64: str, mime: str = "image/jpeg") -> Dict[str, Any]:
        ...


# ============================================================
# Emergent Provider (default)
# ============================================================
class EmergentVisionProvider:
    """Wraps emergentintegrations LlmChat for vision tasks."""

    def __init__(self, api_key: str, provider: str = "openai", model: str = "gpt-4o") -> None:
        self.api_key = api_key
        self.provider = provider
        self.model = model
        self.name = f"emergent:{provider}/{model}"

    async def analyze_image(self, *, system: str, prompt: str, image_b64: str, mime: str = "image/jpeg") -> Dict[str, Any]:
        if not self.api_key:
            return {"ok": False, "reason": "missing_key", "raw": None}
        try:
            from emergentintegrations.llm.chat import LlmChat, UserMessage, ImageContent  # type: ignore

            chat = LlmChat(
                api_key=self.api_key,
                session_id=f"nabd-vision-{uuid.uuid4().hex[:12]}",
                system_message=system,
            ).with_model(self.provider, self.model)

            img = ImageContent(image_base64=image_b64)
            msg = UserMessage(text=prompt, file_contents=[img])
            t0 = time.time()
            resp = await chat.send_message(msg)
            latency_ms = int((time.time() - t0) * 1000)
            return {
                "ok": True,
                "raw": resp,
                "model": self.model,
                "provider": self.provider,
                "latency_ms": latency_ms,
            }
        except Exception as e:  # pragma: no cover
            log.exception("Vision provider failed")
            return {"ok": False, "reason": "provider_error", "error": str(e), "raw": None}


# ============================================================
# Service Facade (the only thing the app should import)
# ============================================================
class AIService:
    """Singleton-ish facade. Swap provider via setter; everything else stays put."""

    def __init__(self) -> None:
        self._provider: VisionProvider = EmergentVisionProvider(
            EMERGENT_LLM_KEY, provider=DEFAULT_VISION_PROVIDER, model=DEFAULT_VISION_MODEL
        )

    def set_provider(self, provider: VisionProvider) -> None:
        self._provider = provider

    @property
    def provider_name(self) -> str:
        return self._provider.name

    # --------------------------------------------------------
    # Helpers
    # --------------------------------------------------------
    @staticmethod
    def _clean_b64(s: str) -> tuple[str, str]:
        """Strip the data URL prefix if present and return (b64, mime)."""
        m = re.match(r"^data:(image/(?:png|jpeg|jpg|webp));base64,(.+)$", s or "", re.IGNORECASE)
        if m:
            return m.group(2), m.group(1).lower()
        return s, "image/jpeg"

    @staticmethod
    def _extract_json(raw: str) -> Optional[Any]:
        """Pull the first JSON object/array from a model response."""
        if not raw:
            return None
        # 1) raw is already valid JSON
        try:
            return json.loads(raw)
        except Exception:
            pass
        # 2) Find first {...} or [...]
        for opener, closer in (("{", "}"), ("[", "]")):
            i = raw.find(opener)
            if i == -1:
                continue
            depth = 0
            for j in range(i, len(raw)):
                if raw[j] == opener:
                    depth += 1
                elif raw[j] == closer:
                    depth -= 1
                    if depth == 0:
                        try:
                            return json.loads(raw[i:j + 1])
                        except Exception:
                            break
        return None

    # --------------------------------------------------------
    # Capabilities
    # --------------------------------------------------------
    async def prescription_ocr(self, image_input: str) -> Dict[str, Any]:
        """Extract structured medicine list from a prescription photo."""
        b64, mime = self._clean_b64(image_input)
        system = (
            "You are a medical OCR assistant specialized in Arabic + English prescriptions "
            "in Saudi Arabia and the Gulf. You always reply with strict JSON only."
        )
        prompt = (
            "Read this prescription image carefully. Identify every prescribed medicine. "
            "Return JSON ONLY in this shape: "
            "{\"items\":[{\"name\":string,\"name_ar\":string,\"name_en\":string,"
            "\"active_ingredient\":string,\"dose\":string,\"frequency\":string,"
            "\"duration_days\":number,\"quantity\":number}],"
            "\"diagnosis\":string,\"doctor_name\":string,\"date\":string,"
            "\"confidence\":number,\"notes\":string}. "
            "Use empty strings/arrays for unknown fields. Confidence is 0..1."
        )
        res = await self._provider.analyze_image(system=system, prompt=prompt, image_b64=b64, mime=mime)
        if not res.get("ok"):
            return {
                "ok": False,
                "reason": res.get("reason", "provider_error"),
                "error": res.get("error"),
                "detected_items": [],
                "raw_text": "",
                "ai_source": self._provider.name,
            }
        parsed = self._extract_json(res["raw"]) or {}
        items = parsed.get("items") if isinstance(parsed, dict) else None
        if not isinstance(items, list):
            items = []
        return {
            "ok": True,
            "detected_items": items,
            "diagnosis": (parsed or {}).get("diagnosis", ""),
            "doctor_name": (parsed or {}).get("doctor_name", ""),
            "date": (parsed or {}).get("date", ""),
            "confidence": (parsed or {}).get("confidence", 0),
            "notes": (parsed or {}).get("notes", ""),
            "raw_text": res["raw"],
            "ai_source": self._provider.name,
            "latency_ms": res.get("latency_ms", 0),
        }

    async def medicine_image_search(self, image_input: str) -> Dict[str, Any]:
        """Identify a medicine product from a packaging photo."""
        b64, mime = self._clean_b64(image_input)
        system = (
            "You are a pharmaceutical product recognition assistant for the Saudi/Gulf market. "
            "Reply strictly with JSON only."
        )
        prompt = (
            "Identify the medicine in this image. Look at the packaging, label, brand, dose. "
            "Return JSON ONLY: "
            "{\"name\":string,\"name_ar\":string,\"name_en\":string,"
            "\"active_ingredient\":string,\"manufacturer\":string,\"dose\":string,"
            "\"form\":string,\"category\":string,\"confidence\":number}. "
            "Use empty strings if uncertain. Confidence is 0..1."
        )
        res = await self._provider.analyze_image(system=system, prompt=prompt, image_b64=b64, mime=mime)
        if not res.get("ok"):
            return {"ok": False, "reason": res.get("reason"), "error": res.get("error"), "ai_source": self._provider.name}
        parsed = self._extract_json(res["raw"]) or {}
        if not isinstance(parsed, dict):
            parsed = {}
        parsed.setdefault("name", "")
        parsed.setdefault("name_ar", "")
        parsed.setdefault("name_en", "")
        parsed.setdefault("active_ingredient", "")
        parsed.setdefault("manufacturer", "")
        parsed.setdefault("confidence", 0)
        return {
            "ok": True,
            "match": parsed,
            "raw_text": res["raw"],
            "ai_source": self._provider.name,
            "latency_ms": res.get("latency_ms", 0),
        }

    async def barcode_lookup(self, code: str) -> Dict[str, Any]:
        """Lookup a medicine/product by its barcode (EAN13/UPC/GTIN/SKU).

        Uses AI knowledge to identify the product when not found in our catalog.
        Returns structured product info even if the catalog miss.
        """
        if not EMERGENT_LLM_KEY:
            return {"ok": False, "reason": "missing_key", "match": None}
        try:
            from emergentintegrations.llm.chat import LlmChat, UserMessage  # type: ignore

            system = (
                "You are a pharmaceutical and FMCG product database assistant. "
                "You have knowledge of medicine barcodes from the global GS1 database, "
                "with particular expertise in Saudi Arabia, Gulf, Egypt, and broader MENA pharmaceutical markets. "
                "Reply strictly with JSON only — no prose, no markdown."
            )
            prompt = (
                f"Identify the medicine or healthcare product associated with the following barcode: {code}\n\n"
                "Return JSON ONLY in this exact shape:\n"
                "{\"found\": boolean, \"name\":string, \"name_ar\":string, \"name_en\":string, "
                "\"active_ingredient\":string, \"manufacturer\":string, \"category\":string, "
                "\"dose\":string, \"form\":string, \"requires_prescription\":boolean, "
                "\"confidence\":number, \"reasoning\":string}\n\n"
                "Rules:\n"
                "- found=true only if you have reasonable certainty (confidence >= 0.4)\n"
                "- confidence is 0..1\n"
                "- name_ar in Arabic (Saudi/Egyptian common name preferred), name_en in English\n"
                "- requires_prescription=true for antibiotics, controlled substances, hormones, etc.\n"
                "- If unknown, return found=false with empty strings, confidence=0"
            )
            chat = LlmChat(
                api_key=EMERGENT_LLM_KEY,
                session_id=f"nabd-barcode-{uuid.uuid4().hex[:12]}",
                system_message=system,
            ).with_model(DEFAULT_VISION_PROVIDER, DEFAULT_VISION_MODEL)

            t0 = time.time()
            resp = await chat.send_message(UserMessage(text=prompt))
            latency_ms = int((time.time() - t0) * 1000)

            parsed = self._extract_json(resp) or {}
            if not isinstance(parsed, dict):
                parsed = {}
            parsed.setdefault("found", False)
            parsed.setdefault("name", "")
            parsed.setdefault("name_ar", "")
            parsed.setdefault("name_en", "")
            parsed.setdefault("active_ingredient", "")
            parsed.setdefault("manufacturer", "")
            parsed.setdefault("category", "")
            parsed.setdefault("dose", "")
            parsed.setdefault("form", "")
            parsed.setdefault("requires_prescription", False)
            parsed.setdefault("confidence", 0)

            # Safety threshold — discard low-confidence results
            try:
                conf = float(parsed.get("confidence") or 0)
            except Exception:
                conf = 0
            if conf < 0.4:
                parsed["found"] = False

            return {
                "ok": True,
                "code": code,
                "match": parsed if parsed.get("found") else None,
                "raw_text": resp,
                "ai_source": self._provider.name,
                "latency_ms": latency_ms,
            }
        except Exception as e:
            log.exception("Barcode AI lookup failed")
            return {"ok": False, "reason": "ai_error", "error": str(e), "match": None}


# Singleton instance used across the app
ai_service = AIService()
