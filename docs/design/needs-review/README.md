# Needs review

Things a design or audit session found while rebuilding a screen and could not settle from the client code alone: a screen that shows made-up data, a control that does nothing, an endpoint that is missing or returns something the screen cannot use, a screen that should fetch and does not.

`tools/design/screen-inventory.mjs` merges every `*.json` file in this folder into section 7 ("Needs review") of `../WIRING_REPORT.md` and puts the count in that report's header. Do not edit the report by hand.

## Who writes here

Each session writes its own file so parallel sessions never conflict:

| File | Written by |
|---|---|
| `batch-0-web.json` | the patient-web Batch 0 audit (explained in `../audit/batch-0-web.md`) |
| `batch-0-app.json` | the patient-app Batch 0 audit (explained in `../audit/batch-0-app.md`) |
| `batch-0-runtime.json` | the Batch 0 runtime check (`../audit/runtime-batch-0-web.md`, `../audit/runtime-batch-0-app.md`) |
| `tooling.json` | the inventory tooling: findings of the mock scan and of the screens-with-no-API-calls review |

Use `batch-<n>-<app>.json` for later batches. The per-screen element audits that explain each entry live in `../audit/` (`batch-0-web.md`, `batch-0-app.md`).

## Format

Each file is a JSON array. Every entry has all eight keys:

```json
[
  {
    "batch": 0,
    "app": "patient-web",
    "screen": "/login",
    "element": "Forgot-password link",
    "file": "patient-web/components-next/login-form.tsx",
    "line": 88,
    "found": "What is in the code now, as observed (no guesses).",
    "suspect": "What you think is wrong or missing, and why."
  }
]
```

| Key | Meaning |
|---|---|
| `batch` | Batch number from `SCREEN_INVENTORY.md` (0-13). A number or a numeric string. |
| `app` | `patient-app` or `patient-web` |
| `screen` | Route as in the inventory (`/login`, `/pharmacy/cart`) |
| `element` | The control, field or block, in words a reader can find on the screen |
| `file` | Repo-relative path |
| `line` | Line number (integer), `0` when the finding is about the whole file |
| `found` | Facts: what the code does, what the screen shows, what the endpoint answers |
| `suspect` | The suspected cause or gap. A suspicion, not a verdict. |

The generator sorts all entries by batch, app, screen, file, line, so the report does not depend on file order. A file that is not valid JSON, is not an array, or lacks a key stops the generator and names the file.

## Rules

- Report only. A design session does not fix backend gaps and does not tell another session to. **The reviewer session verifies each entry and fixes backend issues.**
- Facts in `found`, guesses in `suspect`. Cite the endpoint, the field or the line you looked at.
- When a finding is fixed, delete its entry in the same PR and re-run `node tools/design/screen-inventory.mjs`.
- Real data only: do not "fix" an entry by adding a placeholder.
