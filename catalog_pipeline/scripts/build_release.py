#!/usr/bin/env python3
"""Build signed, locale-specific catalog release artifacts from canonical records.

The builder never promotes a record. It only exports records whose existing
canonical governance and locale states satisfy the release policy.
"""
from __future__ import annotations

import argparse
import base64
import gzip
import hashlib
import json
import shutil
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Iterable

from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey
from jsonschema import Draft202012Validator, FormatChecker

ROOT = Path(__file__).resolve().parents[1]
CANONICAL_DEFAULT = ROOT / "data/internal/canonical_records.jsonl.gz"
LOCALES_PATH = ROOT / "config/locales.json"
POLICY_PATH = ROOT / "config/release_policy.json"
SCHEMA_PATH = ROOT / "schemas/release_manifest.schema.json"


def canonical_json(value: Any) -> bytes:
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode("utf-8")


def sha256(value: bytes) -> str:
    return hashlib.sha256(value).hexdigest()


def now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def numeric_id_key(value: str) -> tuple[int, int | str]:
    return (0, int(value)) if value.isdigit() else (1, value)


def load_records(path: Path) -> Iterable[dict[str, Any]]:
    with gzip.open(path, "rt", encoding="utf-8") as source:
        for line in source:
            if line.strip():
                yield json.loads(line)


