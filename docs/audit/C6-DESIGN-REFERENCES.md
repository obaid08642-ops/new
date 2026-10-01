# 12.C6 — design references: status and provenance

## Decision

On the owner's instruction, the design references required by §C6 are to be
**authored by the agent**, in the manner of the existing `docs/design/canvas/`
references, and in the style of the pre-approval owner's design that the
remaining palette migration has to land on.

## What that means for how these files should be read

This is the part that must not be lost, so it is written before the files rather
than after.

**These references are not owner-approved.** The existing `docs/design/canvas/*.dc.html`
came from the previous owner. The files produced under C6 come from an agent
working from a description. They are drafts, and they carry a marker saying so in
their own header — not in a changelog entry, not in a commit message, in the
artifact, where a reader of the file alone will see it.

The distinction matters in one direction more than the other. An owner-approved
reference is a decision: it can be cited as "this is what was asked for", and
disagreement with it is disagreement with the owner. An agent-authored reference is
a proposal: it can be cited as "this is what was built", and disagreement with it
is a normal review comment. Both are useful; only one may be treated as settled,
and the file says which it is.

`docs/design/canvas/` is **not** modified. The C6 output is a separate directory so
that the two provenances never share a path, a glob, or a reader's assumption:

    docs/design/references-c6/     agent-authored, marked as such
    docs/design/canvas/             previous owner, untouched

## Why the style is "as before the owner", not "as the tokens say"

The A11 worklist is 3,960 raw colours, and the two largest are `#e8edee` (734) and
`#1e332e` (726). Those are the pre-approval brand — `#1e332e` is the dark green
the primary button's label wore until the lime override was removed in `d9fee1c`.

So the references have to be drawn against the surface the screens actually have
today, not against `tokens.json` alone, or they will describe a product that does
not exist. Where a reference and the token layer disagree, **the disagreement is
the finding**, and it belongs in the file rather than being smoothed over in the
render.

## Gate, unchanged

§C4's gate still requires the owner's review across twenty main screens per client
before Phase 12 closes. Authoring the references does not satisfy it and is not
intended to. What it changes is that the gate now has something concrete to be
run against.
