# 17. `Development-Plan` — Audit Transaction Semantics & Chain Concurrency Governance Programme: ADR-029, GD-009, ADR-030, GD-010

**Repository:** `chuzcltdchuzc-gif/Development-Plan`.

This entry covers one long, continuous session that picked up directly from where entry-level work
on `docs/AUDIT_KERNEL_ATOMICITY_REALITY_AUDIT.md` and the drafted ADR-029/GD-009 documents had been
left off (recorded, at the time, only in that repository's own
`docs/session-logs/2026-09-gd-008-adr-028-foundation-and-adr-029-audit-atomicity.md`). What began as
a routine ratification-and-implementation sequence for one audit-kernel fix ended up surfacing, and
then formally resolving, a second, deeper architectural question the first fix's own governance
process had specifically required be proven live before being trusted.

## Phase 1 — ADR-029 ratified: audit transaction semantics

Governance Authority opened with a formal review of the drafted ADR-029 ("Audit Transaction
Semantics and Outcome Integrity" — the decision that a *successful*-mutation audit entry must commit
or roll back atomically with the business row it describes, while denial/failure entries remain
independently durable). The review's one substantive finding was arithmetic, not architectural: the
audit-call-site inventory the original reality audit and ADR text both cited (55 sites) didn't match
a fresh count (54), and the original table's own numbers didn't even sum to 55 in the first place.
The remediation preserved the original reality-audit document untouched (point-in-time evidence is
never edited after the fact in this repository's convention), filed a dated correction note
alongside it, and corrected the ADR and its readiness report to the verified 54-site inventory. A
second review pass, specifically checking whether the fix's own text could be read as permitting
audit-store rebinding to leak into unrelated call sites or as understating the audit chain's
concurrency exposure, required two further precision edits before Governance ratified it and PR #29
merged.

## Phase 2 — GD-009 ratified: Batch 1 implementation authorized, narrowly

With the architecture accepted, a Governance Decision (GD-009) was drafted to authorize
*implementing* it — but bounded to exactly two call sites (`evidence.actor_attribution.recorded`/
`corrected`, the pair gating a future Evidence-attribution HTTP API under the separate ADR-028), not
the other 52. Formal review required three textual remediations before ratification: an explicit
rule that the new transaction-coupled audit path must be selected by explicit, per-call opt-in only
(never a global rebind that could silently change unrelated `audit()` callers' behavior); an
explicit, corrected account of the audit chain's own pre-existing concurrency exposure (the original
reality audit had named this "Case D" and left it unproven); and a mandatory, specific
real-PostgreSQL concurrency test as a condition of calling Batch 1 "done." GD-009 was ratified and
PR #30 merged — with its own text making the concurrency test's outcome a hard gate, not a
formality: *"If Batch 1 testing proves that transaction-coupled successful auditing can create a
fork... implementation must stop and return to Governance"* — stated before anyone knew which way
that test would actually go.

## Phase 3 — implementing Batch 1, and hitting the gate for real

Implementation followed GD-009's letter closely: `app.kernel.audit.audit()` was refactored (entry
construction factored into a shared, behavior-preserving helper, proven unchanged by a full 321-test
hermetic-suite run before and after) so a new, separate `audit_staged()` function could stage a
successful-mutation entry into the caller's own open transaction without touching the existing
eager-independent path at all. The two attribution-service call sites were migrated; a hermetic test
double was added so the existing fast test suite kept exercising authorization/validation logic
without needing a real database.

The mandatory concurrency test was where the real finding landed. Against a real, throwaway Postgres
database, driving two audit writes with a deliberately controlled interleaving (both readers observe
the same "last hash" before either writer commits — a legitimate, reproducible race, not a rare
fluke), the new transaction-coupled path **did** produce a genuine hash-chain fork: two committed
rows both claiming the same predecessor. Rather than treating this as a bug to patch inside the
already-authorized implementation, the session did what GD-009's own text required and returned the
exact stop condition it had pre-specified, then went one step further on its own initiative: it
reproduced the *identical* fork using only the **unmodified, already-merged** production
eager-independent audit path — proving, before drafting anything, that this was a pre-existing
defect in the original audit-kernel design, not something the new work had introduced. The blocked
branch (`feat/gd009-batch1-transactional-audit`) was left uncommitted and untouched from that point
on, preserved purely as reproduction evidence for every subsequent task in this session — every
later commit, in every later phase, was made from a separately created, clean git worktree rooted at
whatever `origin/main` actually was at the time, specifically so the blocked branch's evidence would
never be accidentally folded into an unrelated PR.