def source_snapshot_hash(records_path: Path) -> str:
    digest = hashlib.sha256()
    with records_path.open("rb") as source:
        for chunk in iter(lambda: source.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def eligibility_reasons(record: dict[str, Any], locale_id: str, gate: dict[str, Any], locale_publication_state: str) -> list[str]:
    reasons: list[str] = []
    governance = record.get("governance", {})
    taxonomy = record.get("taxonomy", {})
    locale = record.get("locales", {}).get(locale_id, {})
    if governance.get("public_eligibility") is not gate["public_eligibility"]:
        reasons.append("public_eligibility_not_true")
    if governance.get("approval_state") != gate["approval_state"]:
        reasons.append("approval_state_not_approved_for_display")
    if governance.get("indexing_eligibility") is not gate["indexing_eligibility"]:
        reasons.append("indexing_eligibility_not_true")
    if locale.get("translation_status") != gate["locale_status"]:
        reasons.append("locale_not_ready_for_export")
    if taxonomy.get("state") != "approved" or not taxonomy.get("primary_taxonomy_id"):
        reasons.append("taxonomy_not_approved")
    if not locale.get("display_name"):
        reasons.append("missing_display_name")
    if not locale.get("slug"):
        reasons.append("missing_slug")
    if locale_publication_state != "enabled":
        reasons.append("locale_publication_not_enabled")
    return reasons


def public_record(record: dict[str, Any], locale_id: str) -> dict[str, Any]:
    locale = record["locales"][locale_id]
    return {
        "id": record["id"],
        "locale": locale_id,
        "record_revision": 1,
        "product_kind": record["product_kind"],
        "primary_taxonomy_id": record["taxonomy"]["primary_taxonomy_id"],
        "secondary_taxonomy_ids": record["taxonomy"]["secondary_taxonomy_ids"],
        "display_name": locale["display_name"],
        "official_name": locale["official_name"],
        "search_aliases": locale["search_aliases"],
        "slug": locale["slug"],
        "common": record["common"],
        "content": locale["content"],
        "assets": record["assets"],
        "publication": {
            "approval_state": record["governance"]["approval_state"],
            "indexing_eligibility": record["governance"]["indexing_eligibility"],
        },
    }


def gzip_payload(records: list[dict[str, Any]]) -> tuple[bytes, bytes]:
    raw = b"\n".join(canonical_json(record) for record in records) + (b"\n" if records else b"")
    return raw, gzip.compress(raw, compresslevel=9, mtime=0)


def make_chunks(records: list[dict[str, Any]], target_bytes: int, max_bytes: int) -> list[list[dict[str, Any]]]:
    chunks: list[list[dict[str, Any]]] = []
    active: list[dict[str, Any]] = []
    for record in records:
        candidate = active + [record]
        _, compressed = gzip_payload(candidate)
        if active and len(compressed) > target_bytes:
            chunks.append(active)
            active = [record]
            _, single = gzip_payload(active)
            if len(single) > max_bytes:
                raise ValueError(f"Record {record['id']} alone exceeds max shard size")
        else:
            active = candidate
    if active:
        chunks.append(active)
    for chunk in chunks:
        _, compressed = gzip_payload(chunk)
        if len(compressed) > max_bytes:
            raise ValueError(f"Shard {chunk[0]['id']}..{chunk[-1]['id']} exceeds max shard size")
    return chunks


def load_private_key(path: Path) -> Ed25519PrivateKey:
    return serialization.load_pem_private_key(path.read_bytes(), password=None)


def signed_manifest(payload: dict[str, Any], key: Ed25519PrivateKey, key_id: str) -> dict[str, Any]:
    unsigned = dict(payload)
    unsigned.pop("signature", None)
    unsigned["key_id"] = key_id
    signature = key.sign(canonical_json(unsigned))
    unsigned["signature"] = base64.b64encode(signature).decode("ascii")
    return unsigned


def write_json(path: Path, data: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(canonical_json(data) + b"\n")


def descriptor(path: Path, release_dir: Path, raw: bytes, compressed: bytes, record_count: int) -> dict[str, Any]:
    return {
        "url": path.relative_to(release_dir).as_posix(),
        "sha256": sha256(compressed),
        "compressed_size": len(compressed),
        "uncompressed_size": len(raw),
        "record_count": record_count,
    }


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--release-id", required=True, help="Immutable release name, e.g. v2026-08-20.1")
    parser.add_argument("--records", type=Path, default=CANONICAL_DEFAULT)
    parser.add_argument("--output-root", type=Path, default=ROOT / "releases", help="Directory that will contain immutable releases and latest.json")
    parser.add_argument("--dry-run", action="store_true", help="Report eligibility only; write no release files")
    parser.add_argument("--replace", action="store_true", help="Allow replacing an existing release directory")
    args = parser.parse_args()

    policy = json.loads(POLICY_PATH.read_text(encoding="utf-8"))
    locale_registry = json.loads(LOCALES_PATH.read_text(encoding="utf-8"))
    manifest_schema = json.loads(SCHEMA_PATH.read_text(encoding="utf-8"))
    manifest_validator = Draft202012Validator(manifest_schema, format_checker=FormatChecker())
    source_hash = source_snapshot_hash(args.records)
    release_dir = args.output_root / args.release_id
    eligible: dict[str, list[dict[str, Any]]] = defaultdict(list)
    blocked_counts: dict[str, Counter[str]] = defaultdict(Counter)
    blocked_records: list[dict[str, Any]] = []
    total_records = 0

    for record in load_records(args.records):
        total_records += 1
        for locale_config in locale_registry["locales"]:
            locale_id = locale_config["locale_id"]
            reasons = eligibility_reasons(
                record,
                locale_id,
                policy["publication_gate"],
                locale_config["publication_state"],
            )
            if reasons:
                blocked_counts[locale_id].update(reasons)
                if len(blocked_records) < 5000:
                    blocked_records.append({"id": record["id"], "locale_id": locale_id, "reasons": reasons})
            else:
                eligible[locale_id].append(public_record(record, locale_id))

    report = {
        "release_id": args.release_id,
        "dry_run": args.dry_run,
        "records_examined": total_records,
        "source_snapshot_hash": source_hash,
        "eligible_record_counts": {locale["locale_id"]: len(eligible[locale["locale_id"]]) for locale in locale_registry["locales"]},
        "blocked_reason_counts": {locale_id: dict(counts.most_common()) for locale_id, counts in blocked_counts.items()},
        "blocked_record_samples": blocked_records,
    }

    if args.dry_run:
        print(json.dumps(report, ensure_ascii=False, indent=2))
        return

    if release_dir.exists():
        if not args.replace:
            raise SystemExit(f"Release directory exists: {release_dir}; use --replace to overwrite intentionally")
        shutil.rmtree(release_dir)
    release_dir.mkdir(parents=True)
    private_key = load_private_key(ROOT / policy["signing"]["private_key_path"])
    key_id = policy["signing"]["key_id"]
    created_at = now_iso()
    locale_summaries: list[dict[str, Any]] = []

    for locale_config in locale_registry["locales"]:
        locale_id = locale_config["locale_id"]
        locale_dir = release_dir / locale_id
        locale_dir.mkdir(parents=True)
        records = sorted(eligible[locale_id], key=lambda record: numeric_id_key(record["id"]))
        by_category: dict[str, list[dict[str, Any]]] = defaultdict(list)
        for record in records:
            by_category[record["primary_taxonomy_id"]].append(record)
        shard_descriptors: list[dict[str, Any]] = []
        index_rows: list[dict[str, Any]] = []

        for category_id, category_records in sorted(by_category.items()):
            chunks = make_chunks(category_records, policy["sharding"]["target_compressed_bytes"], policy["sharding"]["max_compressed_bytes"])
            for chunk in chunks:
                raw_bytes, compressed = gzip_payload(chunk)
                file_name = f"id-{chunk[0]['id']}-{chunk[-1]['id']}.json.gz"
                shard_path = locale_dir / category_id / file_name
                shard_path.parent.mkdir(parents=True, exist_ok=True)
                shard_path.write_bytes(compressed)
                shard = descriptor(shard_path, release_dir, raw_bytes, compressed, len(chunk))
                shard.update({
                    "main_category_id": category_id,
                    "min_id": chunk[0]["id"],
                    "max_id": chunk[-1]["id"],
                    "revision": 1,
                })
                shard_descriptors.append(shard)
                for record in chunk:
                    index_rows.append({
                        "id": record["id"],
                        "slug": record["slug"],
                        "shard_url": shard["url"],
                        "record_revision": record["record_revision"],
                        "publication_state": "published",
                    })

        index_rows.sort(key=lambda row: numeric_id_key(row["id"]))
        index_raw, index_compressed = gzip_payload(index_rows)
        index_path = locale_dir / "product-index.json.gz"
        index_path.write_bytes(index_compressed)
        index_descriptor = descriptor(index_path, release_dir, index_raw, index_compressed, len(index_rows))
        locale_manifest = signed_manifest({
            "schema_version": "release-manifest@1",
            "manifest_type": "locale",
            "release_id": args.release_id,
            "created_at": created_at,
            "source_snapshot_hash": source_hash,
            "taxonomy_revision": 0,
            "locale_registry_revision": locale_registry["revision"],
            "locale_id": locale_id,
            "direction": locale_config["direction"],
            "language_publication_state": locale_config["publication_state"],
            "product_index": index_descriptor,
            "shards": shard_descriptors,
            "tombstones": [],
        }, private_key, key_id)
        errors = list(manifest_validator.iter_errors(locale_manifest))
        if errors:
            raise ValueError(f"Invalid locale manifest {locale_id}: {[error.message for error in errors]}")
        write_json(locale_dir / "manifest.json", locale_manifest)
        locale_summaries.append({
            "locale_id": locale_id,
            "publication_state": locale_config["publication_state"],
            "manifest_url": f"{locale_id}/manifest.json",
        })

    release_manifest = signed_manifest({
        "schema_version": "release-manifest@1",
        "manifest_type": "release",
        "release_id": args.release_id,
        "created_at": created_at,
        "source_snapshot_hash": source_hash,
        "taxonomy_revision": 0,
        "locale_registry_revision": locale_registry["revision"],
        "locales": locale_summaries,
    }, private_key, key_id)
    errors = list(manifest_validator.iter_errors(release_manifest))
    if errors:
        raise ValueError(f"Invalid release manifest: {[error.message for error in errors]}")
    write_json(release_dir / "manifest.json", release_manifest)

    latest_manifest = signed_manifest({
        "schema_version": "release-manifest@1",
        "manifest_type": "latest",
        "release_id": args.release_id,
        "created_at": created_at,
        "source_snapshot_hash": source_hash,
        "locale_manifest_url": f"{args.release_id}/manifest.json",
    }, private_key, key_id)
    errors = list(manifest_validator.iter_errors(latest_manifest))
    if errors:
        raise ValueError(f"Invalid latest pointer: {[error.message for error in errors]}")
    write_json(release_dir.parent / "latest.json", latest_manifest)

    report["release_directory"] = str(release_dir)
    report["artifacts_written"] = True
    report_path = release_dir / "build_report.json"
    report_path.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
