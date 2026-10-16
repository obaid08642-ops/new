# TURN static-auth-secret — rotation record (16.1)

The secret itself lives only in the server environment (`COTURN_STATIC_AUTH_SECRET`,
rendered into `turnserver.rendered.conf`, never committed). This file records rotations.

## How to rotate (server-ops, owner approval)

1. Generate: `COTURN_STATIC_AUTH_SECRET=$(openssl rand -hex 32)`.
2. Render + reload on the TURN host: `./deploy/scripts/render-coturn-config.sh`
   (see that script), then restart/reload coturn.
3. Update the backend env (`COTURN_SECRET`, same value) and redeploy the API so
   allocation credentials keep verifying.
4. Record below: date, who, and where each copy lives. Never paste the value here.

## Log

| date (UTC) | by | backend updated | note |
|---|---|---|---|
| — | — | — | **BLOCKED: production rotation pending.** A `static-auth-secret` value was once present in git history (Phase 11 notes); it must be assumed compromised until rotated on the live host through server-ops with the owner's approval. This agent session has no server access. |
