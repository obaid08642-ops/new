# Nabdah Provider — Shared Chat Truthfulness Remediation

**Date:** 2026-08-19  
**Scope:** Isolated provider-app source archive only.  
**Result:** **PASS — the shared ChatSystem no longer fabricates a clinical conversation or represents unavailable actions as completed.**

## Confirmed Defect

The provider `ChatSystem` requested the REST paths `/chats/threads` and `/chats/:id/messages`. In the authoritative backend archive examined for this batch, the chat module exposed Socket.IO gateway events but the source search found no matching `/chats/threads` REST contract. The gateway's `send_message` handler emits a realtime event but does not establish the persistent client REST response consumed by the shared provider screen.

When message history loading failed, the prior mobile source injected two hard-coded patient/doctor messages. It also appended a local message before a send request was confirmed and silently retained it if the request failed. Voice, video, audio-recording, and attachment controls displayed informational “starting” or “attach” feedback without a verified operation contract. In a healthcare workflow, those states could misrepresent both communication history and the completion of an action.

> The remediation uses a fail-closed presentation boundary: a workflow without an evidenced persistent, participant-authorized contract must be unavailable, not simulated.

## Remediation Applied

| Surface | Previous behavior | Remediated behavior |
|---|---|---|
| Conversation loading | Error path replaced server history with two fabricated messages. | Clears the conversation and presents a truthful load error. |
| Message sending | Local entry was appended and kept after request failure. | Does not create a local delivered message; clearly reports that sending is unavailable until a verified chat contract is bound. |
| Voice/video controls | Displayed “Starting” feedback without starting a verified session. | Reports that calling is unavailable from this screen. |
| Voice recording | Displayed a recording action without an evidenced recording/upload workflow. | Reports that recording is unavailable from this screen. |
| Attachments | Displayed attachment progress language without a verified secure-upload/authorization contract. | Reports that attachment is unavailable pending a secure upload contract. |
| Regression coverage | No targeted guard. | Added a provider contract test that rejects the fabricated messages, optimistic-send comment, and unverified success paths. |

## Verification

| Gate | Command | Result |
|---|---|---|
| Static types | `npx tsc --noEmit` | **PASS** |
| Provider contract tests | `npm test -- --runInBand` | **PASS — 1 suite / 21 tests** |
| Production-mode web export | `CI=1 EXPO_NO_TELEMETRY=1 NODE_ENV=production npx expo export --platform web --no-bytecode --max-workers 1 --clear` | **PASS — 899 modules bundled** |
| Archive integrity | `unzip -t` plus excluded-directory inspection | **PASS** |

## Archive Candidate

```text
NabdProvider-provider.zip
SHA-256: b24247783899bda5872cbf78c0e4398d96f30e262dbdd7908e4d805ecc2aca62
```

## Required Follow-up Before Re-enabling Chat Features

The remediation is deliberately not a replacement for a usable chat product. Re-enable individual actions only after the backend and both clients share an evidenced contract that covers participant authorization, persistence, read/delivery state, pagination, reconnect behavior, attachments backed by secure storage, and auditable failures. Voice/video requires its own participant-authorized session and LiveKit/signaling contract.

The audit also identified two separate, still-open provider surfaces that are **not** closed by this batch:

1. `PharmacyChatResponder` opens Socket.IO without the required authenticated handshake and appends fabricated local chat/invoice entries. It requires independent remediation.
2. `NotificationsCenter` changes read state locally without a verified server mutation, while `SupportCenter` contains hard-coded ticket records. Both require source-contract review before being treated as live operational features.

No production deployment, live account, sandbox mutation, payment action, or signed device build occurred in this batch.
