# NABD Main Source Exclusions 2026-08-24

Baseline: \.

| Pattern | Count in tracked tree | Reason |
|---|---:|---|
| `node_modules/`, `dist/`, `.next/`, `coverage/`, caches | 0 direct tracked entries | Not present in `git ls-files`; if present inside an archive, classified as generated/dependency and not semantically read. |
| Binary/archive assets | 5 | Retained as first-party containers/assets; not excluded from inventory, but binary internals require separate extraction/classification. |
| Generated source maps/minified files | 0 | No direct tracked matches in `git ls-files`; archive members, if any, are classified in the manifest. |

> No first-party source file was omitted solely because it looked legacy or disconnected. Direct archives remain in scope.
