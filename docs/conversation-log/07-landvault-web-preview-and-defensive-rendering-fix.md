# 7. `landvault-web` Preview and the Dashboard Rendering Crash

**Repository:** `aquasavannah-landvault`

## Context: a second stack appears

Separately from the Phase 0/Phase 1 governed backend work in entries 5 and 6, an unrelated Replit
automated agent had, at some point, restructured `origin/main`: the entire governed Python/FastAPI
codebase was moved into `.migration-backup/`, CI was silently disabled, and a new Node/TypeScript
pnpm workspace (`artifacts/`, `lib/`, `scripts/`) was added at the repository root — including a
Vite + React frontend at `artifacts/landvault-web` and an Express stub at `artifacts/api-server`.
The mandatory Reality Verification Gate caught this contradiction before any remediation began, and
it was reported rather than worked around.

Once the user dropped the formal governance framing and asked for the two stacks to be reconciled
("authorise all Replit changes... align them with the Replit user interface... you are now working
as a senior information system analyst and developer"), two clarifying questions were asked and
answered before any structural work: the Python FastAPI backend stays authoritative (the Node
Express stub is not built out further), and "update remaining code" meant fixing structural/path
issues only, no logic rewrite. The governed backend, docs, and infra were moved back to root paths
on branch `chore/restore-governed-backend-to-root` (230 tests still passing, `ruff`/`mypy` clean),
committed, and pushed as a feature branch — never to `main` directly, per the standing rule that
Claude Code pushes feature branches only and all changes to `main` go through an approved,
squash-merged pull request.

## Preview, inspection only

Before any frontend/backend integration was even discussed, the next instruction was explicitly
narrower: preview `artifacts/landvault-web` as it already exists, with a hard boundary — no
redesign, no backend wiring, no new endpoints/auth/CORS, stop once it's running and reported on.

Getting it running on Windows surfaced a chain of purely mechanical blockers, each identified and
reported before being touched:

- `pnpm` wasn't installed (global tool, not a project dependency) — installed.
- The workspace's `pnpm-lock.yaml` had been generated on Linux (Replit), so four native
  optional-dependency binaries (`@rollup/rollup-win32-x64-msvc`, `@esbuild/win32-x64`,
  `lightningcss.win32-x64-msvc.node`, `@tailwindcss/oxide-win32-x64-msvc`) were unresolved for
  Windows — a known npm/pnpm bug (npm/cli#4828). Fixed by downloading each tarball directly and
  extracting it into the exact `node_modules/.pnpm/...` path Node's resolver expects — local-only,
  gitignored, no tracked file touched.
- Git Bash silently mangled the required `BASE_PATH=/` environment variable into a Windows path
  (`/Program Files/Git/`) before Vite ever saw it. Fixed with `MSYS_NO_PATHCONV=1`.

With those cleared, the dev server ran cleanly at `http://localhost:5173/`. Playwright installation
and `chromium-cli` both proved unavailable in this environment (downloads consistently timed out),
so the five screens (`/`, `/parcels`, `/parcels/new`, `/parcels/:id`, `/verify`) were classified by
reading the source rather than by driving a rendered browser — a substitution flagged explicitly to
the user rather than presented as visual confirmation. The finding that mattered most for later:
**every screen is wired to real `@workspace/api-client-react` hooks with zero mock data** — but the
client's `setBaseUrl()` is never called anywhere in the app, and `vite.config.ts` has no dev-server
proxy, so every screen would load, then fail against a real backend, because none is configured to
be reachable yet. A follow-up "the preview won't open in my browser" turned out not to be a server
problem at all — the process, firewall rule, and both `curl` and `Invoke-WebRequest` all confirmed a
healthy `200 OK`; the likely cause was pointed back to the browser/proxy side rather than restarted
blindly.

## The crash, and its actual root cause

Manually exercising the running preview then produced a real crash:
`Cannot read properties of undefined (reading 'toLocaleString')`. Reproducing it precisely (not
guessing) meant tracing what a relative fetch to `/api/dashboard/stats` actually resolves to with no
proxy configured: `curl -i http://localhost:5173/api/dashboard/stats` returns `200 OK`,
`Content-Type: text/html` — Vite's own SPA fallback, `index.html`, served because nothing else
matches that path.

The generated fetch client (`lib/api-client-react/src/custom-fetch.ts`) treats any `response.ok` as
success; for a non-JSON body it falls back to returning the raw text, so `useGetDashboardStats()`
resolves with `data` being the literal HTML string, mistyped as `DashboardStats` and passed through
react-query as `isLoading: false, isError: false`. `dashboard.tsx` only checked `stats ? … : null` —
truthy, not shaped — so it reached `stats.total_parcels.toLocaleString()`; on a string, `.total_parcels`
is `undefined`, and the crash follows exactly. This wasn't "the request failed" or "still loading" —
it was a *malformed success* being trusted because it was present, which is a real defect
independent of whether a backend is ever connected: a real backend returning an unexpected
content-type or a truncated body would reproduce the identical crash.

## The fix, kept deliberately narrow

The user's authorization was explicit about scope: rendering safety only, no backend connection, no
invented data, no fake `0` values standing in for "unknown." The fix applied the same shape:
`Array.isArray()`/`typeof === "number"` guards in front of every place that had trusted an
API-derived value's presence without checking its shape, replacing a silent `null`/crash with an
explicit "unavailable" state, across five files (`src/lib/utils.ts` gained a `formatNumber()`
helper; `dashboard.tsx`, `parcels/index.tsx`, `parcels/detail.tsx`, `verify.tsx` were each patched at
their specific unsafe site). A systematic grep for the same category — unguarded `.toLocaleString()`,
`.map()`, `.length`, `.filter()` on API results — found four more latent instances that hadn't
crashed yet only because no one had hit that exact code path (a malformed evidence list would have
thrown `evidence.map is not a function`; a malformed search result would have thrown on
`.items[0]`). Each was fixed the same way. One unsafe call was found and deliberately *not* touched —
`components/ui/chart.tsx` — because it's shadcn boilerplate imported nowhere in the app; fixing dead
code wasn't what was authorized. A mutation `onSuccess` handler in `parcels/new.tsx` with a similar
smell was also left alone, because deciding what a failed-create UX should do is a product decision,
not a mechanical rendering fix.

`tsc --noEmit` showed the identical pre-existing error set before and after (unrelated implicit-`any`
and unbuilt-declaration-output errors, none newly introduced), and `vite build` succeeded cleanly.
The dev server was stopped and restarted fresh against the patched source to verify no compile
regressions, and all five routes were re-confirmed reachable.

## Where this leaves things

The frontend is now defensively safe to preview without a backend attached — it shows explicit
loading/empty/error states instead of crashing — but it is still, deliberately, not connected to
anything. FastAPI remains the authoritative governed backend; nothing in this entry's scope changed
that, added an endpoint, or began integration. That reconciliation — if and when it happens — is
still an open, separate decision.
