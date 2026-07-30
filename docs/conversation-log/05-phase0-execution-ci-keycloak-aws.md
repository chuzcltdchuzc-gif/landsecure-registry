# 5. Phase 0 — Committing, CI, Keycloak Export, and the AWS Decision

**Repository:** `aquasavannah-landvault`

## Committing the reconciliation

On instruction to proceed through "PR-0.1 through PR-0.5," the reconciliation work from entry 4 was
committed in three clean, separately-reviewable commits (constitution swap; execution plan and
governance baseline; the `CLAUDE.md`/`ENGINEERING_RULES.md` patches) — nothing bulk-committed, each
message explaining the *why*, not just the diff. `pytest` was re-run before and after: 148 passed
both times, confirming no regression from documentation-only changes.

## PR-0.2 — `npm test`

`frontend/package.json` had no `test` script at all. Rather than choose between the zero-dependency
placeholder (`"test": "tsc --noEmit && next lint"`) and adopting Vitest, the choice was put to the
user directly — the Development Plan itself says this is a governed dependency decision requiring
explicit approval, not something an agent picks unilaterally. The placeholder was chosen, verified
to actually run and pass (`npm test` exercised live, not assumed), then committed.

## PR-0.3 — CI

`backend-ci.yml` and `frontend-ci.yml` were added as **two separate commits**, not one bulk copy —
the Governance Baseline's own Article XII §4 treats a bulk grant of automation authority as
prohibited. Before either was committed, every command the workflow would run was executed locally
first: `ruff check .` (clean), `mypy app tests` (clean, 95 files), `pytest -q` (148 passed) for the
backend; `npm run typecheck`, `npm run lint`, `npm test`, `npm run build` (all passing, a full
production build actually completing) for the frontend. Python was pinned to 3.14 and Node to 24 to
match the locally-verified dev environment exactly, not a generic default.

## PR-0.4 — Keycloak, branch protection, secrets

Docker was found to be already running live containers for this project (Postgres, backend,
frontend, and Keycloak, all up for over 24 hours) — which changed "export the Keycloak realm as
code" from a hand-authoring exercise into a genuine export. `kcadm.sh` was used, inside the running
container, to authenticate and run a partial-export against the real `landvault` realm. The result
(1,428 lines) was scanned for embedded secrets before being committed — none were found, because no
custom OAuth client had been registered in the realm yet (only Keycloak's own default scaffolding
existed at that point).

Two other PR-0.4 items were explicitly *not* pushed through on assumption:

- **Branch protection** required either the `gh` CLI or the GitHub web UI; `gh` wasn't installed in
  the working environment, and — more importantly — `origin/main` was found to be genuinely stale
  (dated a week earlier than the local `HEAD`), so configuring protection on a remote branch that
  didn't yet have any of this work would have accomplished nothing. This was reported, not silently
  worked around.
- **Secrets to a manager** was reported as blocked on an upstream decision (which cloud provider),
  not a technical gap — both `CLAUDE.md` and the Execution Plan already recorded that choice as
  open.

When the user then said the `gh` CLI had been installed and the push queue resolved, both claims
were checked rather than accepted: `gh` still wasn't found in `PATH`, and `origin/main` hadn't
moved. What *had* appeared, on a fresh fetch, were three new remote branches
(`copilot/install-gh-cli`, `copilot/fix-commit-queue-issue`, `chuzcltdchuzc-gif-patch-1`) — names
strongly suggesting a GitHub Copilot coding-agent session had already attempted exactly these two
problems elsewhere, but a check showed the first two branches had **zero commits** relative to
`main`: nothing had actually landed. This was reported plainly rather than proceeding on an
unverified "it's fixed" claim.

## Recording AWS as compute provider

Once the user made the decision explicitly ("record 'AWS' as the compute/cloud provider"), it was
recorded as infrastructure-as-code — `infra/terraform/versions.tf` gained a real
`required_providers`/`provider "aws"` block (region-only, no resources yet; not run through
`terraform validate`, since Terraform wasn't installed in the authoring environment, and that
limitation was stated rather than hidden) — plus administrative notes in `CLAUDE.md` and
`docs/EXECUTION_PLAN.md` §6 recording the decision inline, without rewriting the original "chosen
at deploy time" text those documents already carried. Formal capture was explicitly left for a
future ADR-024, not claimed as already complete by this note.

(A later, out-of-band development — recorded in `CLAUDE.md`'s own subsequent edits, not narrated
here — shows AWS and Keycloak were both superseded the same week by an ADR-025 adopting Supabase as
the production platform target. That happened after this log's own narrative catches up to real
time and is left to the ADRs themselves to describe.)
