# audit-work/ `.gitignore` rationale

`audit-work/` is excluded intentionally because it is a local working/extraction area used to unpack the immutable baseline archives and hold temporary semantic-read material. It may contain extracted source copies, temporary files, generated inspection output, or local data that is not part of the deliverable artifact set and may be regenerated from the baseline archive. Committing it would duplicate source material, enlarge the audit branch, and risk mixing transient inspection state with the auditable records.

The authoritative deliverables are kept under `audit-artifacts/`: the manifest, evidence records, findings register, normalized backlog, mappings, and integrity reports. The product baseline remains unchanged; `.gitignore` itself is retained and no product source is modified by this rationale.
