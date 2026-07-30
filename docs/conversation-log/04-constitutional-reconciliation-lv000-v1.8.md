# 4. Constitutional Reconciliation — LV-000 Edition v1.8, Revision H

**Repository:** `aquasavannah-landvault`

## An earlier, since-reverted sync attempt

Before the archival extraction (entry 3), an initial request to "sync the newer Bible into the
repo" was carried out partially: the adopted `Volume I`/`Volume II` files were staged for deletion
and a fifteen-file draft `LV-001`–`016` set (sourced from the unadopted v1.7 draft) was added,
renaming the incoming "Go-to-Market Strategy" volume to `GO_TO_MARKET_STRATEGY.md` specifically to
avoid colliding with the real, adopted `LV-013-market-intelligence-report.md`. That collision
resolution (protect the adopted document; move the candidate) turned out to anticipate, almost
exactly, how the later Governance Baseline resolved the same collision (entry 5's `LV-017`
renumbering). This entire sync was reverted to `HEAD` at the start of the archival extraction
(entry 3), once it became clear the working tree needed to reflect the truly-adopted baseline
before anything else could honestly be extracted from it.

## A downloaded document, checked rather than trusted

A file named `GOVERNANCE_BASELINE.md`, opened from Downloads, presented itself as
**"RATIFIED — in force"** and proposed resolving the two-lineage conflict by consolidating v1.0 and
v1.7 into a new "LV-000 v1.8." Before treating any of it as authoritative:

- Its self-declared "ratified" status was flagged as exactly the failure mode the Constitution
  itself would later name — a document cannot ratify itself; only the actual governance authority
  (the user) can.
- One of its own "findings" was checked against the live repo and found **wrong**: it claimed
  `CLAUDE.md`'s pointer index didn't reference `docs/LV-000-constitution.md` at all. A direct grep
  showed it did — prominently, as the second entry (after the Architecture Handbook), just not
  first. This was reported as concrete evidence the document had been drafted without live repo
  access (which it admitted itself: "the sandbox... does not hold the `aquasavannah-landvault`
  working tree").
- Two other findings were independently verified and *confirmed* correct: the ADR floor really was
  022, and `CLAUDE.md`'s existing LV-013 citation really did already point at the correct, adopted
  document.

## The full documents, and the real fix

Three follow-up pastes supplied the actual full text: **LV-000 v1.8 (Working Edition, Revision
H)**, the **Governance Baseline (Revision H)**, and the **Development Plan (Execution, Revision
H)**. Reading the full Constitution resolved the "Controlled Platform Authority" gap directly: v1.8
**incorporates** the adopted v1.0's named principles by reference (Article II §4) rather than
transcribing them, restates only the three it could state accurately (Controlled Platform
Authority at Article IX §3 — kept at its original number, load-bearing and unrenumberable by
Article III §6; Bounded Context Sovereignty at Article V; Trust Network Doctrine at Article VI),
and leaves the remaining seven adopted principles as an honest, open "Schedule 1 Part B" register
rather than inventing text for them. A protected citation chain (`LV-000 Article IX §3 →
ENGINEERING_RULES.md rule 9 → ADR-021 → ADR-022 → ...`) was explicitly preserved, unbroken, by
design.

A companion "Claude Code Kickoff Prompt" specified exactly how a fresh session should onboard these
three documents (Step 0) and re-observe the repository's facts before acting (Step 1) — and one
line in its own "Notes for you, not the agent" section was honoured directly: the Constitution
swap (renaming the existing adopted file before installing v1.8 over the old name) was flagged as
something **a human should do deliberately, not delegate** — so it was raised as an explicit
question rather than performed automatically.

## What was actually done, once authorised

On explicit instruction ("1 and 2 approved do it yourself"):

1. `git mv docs/LV-000-constitution.md docs/LV-000-constitution-v1.0-adopted.md` — preserving the
   adopted v1.0 text unmodified, verified afterward still to contain "Controlled Platform
   Authority" thirteen times.
2. The full v1.8 text written as the new `docs/LV-000-constitution.md` (410 lines, transcribed in
   full from the pasted source, checked page by page rather than summarised).
3. `docs/EXECUTION_PLAN.md` and `docs/GOVERNANCE_BASELINE.md` written in full from their respective
   sources.
4. The Governance Baseline's Parts D, C, and B applied as real edits, in that order (Part D first,
   per the Baseline's own "highest-value, cheapest" reasoning):
   - **Part D** (`CLAUDE.md`): LV-000 moved to the first index entry (was second), its description
     rewritten to actually describe v1.8 rather than the stale v1.0 text it inherited under the new
     filename; a "One constitution" note, a `## Precedence` block, and an `EXECUTION_PLAN.md`
     pointer added; the opening summary's stale "no B4 code exists" line corrected against the
     file's own later sections and the real ADR directory.
   - **Part C** (`ENGINEERING_RULES.md`): a header amendment, and eight of nine rules anchored to
     specific v1.8 Articles by direct textual match — Section 2 (secure-by-default config) left
     deliberately unanchored, since no confident constitutional match existed and an invented one
     would be worse than none. Rule 9's actual text was verified, by diff, to contain zero
     deletions — only a citation anchor was added above it.
   - **Part B** (ADRs): checked, rather than assumed — **no ADR actually cited "LV-000" or
     "Article IX" directly**; the Governance Baseline's own citation table had assumed a direct
     citation that didn't exist. The real chain ran through `ENGINEERING_RULES.md` rule 9, which
     Part C had just anchored — so no ADR file needed editing, and the full seven-link chain was
     verified end-to-end with zero breaks.

All of this was committed locally, in small reviewable pieces, and **not pushed** — a push/branch-
protection request was raised separately and, on inspection, found not actually resolved (`gh` CLI
absent from the environment; `origin/main` still ~19–26 commits behind; three empty-looking
`copilot/*` branches discovered on fetch, apparently an earlier, unsuccessful attempt at the same
two problems by a different automated process). That question was left open rather than acted on
from an unverified claim that it was already solved.
