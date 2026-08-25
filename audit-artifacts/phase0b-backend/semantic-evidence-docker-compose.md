# Phase 0B semantic evidence — docker-compose

**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`

**Member read in full:** `docker-compose.yml:1–22`

The Compose file declares version `3.8` and two services (`1–4`). The backend is built from the repository root (`5`), publishes host port 8002 to container port 8002 (`6–7`), loads `.env` directly (`8–9`) and declares only an ordering dependency on `mongo` (`10–11`). This is not a readiness dependency, does not provide health conditions, restart policy, resource limits, init/signal policy, secrets management, or environment allowlisting. The published 8002 contract must be reconciled with the Dockerfiles' exposed 3000 and application listen configuration.

Mongo uses the mutable `mongo:latest` image (`13–14`), publishes the database port to the host (`15–16`) and persists `/data/db` through the named volume (`17–18,20–22`). There is no digest pinning, authentication configuration, TLS, network isolation, backup/restore coordination, resource limit, healthcheck, replica-set/availability policy, filesystem hardening or retention/encryption policy. Publishing Mongo to the host creates an unnecessary exposure surface for a development-oriented composition.

The file has no explicit networks, so default network connectivity applies; no backend-only/private database network is defined. The `.env` file is consumed as an opaque source without a documented secret source, required-variable validation, redaction rule, production/dev separation or prevention of accidental commit/inclusion. There is no image provenance/SBOM/scan/signing policy, no migration/seed lifecycle, no rollback contract and no production profile boundary. No Compose stack was run, no image was built, no product code was changed and no tests were run during this semantic read.
