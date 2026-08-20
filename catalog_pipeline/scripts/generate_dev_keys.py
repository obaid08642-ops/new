#!/usr/bin/env python3
"""Generate local development-only Ed25519 signing keys for catalog manifests."""
from __future__ import annotations

from pathlib import Path

from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey

ROOT = Path(__file__).resolve().parents[1]
PRIVATE_PATH = ROOT / "keys/catalog_ed25519_private.pem"
PUBLIC_PATH = ROOT / "keys/catalog_ed25519_public.pem"


def main() -> None:
    if PRIVATE_PATH.exists() or PUBLIC_PATH.exists():
        raise SystemExit("Refusing to overwrite existing keys. Remove them explicitly to rotate a development key.")
    private_key = Ed25519PrivateKey.generate()
    public_key = private_key.public_key()
    PRIVATE_PATH.write_bytes(private_key.private_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PrivateFormat.PKCS8,
        encryption_algorithm=serialization.NoEncryption(),
    ))
    PUBLIC_PATH.write_bytes(public_key.public_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PublicFormat.SubjectPublicKeyInfo,
    ))
    print(f"Generated development key pair:\n- {PRIVATE_PATH}\n- {PUBLIC_PATH}")


if __name__ == "__main__":
    main()
