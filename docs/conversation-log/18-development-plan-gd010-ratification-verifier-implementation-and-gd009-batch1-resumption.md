# 18. `Development-Plan` — GD-010 Ratification, DAG Verifier Implementation, and GD-009 Batch 1 Resumption

**Repository:** `chuzcltdchuzc-gif/Development-Plan`.

This entry picks up exactly where entry 17 left off: GD-010 (the DAG-aware audit verifier's
implementation authority) drafted and remediated but not yet ratified, and GD-009's Batch 1 still
suspended with its blocked branch preserved, uncommitted, as reproduction evidence. This session
carried that thread all the way through ratification, implementation, a real-Postgres proof, and an
adversarial pre-commit review — resolving both of entry 17's open items, and opening one new one of
its own.

## Phase 1 — GD-010 ratified, the verifier implemented, both merged

Governance Authority opened with a formal ratification of GD-010. The document was finalized to the
repository's established house style (a Ratification Record section, a finalized Approval Gate, the
Article XVI entry inserted) and merged as PR #32 — three files only (the GD-010 decision, its
readiness report, the Constitution's Article XVI Log entry), verified via the same layered gate
sequence this repository's governance decisions now go through: a final independent ratification
review, a pre-commit staged-diff check, a post-approval merge-gate re-verification (reviewer identity
and permission, approval-commit-SHA match, required-check status all re-derived fresh rather than
trusted from an earlier pass), and a post-merge verification against the actual squashed commit on
`main`.

Implementation of the verifier itself followed in a separate, clean worktree rooted at the ratified
`main` — never the blocked Batch 1 branch, which stayed untouched throughout. `verify_chain()` was
rewritten to walk the audit log as a DAG: a single fetched snapshot, one memoized backward walk per
entry combining referential validity, reachability, and acyclicity, exactly matching GD-010's
mathematical findings from entry 17 (reachability provably following from the other two invariants
under this data model, rather than needing its own independent test fixture). Thirteen new tests
covered every required case — linear history, legitimate branching, multiple simultaneous genesis
roots, order-independence from `created_at`, tampered hashes, dangling predecessors at one and two
hops, self/two-node/three-node cycles, and duplicate-hash rejection — without touching a single line
of `_compute_hash`, `GENESIS_HASH`, or any write-path function. The same governance-gate sequence
(readiness assessment, final review, staged-diff verification, commit, PR #33, post-approval
merge-gate, post-merge verification) applied identically. Both PRs were ultimately merged by the same
human reviewer who had approved them — confirmed, not assumed, by independently re-deriving merger
identity, squash-commit parent count, and tree-equivalence to the approved head directly from GitHub's
own API after the fact, rather than treating a prior turn's "ready for merge" classification as proof
the merge had actually happened.

## Phase 2 — GD-011: lifting the suspension, precisely, without claiming more

