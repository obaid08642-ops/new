#!/usr/bin/env python3
"""Verify a signed catalog release and its gzip artifacts."""
from __future__ import annotations

import argparse
import base64
import gzip
import hashlib
import json
from pathlib import Path
from typing import Any

from cryptography.exceptions import InvalidSignature
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PublicKey
from jsonschema import Draft202012Validator, FormatChecker

ROOT = Path(__file__).resolve().parents[1]
SCHEMA_PATH = ROOT / "schemas/release_manifest.schema.json"
PUBLIC_KEY_PATH = ROOT / "keys/catalog_ed25519_public.pem"


def canonical_json(value: Any) -> bytes:
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode("utf-8")


def sha256_path(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as source:
        for chunk in iter(lambda: source.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def read_json(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def verify_signature(manifest: dict[str, Any], public_key: Ed25519PublicKey) -> None:
    signature_text = manifest.get("signature")
    if not isinstance(signature_text, str):
        raise ValueError("Manifest has no signature")
    unsigned = dict(manifest)
    unsigned.pop("signature", None)
    try:
        public_key.verify(base64.b64decode(signature_text), canonical_json(unsigned))
    except (InvalidSignature, ValueError) as exc:
        raise ValueError("Manifest signature verification failed") from exc


def artifact_path(release_dir: Path, relative_url: str) -> Path:
    candidate = (release_dir / relative_url).resolve()
    if release_dir.resolve() not in candidate.parents:
        raise ValueError(f"Artifact URL escapes release directory: {relative_url}")
    return candidate


def verify_descriptor(release_dir: Path, descriptor: dict[str, Any]) -> dict[str, Any]:
    path = artifact_path(release_dir, descriptor["url"])
    if not path.is_file():
        raise ValueError(f"Missing artifact: {descriptor['url']}")
    actual_hash = sha256_path(path)
    if actual_hash != descriptor["sha256"]:
        raise ValueError(f"SHA-256 mismatch: {descriptor['url']}")
    if path.stat().st_size != descriptor["compressed_size"]:
        raise ValueError(f"Compressed size mismatch: {descriptor['url']}")
    with gzip.open(path, "rt", encoding="utf-8") as source:
        rows = [json.loads(line) for line in source if line.strip()]
    if len(rows) != descriptor["record_count"]:
        raise ValueError(f"Record count mismatch: {descriptor['url']}")
    return {"url": descriptor["url"], "record_count": len(rows), "compressed_size": path.stat().st_size}


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--release-id", required=True)
    parser.add_argument("--releases-root", type=Path, default=ROOT / "releases")
    parser.add_argument("--public-key", type=Path, default=PUBLIC_KEY_PATH)
    args = parser.parse_args()

    release_dir = args.releases_root / args.release_id
    release_manifest_path = release_dir / "manifest.json"
    if not release_manifest_path.is_file():
        raise SystemExit(f"Missing release manifest: {release_manifest_path}")
    schema = json.loads(SCHEMA_PATH.read_text(encoding="utf-8"))
    validator = Draft202012Validator(schema, format_checker=FormatChecker())
    public_key = serialization.load_pem_public_key(args.public_key.read_bytes())
    if not isinstance(public_key, Ed25519PublicKey):
        raise SystemExit("Public key is not Ed25519")

    release_manifest = read_json(release_manifest_path)
    errors = list(validator.iter_errors(release_manifest))
    if errors:
        raise SystemExit("Release manifest schema errors: " + "; ".join(error.message for error in errors))
    verify_signature(release_manifest, public_key)

    report: dict[str, Any] = {
        "release_id": args.release_id,
        "release_manifest_signature": "valid",
        "locale_manifests": [],
        "artifacts_verified": [],
    }
    for locale_summary in release_manifest.get("locales", []):
        locale_manifest_path = artifact_path(release_dir, locale_summary["manifest_url"])
        locale_manifest = read_json(locale_manifest_path)
        errors = list(validator.iter_errors(locale_manifest))
        if errors:
            raise SystemExit(f"Locale manifest schema errors for {locale_summary['locale_id']}: " + "; ".join(error.message for error in errors))
        verify_signature(locale_manifest, public_key)
        report["locale_manifests"].append({"locale_id": locale_summary["locale_id"], "signature": "valid"})
        report["artifacts_verified"].append(verify_descriptor(release_dir, locale_manifest["product_index"]))
        for shard in locale_manifest.get("shards", []):
            report["artifacts_verified"].append(verify_descriptor(release_dir, shard))

    latest_path = args.releases_root / "latest.json"
    if latest_path.is_file():
        latest = read_json(latest_path)
        errors = list(validator.iter_errors(latest))
        if errors:
            raise SystemExit("Latest pointer schema errors: " + "; ".join(error.message for error in errors))
        verify_signature(latest, public_key)
        if latest.get("release_id") != args.release_id:
            raise SystemExit("Latest pointer does not target requested release")
        report["latest_pointer_signature"] = "valid"

    print(json.dumps(report, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
