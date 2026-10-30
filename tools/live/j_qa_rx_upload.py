"""Journey (QA P-15, prescription upload end to end): a patient uploads a prescription photo/PDF to private storage, submits it
(POST /prescriptions/upload), and reads it back; MongoDB holds the record for this patient. The upload is scanned on the way in:
the ClamAV double (tools/live/fake_clamd.py, port 3311; UPLOAD_SCAN=required) refuses the EICAR test file, and that file is not stored.
A missing scanner or route is a FAIL, never a PASS."""
import base64
import json
import subprocess

from lib import Client, journey, step, summary

EICAR = b'X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*'


def mongo_json(js):
    out = subprocess.run(['docker', 'exec', 'mongo', 'mongosh', '--quiet', 'nabd_live', '--eval', f'JSON.stringify({js})'],
                         capture_output=True, text=True).stdout.strip()
    return json.loads(out) if out and out != 'null' else None


def main():
    import j_accounts
    from j_radiology import MINI_PDF
    acct = j_accounts.app_signup(label='rx-upload')
    pat = Client(acct['token'], 'patient')
    patient_id = pat.get('/auth/me').get('id')

    journey('P-15 rx upload: the patient uploads a prescription to private storage')
    r = pat.post('/storage/upload', {'data_base64': base64.b64encode(MINI_PDF).decode(), 'mime': 'application/pdf', 'original_name': 'prescription.pdf'})
    obj = r.get('id')
    step('the prescription file is stored (scanned clean)', r.ok and bool(obj), r)
    if not obj:
        summary()
        return

    journey('P-15 rx upload: the patient submits the prescription and reads it back')
    r = pat.post('/prescriptions/upload', {'upload_image': obj, 'items': [{'name_ar': 'باراسيتامول', 'name_en': 'Paracetamol', 'quantity': 1}], 'notes': 'QA P-15'})
    rid = r.get('id') or (r.get('prescription') or {}).get('id')
    step('the prescription upload is accepted (POST /prescriptions/upload)', r.ok and bool(rid), r)
    if rid:
        row = mongo_json(f'db.prescriptions.findOne({{id: "{rid}"}}, {{_id: 0, patient_id: 1, upload_image: 1, state: 1}})')
        step('MongoDB: the record belongs to this patient and holds the uploaded file', bool(row) and row.get('patient_id') == patient_id and row.get('upload_image') == obj, row)
        mine = pat.get('/prescriptions/mine')
        listed = [x for x in (mine.body if isinstance(mine.body, list) else mine.items()) if x.get('id') == rid]
        step('the patient sees the prescription in their list (GET /prescriptions/mine)', mine.ok and bool(listed), mine.status)

    journey('P-15 rx upload: the scanner refuses the EICAR test file, and nothing is stored')
    r = pat.post('/storage/upload', {'data_base64': base64.b64encode(EICAR).decode(), 'mime': 'application/pdf', 'original_name': 'eicar.pdf'})
    step('the EICAR file is refused by the scan (no object id returned)', not (r.ok and r.get('id')), r)
    r = pat.post('/prescriptions/upload', {'upload_image': 'eicar-not-stored', 'items': [], 'notes': 'QA P-15 negative'})
    step('a prescription that points at no stored file is refused', not r.ok, r)
    summary()


if __name__ == '__main__':
    main()