With the verifier live and post-merge verified, a new Governance Decision (GD-011) was drafted to lift
*specifically* GD-009 §11's concurrency-related suspension — nothing broader. Formal review identified
exactly two narrow textual gaps, both about precision rather than substance: the draft never
affirmatively stated that the underlying read-before-append race *itself* remains unfixed (only that
the topology's *classification* changed), and it never used an explicit sentence confirming the
decision touches only §11's execution state, leaving every other GD-009 provision untouched. Both were
added as short, additive clarifications — no scope change — and the same ratification-through-post-
merge-verification sequence as Phase 1 applied again, landing as PR #34.

## Phase 3 — reconstructing Batch 1 from current `main`, not from the blocked branch

Before writing any implementation code, a dedicated read-only assessment traced the exact minimal
production surface required — independently, from the current architecture, not from the preserved
prototype's own file list — and only *then* inspected the blocked branch's actual diffs as evidence.
The architectural design the prototype had independently arrived at (`_build_entry()` extracted from
`audit()` as a behavior-preserving refactor; a new `append_staged()`/`audit_staged()` pair that stages
via `add()`+`flush()` and deliberately never commits, leaving the caller's own request-scoped
transaction as the sole commit point) matched what this session derived from scratch, and was
reconstructed by hand in a fresh worktree — never checked out, cherry-picked, or copied from the
blocked branch.

That inspection also caught something real: the prototype's own concurrency test asserted that *no
two committed rows may ever share a predecessor* — the exact strict-linearity premise ADR-030 had
already replaced with DAG semantics back in entry 17. Reusing that assertion unmodified would have
made the new implementation fail its own governance-mandated proof for the wrong reason entirely. The
reconstructed test asserts DAG validity (`verify_chain() == True`) instead, with a shared predecessor
treated as the expected, legitimate outcome it now is.

## Phase 4 — the real-Postgres proof, including a proof caught failing on its own terms

Implementation migrated exactly the two authorized call sites
(`evidence.actor_attribution.recorded`/`corrected`) to the new transaction-coupled path, leaving all
52 other audit call sites and every frozen verifier/hash function byte-for-byte untouched (confirmed
by direct extraction and comparison against the baseline commit, not by diff inspection alone). A
disposable, localhost-only Postgres container was used for the live proof — deliberately *not* the
project's own already-running development-stack Postgres container discovered active on the standard
port, which was recognized as the user's live working environment rather than a fixture available for
test use, and left alone.

The first live run of the new atomicity test found a real bug — in the test itself, not the
implementation: two verification blocks queried an ORM-mapped table through a raw Core connection
rather than an ORM session, which doesn't hydrate entities and raised an `AttributeError` reading the
result. Standing task authority at that point covered proof-gathering only, not test edits, so rather
than fixing it inline, a disposable, out-of-repository diagnostic script reproduced the exact same
scenario with the query corrected, obtaining real evidence that all four atomicity properties
(commit-together, rollback-together, an audit-staging failure blocking the mutation, and denial/
failure audits surviving a rollback of the unrelated business transaction) held correctly — while
reporting the authorized test file itself as still failing, honestly, rather than substituting the
script's clean run for it. A follow-up task then authorized exactly that one narrow fix; the repaired
suite passed cleanly end to end (six tests, zero failures, zero skips), reconfirming the same
concurrency evidence fresh: two independent writers genuinely producing a shared-predecessor fork
under a controlled, deterministic interleaving, `verify_chain()` correctly accepting it, and three
negative controls (a dangling predecessor, a tampered hash, a cycle) each correctly rejected.

## Phase 5 — an adversarial review that found two real, non-blocking weaknesses

A final adversarial pass attacked the completed implementation rather than confirming it: tracing
every statement between the attribution row's flush and the method's return for any path that could
raise `HTTPException` after the mutation but before the audit (none exists — the only exceptions
reachable in that window are database-level, which the Unit-of-Work's rollback branch already handles
correctly), and tracing FastAPI's dependency-cache mechanism directly against the actual dependency
graph rather than assuming it, cross-checked against the identical pattern already proven in three
other already-shipped contexts. Two genuine, non-blocking findings survived scrutiny: the audit-
staging-failure test induces a generic exception rather than a real database constraint violation
(sufficient for the governance requirement, since the rollback path doesn't distinguish exception
types, but not the strongest possible proof), and the dangling-predecessor negative control's fixture
uses a hash value that also happens to fail per-entry hash validity first, so it doesn't cleanly
isolate the specific invariant its name claims to test — the underlying code path for that invariant
was independently confirmed correct by direct reading regardless. Neither was treated as license to
fix it inline; both are recorded as recommended future hardening, not defects blocking this review.

## What this session actually demonstrates, and what it deliberately doesn't claim

The same discipline entry 17 named continued here: nothing was declared "done" on the strength of a
green test run alone. The live-test bug was reported and left unfixed until a separate task explicitly
authorized touching it, even though the underlying behavior had already been proven correct by other
means. The adversarial review's own two findings were written up in full even though neither blocks
the result. And as of this entry, **the Batch 1 implementation exists only in a local, uncommitted
worktree** — reviewed, live-proven, and adversarially cleared, but not staged, committed, pushed, or
opened as a PR. That remains the next, separate, explicit action for whoever picks this up.
