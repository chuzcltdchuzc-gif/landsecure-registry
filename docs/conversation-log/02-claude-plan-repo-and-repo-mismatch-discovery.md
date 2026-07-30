# 2. The `CLAUDE-plan` Repo and the Repository-Mismatch Discovery

**Repositories:** `landsecure-registry` (session root) investigating a separate `CLAUDE-plan` repo

## An engineering-governance mega-prompt, and a script it referenced

A large "Engineering Implementation Governance Specification" was posted — an exhaustive
production-readiness rule set (no placeholders, strict layering, DDD aggregates, security/storage/
API/testing standards, a mandatory self-review, and a required closing "✅ COMPLETE" certification
format) — followed by a pointer to a local script:

```
cd Development-Plan
unzip ~/Downloads/LandVault-Phase0-Governance-Pack.zip -d _phase0
./_phase0/commit-development-plan.sh
git push -u origin feat/development-plan-phase0
```

Two things were flagged immediately, before any action was taken:

1. **Neither the zip nor a `Development-Plan` directory existed** anywhere reachable — checked
   directly rather than assumed.
2. Even if they had existed, **blindly unzipping and running a downloaded script that commits and
   pushes to a remote** is exactly the kind of untrusted-code execution that shouldn't happen
   sight-unseen — stated as a standing position, not contingent on this specific script turning out
   fine.

Separately, the mega-prompt's own demand — a fully certified, zero-technical-debt, government-
deployment-ready enterprise platform build delivered in a single response, closed out with a
self-issued "100% COMPLETE" report — was declined on principle: fabricating that certification
would be the exact failure mode the LandVault Constitution (encountered later, in
[entry 4](04-constitutional-reconciliation-lv000-v1.8.md)) explicitly names — a system asserting
trustworthiness it hasn't earned.

## Finding the real repo

A follow-up instruction to read `https://github.com/chuzcltdchuzc-gif/CLAUDE-plan.git` led to
cloning it (read-only, into scratch). It turned out to be genuine — not a repeat of the earlier
fabricated placeholders — containing an authored `LV-000` (Constitution v1.7) through `LV-016`
library, three drafted ADRs, CI workflow files, a phased `DEVELOPMENT_PLAN.md`, and `.claude`
agent/command configs. The included scripts (`commit-development-plan.sh`, `finalize-adrs.sh`) were
read in full before any judgement was made about them — they turned out to be safe in isolation
(no network calls, refuse to run on a dirty tree, don't push), but that safety was established by
reading them, not assumed from their names.

**The key finding:** `AGENTS.md` and `DEVELOPMENT_PLAN.md` in that repo described a codebase with a
Python/FastAPI backend, a Next.js frontend, Terraform/Docker infra, and **"119/119 backend
tests," B1/B2/B3 "frozen & verified."** None of that exists in `landsecure-registry` (a Base44
Vite/React app with no `backend/`, `frontend/`, or `infra/` directories, no Python, no pytest).

Asked directly whether the two were related, the answer was: **a different repo entirely.** That
resolved the mismatch running through the whole session up to that point — the governance
vocabulary (`B1–B4`, `LV-000`) used in the *very first* prompt of this session had always described
that other, real repository, not `landsecure-registry`.

## Consequence for the earlier documents

Both `Volume-III-PRD.md` and the Phase 4A review (entry 1) were given an explicit scope notice: they
describe the `landsecure-registry` Base44 prototype only, are **not** governed by or traceable to
the real LV-000, and no cross-reference in them to that other repo's artifacts should be treated as
verified. Content was kept; framing was corrected. The Phase 4A review's headline finding ("one of
seven documents exists") was marked superseded — all seven existed, just in the other repository.
