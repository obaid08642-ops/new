"""Live-journey helper: change one RAW document in the journey database (TEST DATABASE ONLY), for a state a journey cannot reach in real
time, for example a visit whose slot started a quarter of an hour ago. The journey says what it changed and why."""
import json
import os
import re
import subprocess

BACKEND = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'backend')
MONGO = os.environ.get('MONGO_URL', 'mongodb://127.0.0.1:27017/?replicaSet=rs0&directConnection=true')
DB = os.environ.get('DB_NAME', 'nabd_live')


def set_raw(collection, flt, fields):
    """$set `fields` on the first document matching `flt`; dates are given as {"$date": iso}. Returns the number of documents changed."""
    if not re.search(r'test|live', DB, re.I):
        raise RuntimeError(f'refused: DB_NAME "{DB}" is not a test database')
    code = ("const m=require('mongoose');const rev=(v)=>v&&typeof v==='object'&&'$date' in v?new Date(v.$date):v;"
            "(async()=>{await m.connect(process.env.MONGO_URL,{dbName:process.env.DB_NAME});"
            f"const f={json.dumps(fields)};for(const k of Object.keys(f))f[k]=rev(f[k]);"
            f"const r=await m.connection.db.collection({json.dumps(collection)}).updateOne({json.dumps(flt)},{{$set:f}});"
            "console.log(r.modifiedCount);await m.disconnect();})().catch(e=>{console.error(e);process.exit(1)})")
    r = subprocess.run(['node', '-e', code], cwd=BACKEND, capture_output=True, text=True, timeout=60,
                       env={**os.environ, 'MONGO_URL': MONGO, 'DB_NAME': DB})
    if r.returncode != 0:
        raise RuntimeError(r.stderr[-300:])
    return int(r.stdout.strip().splitlines()[-1])
