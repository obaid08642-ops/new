#!/usr/bin/env bash
# R20: refuse to run an image that was not built and signed by this repository's publish workflow.
#   deploy/scripts/verify-image.sh ghcr.io/<owner>/nabd-backend@sha256:<digest>
# Checks, with cosign (keyless): a signature exists for exactly this digest, made by a GitHub Actions run of .github/workflows/image-publish.yml of this repository
# (identity recorded in the public Rekor log), and an SBOM attestation (CycloneDX) is attached to the same digest. A tag (":v1") is refused: only a digest is immutable.
# Exit 0 = verified. Anything else = do not run it.
#   REPO         owner/name of the repository whose workflow must have signed (default: obaid08642-ops/new)
#   COSIGN       path of the cosign binary (default: cosign)
set -euo pipefail
IMAGE="${1:-}"
REPO="${REPO:-obaid08642-ops/new}"
COSIGN="${COSIGN:-cosign}"
if [[ -z "$IMAGE" || "$IMAGE" != *@sha256:* ]]; then
  echo "verify-image: give the image by digest, ghcr.io/<owner>/<name>@sha256:<64 hex> (a tag can be moved)" >&2
  exit 2
fi
if ! [[ "$IMAGE" =~ @sha256:[0-9a-f]{64}$ ]]; then
  echo "verify-image: the digest is not 64 hex characters: $IMAGE" >&2
  exit 2
fi
ISSUER="https://token.actions.githubusercontent.com"
IDENTITY_RE="^https://github.com/${REPO}/\.github/workflows/image-publish\.yml@refs/(heads|tags)/.+$"
if ! "$COSIGN" verify --certificate-oidc-issuer "$ISSUER" --certificate-identity-regexp "$IDENTITY_RE" "$IMAGE" >/dev/null; then
  echo "verify-image: NO valid signature from ${REPO} image-publish.yml for $IMAGE" >&2
  exit 1
fi
if ! "$COSIGN" verify-attestation --type cyclonedx --certificate-oidc-issuer "$ISSUER" --certificate-identity-regexp "$IDENTITY_RE" "$IMAGE" >/dev/null; then
  echo "verify-image: signed, but NO CycloneDX SBOM attestation for $IMAGE" >&2
  exit 1
fi
echo "verify-image: OK $IMAGE (signed by ${REPO} image-publish.yml, SBOM attested)"
