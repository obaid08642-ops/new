#!/usr/bin/env bash
# Start the real test stack on a GitHub runner for the native E2E jobs (same stack as live-gate.yml):
# MongoDB replica set, test doubles (S3 moto, SMTP sink, fake Moyasar), the built backend on :8002 and
# the admin panel BFF on :3001 (admin login + provider approval go through it). Redis comes from the job's
# `services:` block. The Android emulator reaches this backend as http://10.0.2.2:8002.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

docker run -d --name mongo -p 27017:27017 mongo:7 --replSet rs0 --bind_ip_all
for i in $(seq 1 30); do docker exec mongo mongosh --quiet --eval 'db.runCommand({ping:1})' && break; sleep 2; done
docker exec mongo mongosh --quiet --eval 'rs.initiate({_id:"rs0",members:[{_id:0,host:"127.0.0.1:27017"}]})'
for i in $(seq 1 30); do docker exec mongo mongosh --quiet --eval 'rs.status().ok' | grep -q 1 && break; sleep 2; done

pip install -q 'moto[server]==5.*' boto3 aiosmtpd
nohup moto_server -p 9000 > /tmp/moto.log 2>&1 &
nohup python3 tools/live/smtp_sink.py > /tmp/smtp.log 2>&1 &
nohup python3 tools/live/fake_moyasar.py > /tmp/moyasar.log 2>&1 &
for i in $(seq 1 30); do curl -s -o /dev/null http://127.0.0.1:9000 && break; sleep 1; done
python3 -c "import boto3; boto3.client('s3', endpoint_url='http://127.0.0.1:9000', aws_access_key_id='live', aws_secret_access_key='live-secret', region_name='us-east-1').create_bucket(Bucket='nabd-live')"

(cd backend && npm ci --no-audit --no-fund && npm run build && node ../tools/live/seed_admin.js && bash ../tools/live/start-backend.sh)

(cd admin && npm ci --no-audit --no-fund && npx next build)
(cd admin && ADMIN_GATE_TOKEN=live-gate-token ADMIN_BACKEND_URL=http://127.0.0.1:8002 NODE_ENV=production \
  nohup npx next start -p 3001 -H 127.0.0.1 > /tmp/admin.log 2>&1 &)
for i in $(seq 1 60); do curl -s -o /dev/null http://127.0.0.1:3001/ && break; sleep 2; done
curl -sf -o /dev/null http://127.0.0.1:8002/api/v1/care/specialties && echo "stack up"
