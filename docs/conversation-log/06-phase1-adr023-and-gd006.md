# 6. Phase 1 — ADR-023 (Registry Ownership and Status History) and GD-006

**Repository:** `aquasavannah-landvault`

## Reading before designing

Before drafting anything, the existing Registry bounded context was read in full — the `Parcel`
domain aggregate, `ParcelService`, the ORM model, the Postgres repository adapter, the ports
module, dependency wiring, the API router and DTOs, migration `0007`, the audit kernel, the
in-memory test fakes, and ADR-015 (Registry Mutation Authorization Model) as the closest precedent
— specifically so the new ADR would match this codebase's actual, extremely disciplined
conventions (every design choice traced to a reason, every docstring explaining *why* not just
*what*) rather than a generic best-practice guess.

One structural finding shaped the whole design: **no domain-event bus exists anywhere in this
codebase.** Every prior "event" (`registry.parcel.created`, `.archived`, `.geometry_attached`) is
actually just a distinctively-named call to the existing `audit()` function. Building a new
event-bus abstraction to satisfy the Execution Plan's "emits domain events" language would have
been a materially larger, unauthorised architectural change — so the design followed the existing
pattern instead.

## ADR-023, drafted and proposed

The ADR was drafted with a deliberately narrow scope, matching how every prior Registry slice
actually shipped: **no new API endpoint, no new mutation command, no new authorization model.** Two
append-only tables (`parcel_ownership_history`, `parcel_status_history`) would be populated purely
as a side effect of the *existing* `create_parcel`/`update_parcel`/`archive_parcel` — meaning
history could only ever be written where a real mutation had already passed ADR-015's
creator-or-governance check, with no separate authorization question to invent.

It was committed as **Proposed**, then explicitly *not* implemented — per the Execution Plan's own
instruction to raise an ADR before writing code, and matching this repository's real historical
practice (ADR-018 through ADR-022 were each proposed, then separately accepted, before any code
followed).

## Four governance requirements, and what was actually a gap versus already-present

Review identified four points to address explicitly. Checking the draft against each showed a
mix of genuine gaps and under-emphasised content:

1. **Migration/backfill strategy — a genuine gap.** The original draft discussed rollback but said
   nothing about what happens to *pre-existing* parcels at migration time. The resolution chosen:
   **no backfill, history begins at the migration epoch.** Fabricating a synthetic "as-of-migration"
   history row — one that would *look* like a contemporaneous assertion but wasn't — was rejected
   explicitly as manufactured provenance, the same failure Article IV exists to prevent, applied to
   this ADR's own data rather than to a future feature.
2. **Append-only enforcement — present but not the strongest form.** The original draft relied on a
   `GRANT`-only restriction (no `UPDATE`/`DELETE` privilege). Strengthened to two independent
   layers: the existing privilege restriction, plus a new `BEFORE UPDATE OR DELETE` trigger that
   rejects mutation unconditionally, regardless of role — including the schema-owning migration
   role the privilege layer can't constrain by itself.
3. **Same Unit of Work / transaction — implied, made explicit.** Elevated to its own dedicated
   section, tying the mechanism directly to the identical dependency-injection pattern ADR-014
   already established for the atomic parcel-number allocator, rather than leaving it as an
   assumption a reader had to infer.
4. **RLS parity with the Parcel aggregate — asserted, made a checked confirmation.** Rewritten to
   name the specific dimensions verified identical (predicate text copied rather than retyped,
   `ENABLE` *and* `FORCE` both present, same session-variable mechanism, created in the same
   migration) rather than asserting "identical" without saying what was compared.

The revised ADR was committed as **Accepted**, with a revision note distinguishing which changes
were newly-added mechanism (the trigger layer, the backfill decision) versus which were the same
substance made explicit. Per instruction, implementation was *not* started — the updated ADR text
was reported back for final review first.

## GD-006 — a narrowly-scoped governance decision

A further instruction clarified precisely what GD-006 should be: **not** a project changelog, but a
governance decision whose sole purpose is to regularise the *factual, post-ratification
observations* that had been written directly into three already-ratified instruments (the
Schedule 4 confirmation note inside LV-000 v1.8 itself; two administrative notes in
`docs/EXECUTION_PLAN.md`; three in `docs/GOVERNANCE_BASELINE.md`) — explicitly excluding
infrastructure work, ADR approvals, and implementation activity from its scope.

GD-006 was added to LV-000's own Governance Decision Log (Article XVI), alongside a previously-
missing pointer entry for GD-005 (which had been ratified inside `GOVERNANCE_BASELINE.md` itself
but never actually logged back into the Constitution's own Log). It states plainly that the six
notes it covers each record a fact confirmed by direct inspection — not a new principle, not a
change to any Article, not a change to any prior decision — and treats them under the same
"administrative register" principle the Constitution already established for Schedule 1 Part B, so
that their presence in ratified text is a properly-governed act rather than an unrecorded edit. All
six affected notes were tagged `(regularised under GD-006)` for traceability, with the notes'
actual substance left untouched.

## Where this log's narrative ends

At the point this log was written, two things remained genuinely open: ADR-024's exact scope, and
what a requested "Keycloak export correction" specifically meant technically. Both were left open
rather than guessed at. The push, branch protection, and secrets-manager questions from entry 5
were also still unresolved at this point, held deliberately pending the fuller governance-
regularisation-then-validation sequence the user had described.
