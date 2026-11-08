# R20 — supply chain: pinned base images, image SBOMs, signed images, weekly window

Builds on `docs/ops/SUPPLY_CHAIN_16.7.md` (lockfile SBOMs, Trivy scans, Dependabot, SHA-pinned Actions). What R20 adds:

| Requirement | What exists now | Where |
|---|---|---|
| **Base images pinned by digest** | Every `FROM` and `image:` of the production surface carries `@sha256:`: 18 references, 11 distinct images (node alpine and bookworm-slim, python, mongo, redis, meilisearch, clamav, livekit-server, coturn, nginx, certbot). The tag stays in the reference, so it is readable and Dependabot (docker ecosystem, weekly) proposes the next digest. CI fails on a new unpinned reference. | `tools/supply-chain/pin_images.py` (`--check`, `--pin`, `--list`), `.github/workflows/supply-chain.yml`, the Dockerfiles and `deploy/docker-compose.production.yml` |
| **SBOM per image** | Trivy writes a CycloneDX file of each published image (OS packages **and** npm libraries), validated (CycloneDX, at least 50 components, npm and apk/deb present), uploaded as an artifact (365 days), attached to the release and attested to the image digest. The lockfile SBOM per app (16.7) stays. | `.github/workflows/image-publish.yml`, `tools/supply-chain/check_image_sbom.py` |
| **Signed images** | Each image digest is signed keyless with cosign (the signing identity is the GitHub Actions run of `image-publish.yml`, recorded in the public Rekor log; there is no private key to steal or rotate). A server refuses an image unless the signature and the SBOM attestation verify for exactly that digest and that workflow of this repository, and refuses a tag. | `.github/workflows/image-publish.yml`, `deploy/scripts/verify-image.sh` |
| **Weekly dependency-update window** | Saturday 03:00 Riyadh (00:00 UTC): Dependabot opens **one grouped PR per app** for minor and patch updates (was up to 5 separate PRs per app), single PRs for majors. At 23:40 UTC on Friday a workflow writes the list of pending majors per app to the run summary (`majors.mjs`). Review and merge Saturday and Sunday through the normal gates. | `.github/dependabot.yml`, `.github/workflows/dependency-window.yml`, `tools/supply-chain/majors.mjs` |
| **Upgrade plan for pending majors** | 64 direct dependencies are a major behind across the five apps, grouped into batches with an order and the reason. | `docs/ops/UPGRADE_PLAN_MAJORS.md` |

## How to refresh the pins
`python3 tools/supply-chain/pin_images.py --pin` (needs the internet; asks Docker Hub for the manifest-list digest of each tag). Review the diff, build, deploy as usual. Dependabot does the same weekly.

## How a server verifies an image
`deploy/scripts/verify-image.sh ghcr.io/<owner>/nabd-backend@sha256:<digest>` (needs `cosign`, which is one static binary). The workflow prints this exact command for each image in its run summary.

## Honest limits
- **Production does not pull these images yet.** The compose file still builds on the server (`build:`), and the backend image there is assembled from artifacts built outside the Dockerfile (`deploy/docker/Dockerfile.backend` says why: npm crashes under buildkit on that datacenter). The published backend image is built from `backend/Dockerfile.production`, the same file the nightly Trivy scan already builds. Moving production to "pull by digest and verify" is a deploy-pipeline change for the lead reviewer and the owner (it also needs the server to reach ghcr.io); until then the signature protects nothing that runs. The pinned base images do protect the server builds today.
- `image-publish.yml` has not run: it triggers on a published release or on demand, and I did not run it. The first run may need a fix (for example a missing build argument or the `ghcr.io` package visibility), so run it once with "Run workflow" before relying on it.
- The `fastapi` image is not published: its build context (`nabdah-backend/infra/fastapi`) exists only on the server, not in this repository.
- Only the **production** surface is pinned. Development, test and CI images (`mongo:7`, `redis:7`, `node:20-alpine` in test rigs, `backend/docker-compose*.yml`) are not.
- A digest pin freezes the OS packages inside the base image until the next Dependabot digest PR is merged, so security fixes in the base image arrive weekly instead of at every build. The nightly Trivy image scan (existing) still reports HIGH/CRITICAL findings that have a fix.
- Keyless signing trusts GitHub's OIDC issuer and the Sigstore public instance. Verification pins the issuer and the workflow identity, so a signature from another repository or workflow fails.
- Dependabot `groups` need a grouped PR to pass all gates together; if one update in the group breaks, split it by hand.
