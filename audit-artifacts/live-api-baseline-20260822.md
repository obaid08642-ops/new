# Live API baseline

Checked `https://api.nabd.plus/api/v1` in the browser.

Response observed:

```json
{"app":"Nabd Healthcare OS (NestJS)","status":"ok","time":"2026-08-22T21:13:12.581Z","version":"1.0.0"}
```

No authentication data or patient data was sent. The root health response confirms the live base is reachable; OTP route schemas still require independent verification before implementation.