## Phase 4 — ADR-030 ratified: what the audit chain actually needs to guarantee

An architecture investigation followed, framed by Governance as genuinely open (not a foregone
conclusion that stricter linearity was the only acceptable answer). Reading `ADR-007`'s original
text and the Constitution's Article VIII §3 closely found neither actually required a strict,
single-successor-per-predecessor chain — both only required tamper-evidence and a resolvable
reference, a materially weaker property a hash-linked **DAG** (multiple legitimate successors per
predecessor) satisfies exactly as well, at zero schema, locking, or dependency cost, once the
existing verifier's linear-walk assumption is relaxed. ADR-030 selected that DAG topology over six
named alternatives (locking, per-tenant chains, a monotonic sequence, a `UNIQUE(prev_hash)`-plus-
retry design, a transactional outbox), rejecting each for a specific, checked reason rather than by
default.

Formal review of the drafted ADR added its own empirical layer: a red-team constructed a real
branched graph in a throwaway Postgres database and tested what happened when rows were deleted from
it, under the newly-proposed verifier's actual logic. Interior-node deletion was reliably detected.
Deleting a terminal leaf, an entire terminal branch, or truncating everything after a surviving
node, however, all went **silently undetected** — not a defect specific to the new design (a
strictly linear chain has the identical blind spot for its own single deletable tail; the DAG only
widens which entries are simultaneously prunable this way), but a real limitation the original draft
hadn't disclosed anywhere. The remediated ADR now states this explicitly and classifies the selected
architecture as *"Acceptable with explicit limitation"* rather than silently claiming more than the
mechanism actually delivers — cryptographic verification and the database's own `REVOKE UPDATE,
DELETE` access control are named as two separate, independent guarantees, not one. ADR-030 was
ratified and PR #31 merged; GD-009's Batch 1 remains explicitly suspended pending a separately
authorized, implemented, and post-merge-verified DAG-aware verifier — ratifying the architecture was
stated, repeatedly, not to be the same act as resuming the blocked implementation.

## Phase 5 — GD-010: drafted and remediated, not yet ratified at the time of writing

A further Governance Decision (GD-010) was drafted to authorize implementing that verifier — again
narrowly: six named invariants, no write-path change, no migration, no new dependency, no automatic
resumption of GD-009's own suspension. Formal review of this draft did the most mathematically
substantive work in the whole session: proving, from the actual data model (a finite set of rows,
each with exactly one predecessor edge), that *reachability to genesis is not actually an
independent failure mode* — it's a logical consequence of two of the *other* named invariants
(referential validity and acyclicity) together, meaning the original draft's own test requirement
for an "unreachable but otherwise valid" fixture described something that provably cannot be
constructed. A second, separate finding did the same for cycle-detection testing: because the hash
function includes the predecessor's hash as one of its own inputs, a *genuinely* self-consistent
cycle would require finding a SHA-256 fixed point — computationally infeasible by the same property
that makes SHA-256 useful for this purpose at all, meaning cycle tests necessarily have to use
deliberately-corrupted fixtures rather than "honest" ones. Both findings, plus several smaller ones
(multiple simultaneous genesis-linked roots must be provably legitimate, not merely permitted in
principle; duplicate-hash input must not be silently masked by a naive dictionary construction; an
empty audit log's existing "valid" result must be preserved; the verifier's single-snapshot read
needs no locking to stay correct under concurrent writers) were folded into the draft as required
remediations. **GD-010 was left remediated but not yet ratified** — this log entry does not resolve
that; it records the state as it stood at the time.

## What this session actually demonstrates, and what it deliberately doesn't claim

The through-line worth naming explicitly: the governance process this repository already had in
place — draft, formally review, remediate, ratify, then *require a specific empirical test before
declaring implementation done* — is what caught a real, previously-unproven defect, rather than
merely producing paperwork around an assumption. Nothing in this session claims the audit chain is
now cryptographically complete against a privileged deletion; it claims the opposite, explicitly,
where the original drafts didn't. Nothing in this session claims GD-009's Batch 1 is unblocked; every
governance instrument produced along the way was drafted, reviewed, and where it touched the topic
at all, explicitly restated that the suspension holds until its own, separate resumption act. The
blocked implementation branch, its concurrency test, and its exact reproduction method remain
preserved, uncommitted, on disk — evidence for whoever resumes this thread next, not something this
session tidied away.
