# 13. `Development-Plan` — OpenAPI Source-of-Truth Hardening (PR #18) & Security Metadata Hardening (PR #19)

**Repository:** `chuzcltdchuzc-gif/Development-Plan`.

## The drift problem, and making FastAPI the single source of truth

The frontend's generated client (`lib/api-zod`, Orval-generated React Query hooks and Zod schemas)
was being built from a hand-maintained `lib/api-spec/openapi.yaml` that could silently drift from
what the FastAPI backend actually served — exactly the kind of contract mismatch the project's own
earlier IMVP-4 work had already found and fixed once by hand. Governance Authority's PR #18
authorization replaced that hand-maintained file with a deterministic export script that reads the
schema straight from the live FastAPI app and writes the committed YAML, making FastAPI itself the
source of truth rather than a document someone has to remember to update in parallel. Getting the
exported schema to actually match production behavior required adding explicit `response_model=`
declarations and stable `operation_id=`s across routers that had been relying on FastAPI's defaults,
and a custom passive security scheme (`SupabaseBearerAuth`, built on `HTTPBearer(auto_error=False)`)
attached only to `require_auth` rather than the more deeply-shared `current_context_dep` — a
deliberate choice to get correct OpenAPI security metadata without changing runtime auth behavior at
all, since `current_context_dep` is used in places that don't want FastAPI's own 401 short-circuit.
PR #18 went through the standard human-approval and green-CI merge gate and was verified post-merge
before the next slice began.

## PR #19: making the security metadata itself honest

The follow-up authorization, OpenAPI Security Metadata Hardening, addressed a subtler gap: even after
#18, protected routes' *only* visible representation of authentication in the exported schema was a
plain optional `authorization` header parameter and `lv_access` cookie parameter — leftovers from
`current_context_dep`'s old `Header()`/`Cookie()` extraction — with no `security` requirement
declared at all, so a generated client had no way to know a route needed a bearer token short of
reading source code. The fix moved header/cookie extraction to reading `request.headers` /
`request.cookies` directly (removing those as visible OpenAPI parameters) and declared the
`SupabaseBearerAuth` scheme's `security` requirement on every route that actually goes through
`require_auth`. `test_openapi_security_metadata.py` was added to hold this as a standing contract
test rather than a one-time check: the bearer scheme's exact shape (`type: http`, `scheme: bearer`,
`bearerFormat: JWT`), representative protected routes across Registry/Spatial/Admin/Auth all carrying
the `SupabaseBearerAuth` requirement, the old header/cookie parameters genuinely gone, genuinely
public routes (`register`/`login`/`invitations/accept`/`refresh`) carrying no security requirement at
all, no invented OAuth scopes or scopes lists, and no accidental double `/v1/v1` prefixing anywhere in
the exported paths. (This same test file was extended again later, during the Evidence vertical
slice — entry 15 below — to hold the same guarantee for the two new Evidence operations; it wasn't
special-purpose to #19.)

Between the two PRs, a separate environment-only task restored the local live smoke-test stack
(identifying and killing stale dev-server processes, restarting backend and frontend with correct
environment variables) under an explicit "do not modify application code, never display secrets"
constraint, so the user could exercise real Supabase-authenticated flows in a browser before #19's
merge gate — the closest this slice got to a live check, since the schema-fidelity assertions
themselves are necessarily static. Both PRs followed the same discipline as the rest of the
programme: branch-per-authorization, merge only after human approval and both required CI checks
(`pytest / ruff / mypy`, `typecheck / lint / test / build`) green, never self-approved, never pushed
directly to `main`.
