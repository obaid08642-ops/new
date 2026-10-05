# Security Owner Checklist — Phase 7C

**For the platform owner. Complete every item before declaring 7C done.**
Gate P7C requires your confirmation on a real MacBook + iPhone.

## 1. Passkeys (C1) — confirm on YOUR devices
- [ ] On your MacBook (Touch ID): sign in to the admin panel with password →
      complete the Touch ID assertion → session issued.
- [ ] On your iPhone (Face/Touch ID): same flow → session issued.
- [ ] Password-only login as admin is rejected (403) on both devices.
- [ ] An unregistered passkey is rejected (403).
- [ ] Registering a second credential requires the first passkey + email confirmation.
- [ ] Do NOT set `ADMIN_PASSKEY_ENFORCED=true` in production until both
      devices above are confirmed working. (Synced passkeys from iCloud
      Keychain / Google Password Manager always report counter 0; the backend
      handles this, but confirm on hardware before enforcing.)

## 2. Devices (C2)
- [ ] Your MacBook and iPhone appear in Admin → Devices with recognizable names.
- [ ] Rename them to `owner-macbook` and `owner-iphone`.
- [ ] Any admin API call from a third device returns 403.
- [ ] Revoking a device immediately blocks it (test: revoke → call → 403).

## 3. Network gate (C3)
- [ ] Cloudflare Access (or mTLS) is active in front of `admin.nabd.plus`.
- [ ] From a non-enrolled device: blocked at the edge (never reaches backend).
- [ ] `ADMIN_GATE_TOKEN` is set in backend production env.
- [ ] Backend rejects `/admin/*` without the gate header (403).

## 4. Step-up (C4)
- [ ] Refund, payout, finance/loyalty config, role change, and delete actions
      each prompt a fresh Touch/Face ID assertion.
- [ ] Without the fresh assertion → 403; with it → 2xx.

## 5. Sessions & alerts (C5)
- [ ] Leave the admin panel idle 15+ minutes → next call returns 401.
- [ ] Every admin login emails + pushes you (device, IP, time).
- [ ] Every FAILED admin login emails + pushes you.

## 6. Recovery (C6)
- [ ] Generate 10 recovery codes (Admin → Security, with step-up).
- [ ] Print them. Store the paper offline (safe, not near your devices).
- [ ] Test ONE code: recovery code + email code → access granted.
- [ ] Confirm: email code alone → 403; used code → 403.
- [ ] 9 codes remain. Never photograph or cloud-sync the sheet.
- [ ] Break-glass hardware key stored offline in a second location.

## 7. Accounts & providers — enable 2FA everywhere
- [ ] GitHub (owner account): 2FA on (passkey preferred).
- [ ] Hosting provider: 2FA on.
- [ ] Database provider: 2FA on + IP allow-list for the cluster.
- [ ] Domain/DNS registrar: 2FA on + registry lock if offered.
- [ ] Email account (`Obaid08642@gmail.com`): 2FA on.
- [ ] **Apple ID: 2FA on — passkeys sync through iCloud.** If Apple ID 2FA
      is off, iCloud Keychain passkeys do not sync and iPhone login breaks.

## 8. SSH & servers
- [ ] SSH keys only — password authentication disabled on every server.
- [ ] `~/.ssh/authorized_keys` contains only your current keys.
- [ ] Break-glass hardware key + printed recovery codes stored offline
      (two separate physical locations).

## 9. If a device is lost
1. From the remaining device: Admin → Devices → revoke the lost device.
2. Admin → Security → regenerate recovery codes (needs step-up).
3. Change the admin password.
4. Check Admin → Login attempts for unknown IPs.
5. If BOTH devices are lost: use a printed recovery code + email code to
   sign in, then re-enroll new devices and regenerate the code set.

## 10. Contacts
- [ ] Hosting provider support number saved in your phone.
- [ ] Database provider support saved.
- [ ] Registrar support saved.

## 11. Social sign-in (Q107)
- [ ] `GOOGLE_OAUTH_CLIENT_IDS` is set in backend production env to every
      Google client id that signs patients in, comma-separated: the web id
      (patient-web `NEXT_PUBLIC_GOOGLE_CLIENT_ID`) and the app ids
      (`EXPO_PUBLIC_GOOGLE_CLIENT_ID`, `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID`,
      `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID`). A missing id means sign-in from
      that client is refused; unset means Google sign-in returns 503.
- [ ] `APPLE_SIGNIN_CLIENT_IDS` is set only if Sign in with Apple is offered:
      the iOS bundle id (patient app) and the Services ID (web), comma-separated.
      Unset means Apple sign-in returns 503.
- [ ] Social sign-in works for patient accounts only; staff and providers use
      password + 2FA.
