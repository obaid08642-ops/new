# 12.C6 — design references: provenance and scope

## What was decided, and by whom

The owner reviewed this file on 2026-10-02 and directed that the C6 design
references — which the audit had marked as requiring an owner design session —
**be produced by the agent instead**, in the same manner and visual language as
the references the owner had produced previously.

That is the whole of the authorisation, and it is a real one: the owner looked at
the work blocked on them and chose to unblock it by delegation rather than by
session.

## Why this file exists

Because of how the work will be read later. There is a real risk, six months
from now, that a file in `docs/design/canvas/` gets treated as evidence that a
design decision was reviewed. The style of a reference tells you nothing about who
approved it, and the two things are not the same thing.

So: **references produced under this authorisation are agent-authored.** They
follow the owner's established visual language, and they are internally
consistent with `packages/design-tokens/tokens.json` and
`packages/audit/05_OWNER_ADDITIONS_DESIGN_AND_GAPS.md`. They are not owner
sign-off, and nothing in this repository should imply otherwise.

If the owner later reviews and adopts any of these, that is a separate, recorded
event — not something these files can be read as having already happened.

## What the references may and may not do

- **May** state layout, hierarchy, spacing, type scale, and token usage, because
  those are all derivable from the token layer and the existing canvas files.
- **May** propose a colour *role* already present in `tokens.json`.
- **May not** introduce a new colour, a new font, or a new brand mark. Those are
  the owner's decisions, and the token layer is the record of what was decided.
- **May not** claim a screen has been visually approved.

## Why the token layer is the check on this

The owner's own additions file is the constraint, and the tokens encode it: 58
colour pairs, a defined spacing scale, a defined motion scale, and a type scale
with a single family per script. A reference that needs a colour not in
`tokens.json` is a reference asking for a decision nobody made, and the
generator should refuse it the way `migrate-colors.mjs` refuses near misses.

The same rule applies to the work itself, and it is why the A11 numbers moved at
all: 1,124 literals were removed because they restated a decision already made,
and 3,960 were left because they did not.

## Status

- Scope: authorised 2026-10-02, by the owner, in-session.
- Provenance: **agent-authored, owner-delegated.** Not owner sign-off.
- Build order: C6 references → C1 conformance against them → C3 per-screen
  audits → A11 to the token layer.
