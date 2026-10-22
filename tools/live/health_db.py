"""16.9 live-journey helper: read one RAW document from the journey database (the way an attacker with database access would,
without the model), so a journey can prove a health field is ciphertext at rest."""
import json
import os
import subprocess

BACKEND = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'backend')
MONGO = os.environ.get('MONGO_URL', 'mongodb://127.0.0.1:27017/?replicaSet=rs0&directConnection=true')
DB = os.environ.get('DB_NAME', 'nabd_live')


def find_raw(collection, flt):
    code = ("const m=require('mongoose');(async()=>{await m.connect(process.env.MONGO_URL,{dbName:process.env.DB_NAME});"
            f"const d=await m.connection.db.collection({json.dumps(collection)}).findOne({json.dumps(flt)});"
            "console.log(JSON.stringify(d));await m.disconnect();})().catch(e=>{console.error(e);process.exit(1)})")
    r = subprocess.run(['node', '-e', code], cwd=BACKEND, capture_output=True, text=True, timeout=60,
                       env={**os.environ, 'MONGO_URL': MONGO, 'DB_NAME': DB})
    if r.returncode != 0 or not r.stdout.strip():
        return None
    return json.loads(r.stdout.strip().splitlines()[-1])


def is_cipher(value):
    return isinstance(value, str) and value.startswith('enc.v1:')
