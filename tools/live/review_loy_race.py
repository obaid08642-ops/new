import sys, json, subprocess, threading, uuid
sys.path.insert(0, '/home/user/new/tools/live')
from lib import Client
def mongo(js): return subprocess.run(['docker','exec','p5mongo','mongosh','--quiet','nabd_form2','--eval',js],capture_output=True,text=True).stdout.strip()
p = json.load(open('/tmp/seed/patient.json'))
r = Client().post('/auth/login', {'identifier': p['email'], 'password': p['password']})
pat = Client(r.get('token')['accessToken'], 'patient')
acc = pat.get('/loyalty/account'); pts = acc.get('points') or 0
print('account', acc.status, 'points', pts)
cost = max(1, int(pts * 0.6))
rid = str(uuid.uuid4())
mongo(f'db.loyalty_rewards.insertOne({{id:"{rid}",title_ar:"اختبار تزامن RACE",title_en:"race test",points_required:{cost},reward_type:"coupon",stock:100,active:true,createdAt:new Date(),updatedAt:new Date()}})')
res = []
def go():
    x = pat.post(f'/loyalty/rewards/{rid}/claim', {}, idem=False) if 'idem' in Client.post.__code__.co_varnames else pat.post(f'/loyalty/rewards/{rid}/claim', {})
    res.append(x.status)
ts = [threading.Thread(target=go) for _ in range(6)]
[t.start() for t in ts]; [t.join() for t in ts]
print('cost', cost, 'claim statuses', sorted(res))
print('after', pat.get('/loyalty/account').get('points'))
print('claim txns', mongo(f'print(db.loyalty_transactions.countDocuments({{ref_id:"{rid}"}}))'), 'stock', mongo(f'print(db.loyalty_rewards.findOne({{id:"{rid}"}}).stock)'))
