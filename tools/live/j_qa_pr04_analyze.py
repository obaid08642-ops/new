"""Journey (QA PR-04, pharmacy B2B analyze-file): a pharmacy's shortage list (text) is turned into items by the AI gateway.
  - the test database's OpenAI provider record points at the local OpenAI-compatible fake (tools/live/fake_openai.py, port 9200);
    the test key is set through the admin route (POST /ai/admin/gateway/provider/openai), so the key is stored as the product stores it;
  - POST /pharmacy/procurement/analyze-file with text returns the items the model listed (names and quantities);
  - MongoDB ai_usage holds the call (feature procurement_analyze, provider openai, ok).
Test database and fake provider only. A missing gateway or fake is a FAIL, never a PASS."""
import json
import subprocess

from lib import Client, journey, step, summary


def mongo_json(js):
    out = subprocess.run(['docker', 'exec', 'mongo', 'mongosh', '--quiet', 'nabd_live', '--eval', f'JSON.stringify({js})'],
                         capture_output=True, text=True).stdout.strip()
    return json.loads(out) if out and out != 'null' else None


def main():
    import j_admin
    admin, _ = j_admin.login()
    journey('PR-04 analyze-file: the AI provider is set (the fake, with the test key through the admin route)')
    r = admin.post('/ai/admin/gateway/provider/openai', {'api_key': 'qa-test-key', 'enabled': True})
    step('the admin sets the OpenAI provider key (POST /ai/admin/gateway/provider/openai)', r.ok, r)

    journey('PR-04 analyze-file: a shortage list in text becomes items')
    text = 'باراسيتامول 500 ملغ علبتين، وفيتامين سي 1000 ملغ علبة واحدة'
    r = admin.post('/pharmacy/procurement/analyze-file', {'text': text})
    items = (r.body or {}).get('items') if isinstance(r.body, dict) else None
    names = [x.get('name') or x.get('raw_name_string') or '' for x in (items or [])] if isinstance(items, list) else []
    step('analyze-file answers with the items (POST /pharmacy/procurement/analyze-file)', r.ok and isinstance(items, list) and len(items) >= 1, r)
    step('the items carry the names the model listed', any('باراسيتامول' in n or 'Vitamin' in n for n in names), names)
    journey('PR-04 analyze-file: a photo of the list becomes items (the image path)')
    png = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='
    r = admin.post('/pharmacy/procurement/analyze-file', {'file_base64': png, 'mime_type': 'image/png'})
    img_items = (r.body or {}).get('items') if isinstance(r.body, dict) else None
    step('analyze-file answers with items for an image (file_base64, image/png)', r.ok and isinstance(img_items, list) and len(img_items) >= 1, r)
    usage = mongo_json('db.ai_usage.findOne({feature: "procurement_analyze", provider: "openai"}, {_id:0, provider:1, ok:1, feature:1}, {sort: {_id: -1}})')
    step('MongoDB: the call is logged in ai_usage (procurement_analyze, openai, ok)', bool(usage) and usage.get('ok') is True, usage)
    summary()


if __name__ == '__main__':
    main()
