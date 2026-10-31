# A virus scanner on its own server (ClamAV, one switch)

Why: the main server (3.8 GB) cannot run ClamAV next to everything else (`UPLOAD_SCAN_3_8GB.md`). A small separate server runs only `clamd`; the API and the worker send each
upload to it (the INSTREAM command, `backend/src/modules/storage/clamav.service.ts`). **Nothing is switched on by this document or by the code: you decide when, with step 7.**

What does not change, whatever the scanner: **no unscanned file is ever served.** With `UPLOAD_SCAN=required` an upload is refused (503, `/config` says `uploads_enabled=false`, the apps
hide the upload buttons) while the scanner cannot answer; an infected file is refused or deleted; a file that waited in quarantine opens only after a scan (`423 file_pending_scan` before).

## 1. The server
- Any Linux VPS or VM with **2 GB RAM or more** (clamd needs 1.2 to 1.5 GB for its signatures): the Oracle Cloud Always Free Ampere VM (1 OCPU, 6 GB), or a 2 GB VPS (about US$5 to 7 a month).
  Ubuntu 24.04 LTS, in a region close to the main server (each scan adds the round trip; a 5 MB file takes well under a second on a good link).
- No other service on it. Give it a name nobody guesses; log in with SSH keys only (`PasswordAuthentication no`).

## 2. A private link, only our server may reach it (WireGuard)
clamd has **no login**: whoever can reach port 3310 can use the scanner, and the file travels over that link. It must never be reachable from the internet and the link must be encrypted.
Private keys never leave the machine that made them; only public keys are exchanged. Addresses used below: main server `10.77.0.1`, scanner `10.77.0.2` (any unused private range works).

On BOTH servers:
```
sudo apt-get update && sudo apt-get install -y wireguard
umask 077; wg genkey | sudo tee /etc/wireguard/private.key | wg pubkey | sudo tee /etc/wireguard/public.key
```
Scanner `/etc/wireguard/wg0.conf` (replace the placeholders; the key file is read on the machine, never pasted into chat or a ticket):
```
[Interface]
Address = 10.77.0.2/24
ListenPort = 51820
PrivateKey = <contents of /etc/wireguard/private.key of the scanner>
[Peer]
PublicKey = <public.key of the main server>
AllowedIPs = 10.77.0.1/32
```
Main server `/etc/wireguard/wg0.conf`:
```
[Interface]
Address = 10.77.0.1/24
PrivateKey = <contents of /etc/wireguard/private.key of the main server>
[Peer]
PublicKey = <public.key of the scanner>
Endpoint = <public address of the scanner>:51820
AllowedIPs = 10.77.0.2/32
PersistentKeepalive = 25
```
Then on both: `sudo systemctl enable --now wg-quick@wg0`. Check from the main server: `ping -c 3 10.77.0.2`.
(No WireGuard? The provider's private network between two servers of the same account is the same idea; a plain firewall rule "only the main server's public address may reach 3310" works but leaves the
file unencrypted on the internet, so use it only inside the provider's private network.)

## 3. Firewall on the scanner
```
sudo ufw default deny incoming && sudo ufw default allow outgoing
sudo ufw allow from <your admin address> to any port 22 proto tcp
sudo ufw allow 51820/udp                              # WireGuard
sudo ufw allow in on wg0 from 10.77.0.1 to any port 3310 proto tcp
sudo ufw enable
```
Also close everything else in the provider's own firewall or security list. Port 3310 must not be open on the public address: from your laptop `nc -zv <public address> 3310` must fail.

## 4. clamd (the official image, the same one as in `docker-compose.production.yml`)
```
sudo apt-get install -y docker.io
sudo docker volume create clamav_db
sudo docker run -d --name clamd --restart unless-stopped \
  -p 10.77.0.2:3310:3310 -v clamav_db:/var/lib/clamav \
  -e CLAMAV_NO_MILTERD=true \
  clamav/clamav:1.4
```
`-p 10.77.0.2:3310:3310` binds the port to the WireGuard address only. The first start downloads the signatures (several minutes): `sudo docker logs -f clamd` until it says
`socket found, clamd started`; `sudo docker exec clamd clamdcheck.sh` must exit 0.
Size limit: uploads are at most 15 MB (`media.controller.ts`, 10 MB for the main multipart handler). clamd refuses a stream above its `StreamMaxLength`; check it is at least 15 MB with `sudo docker exec clamd grep -i StreamMaxLength /etc/clamav/clamd.conf` (ClamAV's own default is 25 MB; if the line is missing or lower, set `StreamMaxLength 25M` and restart the container). The scan has a 30 s timeout in the API.
clamd keeps nothing: INSTREAM scans in memory and the image logs no file content.

## 5. Check the link from the main server (nothing is changed)
```
nc -zv 10.77.0.2 3310
```
Then the ops task `96d-clamd-check.sh` (set `CLAMD_TEST_HOST="10.77.0.2"` and `CLAMD_TEST_PORT="3310"` in the task file first so it tests the **candidate** before any setting changes). It runs inside the
backend container, the way the API reaches the scanner, and prints: `ping=ok`, the `version=` (engine and signature date), `clean_file=ok`, `test_virus=found(ok)` (the standard antivirus test file,
which every scanner must flag; it is built at run time, nothing harmful is stored), then `scanner=ok` and `ready_to_switch=yes`. It says `ready_to_switch=no` if the scanner does not answer,
does not catch the test file, or the address is a public one.

## 6. Before the switch
`96c-uploads-state.sh` (read-only) shows today's mode and the queue. Files that were accepted under `UPLOAD_SCAN=defer` wait in quarantine; the API and the worker scan them within a minute once the scanner answers
(`pending-scan.service.ts`), so nothing has to be done for them.

## 7. The switch (the only change)
In `/opt/nabdah/deploy/.env.production` set:
```
CLAMD_HOST=10.77.0.2
CLAMD_PORT=3310
UPLOAD_SCAN=required
CLAMAV_ON_DEMAND=0
```
`docker-compose.production.yml` reads these for the API and the worker (unset, it keeps `clamav` and 3310). Recreate only those two:
`cd /opt/nabdah/deploy && docker compose --env-file .env.production -f docker-compose.production.yml up -d backend worker`
Then stop the local scanner and its window, which are no longer needed: `docker compose ... stop clamav` and remove the `clamav-window` cron file.
Verify: `96d-clamd-check.sh` (with the test variables empty now) must print `switch is ON: UPLOAD_SCAN=required` and `scanner=ok`; `96c-uploads-state.sh` must show `uploads_enabled=true`.

## 8. Roll back
Put `UPLOAD_SCAN=defer` (or remove the three CLAMD lines to return to the local container) back in `.env.production` and recreate `backend worker`. Uploads are never open without a scan in either mode.

## 9. What happens when the scanner server is down
`required`: new uploads answer 503 and the apps show uploads as unavailable (within 30 s; `/config` caches the scanner's state for 30 s); files already stored keep opening (they were scanned). Nothing is waved through.
Watch it: alert when `96d-clamd-check.sh` says `scanner=FAIL`, and keep the VM's own snapshot or a second VM if uploads must survive a scanner outage (then point `CLAMD_HOST` at it).
