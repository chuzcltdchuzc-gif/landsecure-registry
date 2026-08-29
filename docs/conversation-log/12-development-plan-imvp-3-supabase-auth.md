# 12. `Development-Plan` — IMVP-3: Supabase Authentication & Tenant Integration

**Repository:** `chuzcltdchuzc-gif/Development-Plan`.

## First pass: stopping at a real gate, not an invented one

IMVP-3's authorization set a specific architectural discipline before any code: Supabase Auth answers
who a user is, LandVault's existing PDP/PEP/tenant model continues to answer what they may do — the
provider is being replaced at the identity boundary, not used as an excuse to redesign B1. The entry
assessment this required, built by reading the actual identity code rather than recalling it, found
the boundary cleaner than expected: `JwtVerifier` (`kernel/security/jwt.py`) turned out to already be
completely provider-neutral, taking a `JWKSProvider` protocol and an issuer/audience pair as
constructor arguments with zero Keycloak-specific logic in it — only `KeycloakJWKSProvider` itself
(knowing the shape of Keycloak's JWKS URL) and `KeycloakIdentityProvider` (the Direct Access Grant
register/login/refresh proxy, which has no Supabase equivalent at all, since Supabase's own SDK
authenticates the frontend directly) were genuinely provider-specific. A subtler finding was that the
`identity_users.keycloak_subject` column — a real, persisted, unique column in a frozen B1 table, not
just a naming choice in code — was Keycloak-branded by name while being provider-neutral in function.

Two things stopped the work at that point rather than pushing through. First, the frontend needed a
genuinely new dependency — no existing library in the workspace could safely replace secure session
storage and token-refresh timing, and hand-rolling that logic via raw `fetch` calls would trade
security for dependency-avoidance, which the authorization explicitly prohibited either direction of.
A formal Dependency Approval Request for `@supabase/supabase-js` was produced rather than installed
speculatively. Second, the column-naming question was flagged as exactly the kind of decision the
authorization's own stop conditions named — a migration touching identity semantics in a frozen
table — and left for Governance Authority rather than resolved by assumption.

## The unblock, and the implementation that followed

Governance Authority approved the dependency, endorsed provider-neutral terminology over continuing
to conceptually call a Supabase identifier a "Keycloak subject," and authorized a narrow, non-
destructive rename migration if one could be shown not to touch roles, membership, or tenant
authority. Confirming that no RLS policy anywhere referenced the column by name made the rename
option safe rather than assumed safe: a new migration renamed `keycloak_subject` to
`identity_subject`, purely (`ALTER TABLE ... RENAME COLUMN`, no data transformation, symmetric
downgrade), threaded identically through the domain aggregate, ORM model, repository port, and all
seventeen call sites across application code and tests — a mechanical, verified rename, not a
reinterpretation of any historical Keycloak-issued identifier as something it isn't.

On the backend, `JwtVerifier`'s previously-hardcoded RS256 algorithm became a constructor parameter
(defaulting to RS256, leaving Keycloak's own call site untouched) specifically because Supabase's
asymmetric project keys default to ES256 — a new `SupabaseJWKSProvider`, structurally identical to the
Keycloak one, was wired into `main.py`'s production token verification in its place, while
`KeycloakIdentityProvider` was deliberately left wired and untouched, since it still backs the
historical register/login/refresh endpoints and their disposition was explicitly named as a separate,
deferred question rather than something to decide mid-implementation. New adversarial tests proved
properties the authorization asked for by name rather than by inference — an ES256-configured
verifier rejects an RS256 token and vice versa, a forged signature is rejected, and most pointedly, a
structurally valid token for a subject with no corresponding `identity_users` row authenticates at
`/v1/auth/me` (the existing, already-documented B1 fallback) but is denied on every role-gated route,
with nothing — no tenant, no membership, no role — silently created as a side effect. The full suite
came back at 240 passing (up from 230), ruff and mypy both clean.

On the frontend, the new dependency landed at its exact resolved version (`2.112.4`, confirmed in the
lockfile) behind a session context wiring `setAuthTokenGetter` once, at module scope, so every
outgoing API request centrally carries the current Supabase access token rather than duplicating
bearer-header logic per page — session refresh itself was deliberately left entirely to the SDK,
since reimplementing that correctly was the actual justification for taking the dependency in the
first place. A minimal sign-in page, a `RequireAuth` route wrapper that redirects an unauthenticated
visit to a governed URL rather than rendering it, and a real identity-and-sign-out block in the
sidebar replaced the last hardcoded-identity path this project had. An `AccessDenied` building block
was built for the "authenticated but unauthorized" case but deliberately not wired into every page's
error branch yet, since those branches live on the still-unmerged IMVP-2 branch and touching them here
would have created duplicate, conflicting edits across two competing branches rather than one clean
merge later.

## Verification, and its honest limits

A stale, gitignored build-cache artifact from the earlier IMVP-2 work on a different branch — dist/
output built at a point when the OpenAPI contract had already been trimmed down — briefly produced a
confusing, self-contradictory set of type errors on this branch before being traced to its actual
cause and cleared with a forced library rebuild, rather than patched around. Once cleared, the full
production build succeeded outright for the first time this session — 2195 modules, no errors — after
resolving the same pre-existing Windows native-binary gap documented in entry 9 for three separate
packages this time (Rollup, lightningcss, and Tailwind's Oxide engine), each fetched and placed
locally the same gitignored, untracked way. The dev server started, every route including the new
sign-in page returned a clean response, and every new or changed module transformed without error —
genuine route- and compile-level verification, reported as exactly that and no more. No headless
browser tool exists in this environment, confirmed again rather than assumed from earlier in the
session, so no DOM-level or click-through verification was performed or claimed, and no real Supabase
project credentials exist, so live authentication against an actual project remains explicitly
unverified rather than faked.
