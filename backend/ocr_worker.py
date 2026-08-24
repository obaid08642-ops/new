#!/usr/bin/env python3
"""OCR worker — invoked by NestJS via stdin/stdout to extract structured
prescription data from base64 image using GPT-4o via Emergent universal key.

STDIN: JSON { image_base64: str, lang?: 'ar'|'en' }
STDOUT: JSON { ok: bool, items: [...], raw_text: str, confidence: int }
"""
import asyncio, base64, json, os, sys, io, re
import traceback
from dotenv import load_dotenv
load_dotenv('/app/backend/.env')

KEY = os.getenv('EMERGENT_LLM_KEY', '')

async def main():
    try:
        raw = sys.stdin.read()
        data = json.loads(raw) if raw else {}
        b64 = data.get('image_base64', '')
        if b64.startswith('data:'):
            # strip data url prefix
            b64 = re.sub(r'^data:[^;]+;base64,', '', b64)
        if not b64:
            print(json.dumps({'ok': False, 'error': 'no_image'}))
            return
        if not KEY:
            print(json.dumps({'ok': False, 'error': 'no_emergent_key', 'items': [], 'raw_text': ''}))
            return

        from emergentintegrations.llm.chat import LlmChat, UserMessage, ImageContent
        SYSTEM = '''You are a medical prescription OCR engine for Saudi Arabia. Extract structured medication list from prescription images in Arabic or English.
Respond STRICTLY as valid JSON with this exact shape (no commentary):
{
  "items": [{"name_ar": str, "name_en": str|null, "dose": str|null, "frequency": str|null, "duration_days": int|null, "instructions": str|null, "confidence": int(0-100)}],
  "doctor_name": str|null,
  "clinic_name": str|null,
  "date": str|null,
  "diagnosis": str|null,
  "raw_text": str,
  "overall_confidence": int(0-100)
}
If you cannot parse, return items: [] with explanation in raw_text.'''
        chat = LlmChat(api_key=KEY, session_id=f'ocr-{os.getpid()}', system_message=SYSTEM).with_model('openai', 'gpt-4o')
        msg = UserMessage(text='Extract medications from this Saudi prescription. Output JSON only.', file_contents=[ImageContent(image_base64=b64)])
        resp = await chat.send_message(msg)
        txt = str(resp).strip()
        # Strip markdown code-fence if present
        if txt.startswith('```'):
            txt = re.sub(r'^```(?:json)?\n?', '', txt)
            txt = re.sub(r'\n?```$', '', txt)
        try:
            obj = json.loads(txt)
        except Exception:
            # Try to find a JSON block
            m = re.search(r'\{[\s\S]*\}', txt)
            obj = json.loads(m.group(0)) if m else {'items': [], 'raw_text': txt, 'overall_confidence': 0}
        obj['ok'] = True
        print(json.dumps(obj, ensure_ascii=False))
    except Exception as e:
        print(json.dumps({'ok': False, 'error': str(e), 'trace': traceback.format_exc()[:500]}))

if __name__ == '__main__':
    asyncio.run(main())
