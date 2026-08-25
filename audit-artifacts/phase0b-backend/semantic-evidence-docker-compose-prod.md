# Phase 0B semantic evidence — production Compose

**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`

**Member read in full:** `docker-compose.prod.yml:1–49`

The production composition builds the `app` service from the repository context using `Dockerfile.production` (`4–7`), names the container statically, enables `restart: always`, and publishes 3000:3000 (`8–11`). Static container names reduce deployment composability and can create collisions during rollback/parallel release. There is no healthcheck, readiness condition, resource limit, init/signal policy, security options, image digest/provenance, or release label.

The app environment hardcodes `NODE_ENV=production`, Mongo and Redis URLs without authentication/TLS, and interpolates only `JWT_SECRET` and `MOYASAR_API_KEY` from the operator environment (`12–17`). The Mongo variable is named `MONGO_URI`, while ENVIRONMENT.md documents `MONGO_URL`; this alias mismatch can prevent configured database connectivity or cause unintended defaults. The composition exposes no explicit validation that secrets are present, non-empty, high entropy, correctly scoped or rotated. Secret interpolation into Compose environment is not a secret-manager boundary and may leak through configuration inspection/process metadata.

`depends_on` lists Mongo and Redis only as order dependencies (`18–20`), not health-gated readiness. Mongo uses `mongo:6.0`, Redis uses `redis:7-alpine`, both mutable tags without digests (`24–25,33–34`), and neither service enables authentication, TLS, ACLs, network policy, healthchecks or resource limits. Both restart automatically (`26–27,35–36`) and persist to named volumes (`28–29,37–38`) without backup/restore, encryption, retention, failover, integrity or recovery policy.

All services share one bridge network (`21–22,30–31,39–40,46–49`) with no separation between app and data planes, no network aliases/policy, no egress restriction and no explicit internal-only flag. The app is published publicly on port 3000, while Mongo/Redis are not host-published in this file, but remain reachable from any service attached to the shared network. No migration/seed sequencing, rollback, image scanning/signing, SBOM, build provenance, log redaction, audit or compliance controls are represented. No Compose stack was started, no image was built, no product code was changed and no tests were run during this semantic read.
