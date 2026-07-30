# 3. Discovering `aquasavannah-landvault`, and a Pure Archival Extraction

**Repositories:** `landsecure-registry` (session root); real work against `aquasavannah-landvault`

## Finding the actual repository

A directory search for `backend/pyproject.toml`-style markers across the user's GitHub folder
turned up `c:\Users\chuky\Documents\GitHub\aquasavannah-landvault` — and it matched everything the
`CLAUDE-plan` docs described: real bounded contexts (`identity`, `registry`, `spatial`) under
`backend/app/contexts/`, a `kernel/` (authorization + security), 22 real ADRs, and a git history
showing genuine incremental DDD delivery (B1 → B2 → B3 → B4, each frozen under its own ADR).

Rather than trust the Development Plan's stated "119/119 backend tests" claim, the suite was run
directly, live, in-session: **148 passed, 0 failed** — more than claimed, consistent with real
progress (B4 Spatial work) since that number was last recorded. This match between the codebase's
own git history and an independently-run test result was the first hard confirmation that this was
the real repo, not another layer of unverified description.

A second discovery: the git log's most recent commits were titled "Adopt LV-000 v1.0," "Add
LandVault Bible Volume I," "Add LandVault Bible Volume II," "Add LV-013 — Market Intelligence
Report" — the exact naming scheme the very first prompt of this entire session had used. The
"LandVault Bible programme" work this whole session had been built around had, from the start, been
about this repository.

## A pure archival extraction, not a reconciliation

A later instruction asked explicitly for an **archivist, not architect** exercise: recover and
publish the exact, currently-adopted governance documents (Constitution, Bible, ADRs, Engineering
Rules, architecture docs, `CLAUDE.md`, a "Development Plan"), with no interpretation, no repair, no
renumbering — and, where a document couldn't be found, report it missing rather than invent it.

Before extracting anything, the working tree was reverted to `HEAD` — a prior turn's speculative
Bible-numbering sync (see entry 4) had left draft `LV-001`–`016` files sitting uncommitted in the
working tree, which would have made the "currently adopted baseline" being extracted actually
reflect an unadopted draft. That was undone first, restoring the tree to the last real commit,
before any archival copying began.

The extraction produced byte-verified copies (via `diff -q`) of: `LV-000-constitution.md` (v1.0),
the adopted Bible (Volume I, Volume II, `LV-013-market-intelligence-report.md` — **not** an LV-001
through LV-016 numbered set; that numbering only existed in a separate, unadopted v1.7 draft), 21
real ADRs, and the Engineering Rules / Architecture Handbook / Platform Intelligence Architecture /
root `CLAUDE.md` / `REBUILD_PLAN.md`.

Two real gaps were reported, not invented around:

- **ADR-020 is genuinely missing** — the sequence jumps 019 → 021 with no file and no reference to
  one anywhere.
- **A file literally named `DEVELOPMENT_PLAN.md` doesn't exist in `aquasavannah-landvault`** — only
  in the separate `CLAUDE-plan` docs pack. `REBUILD_PLAN.md` fills the same functional role but
  under a different name, and the two were never silently conflated.

The validation report's single highest-severity finding, traced link by link, was that the term
**"Controlled Platform Authority"** — a named constitutional principle in the adopted v1.0
(Article IX §3), and the doctrine `ADR-021`/`ADR-022` (governing already-shipped B4 code) and
`ENGINEERING_RULES.md` rule 9 cite by name — **does not appear anywhere** in the separate,
unadopted v1.7 draft Constitution. This became the central problem the next entry resolves.

**Output (scratch only, not committed to any repo):** `Governance_Source_Index.md` and
`SOURCE_VALIDATION_REPORT.md`, alongside byte-verified copies of every recovered document.
