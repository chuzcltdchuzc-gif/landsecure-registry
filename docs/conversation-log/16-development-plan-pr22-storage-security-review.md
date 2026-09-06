# 16. `Development-Plan` — PR #22 Storage Security Governance Review: a self-correction

**Repository:** `chuzcltdchuzc-gif/Development-Plan`.

## What was being challenged

Immediately after PR #22's implementation report (entry 15) landed, Governance Authority opened a
second, explicitly read-only review targeting one specific claim made during that implementation: that
authenticating `SupabaseStorageAdapter` with a server-side service-role key, backed by application-
layer authorization alone, constituted a governed "two independent enforcement layers" architecture —
by direct analogy to language in `docs/adr/ADR-025-supabase-platform-baseline.md`'s E2 section about
Postgres RLS. The review's own framing was pointed: was that analogy actually supported by ADR-025's
text, or had it been asserted rather than demonstrated. No code changes, merging, or approval requests
were permitted for this step — verification only.

## Re-reading the ADR, rather than trusting the earlier citation

Re-reading ADR-025 E2 and E3 in full turned up a real problem with the earlier claim. E2's "two
independent enforcement layers" language is written specifically about Postgres RLS and the PDP
("Postgres RLS continues exactly the role ADR-004 §2 already gave it... not a replacement for the
PDP") — it says nothing about Storage, service-role credentials, or bypassing anything. E3 decides
which Storage *provider* is primary (Supabase Storage over Cloudflare R2) and confirms the
`StoragePort` abstraction's shape is unchanged; it likewise says nothing about what credential the
adapter should authenticate with or whether Storage-side RLS needs to be load-bearing. The earlier
implementation report's claim — that the service-role design was "the direct extension of ADR-025
E2's already-accepted model... not a new architecture decision" — turned out to be an unsupported
analogical leap from a Postgres-specific sentence to a resource the ADR doesn't address at all, not
something the ADR actually states. The review agreed with the user's skepticism rather than defending
the earlier framing.

## The concrete gap this exposed

Checking the two controls the earlier report claimed as independent found only one of them real.
Application-layer authorization (`require_auth`/`require_role` plus `EvidenceService`'s
creator-or-governance and tenant-scope checks) genuinely runs before Storage is ever called. But the
second claimed layer — Storage's own policies — does not provide independent protection at all:
`infra/supabase/evidence_bucket.sql` grants the `anon`/`authenticated` roles no policies whatsoever,
and even if it did, a service-role key always bypasses Storage RLS by Supabase's own platform design.
So there is exactly one real control today, not two, and a bug in the application layer would have no
independent backstop at the Storage layer — a materially weaker posture than what ADR-025 E2
describes for Postgres, where the application's own database role is subject to RLS rather than
exempt from it.

Whether forwarding the caller's own request-scoped Supabase JWT to Storage instead could fix this was
assessed and found only partially true: it would prove *some* authenticated Supabase user made the
call, but LandVault's `tenant_id` is never present in the Supabase JWT at all — it is resolved
entirely inside LandVault's own hydration step against LandVault's own Postgres tables, deliberately
so, per the existing PEP's own documented principle (ADR-004 point 5: never trust the token for
authorization attributes). Making Storage RLS genuinely tenant-aware would require injecting a
tenant claim into Supabase-issued tokens via a custom Auth Hook — new integration surface in real
tension with that already-established principle, not a drop-in swap.

## Two smaller findings, and the outcome

The review also confirmed, by re-reading `status-badge.tsx`'s actual switch statement, that the
`SEALED` case added during implementation was never required — the component has a pre-existing
default style and no exhaustiveness check forcing every enum member to be handled, and no code path in
this slice can produce a `SEALED` item, so the case is presentationally dead code and was flagged for
removal before merge. The raw-body upload contract, by contrast, held up under the same scrutiny: the
custom `fetch` mutator's only special-casing is for string bodies, a `Blob`/`File` body passes through
unmodified, and the 10 MiB limit is enforced against the FastAPI-buffered actual byte count rather
than a client-supplied header — verified correct by source inspection and the existing hermetic tests,
with the honest caveat that an actual browser round-trip still hadn't been run.

Because neither the current service-role pattern nor a naive request-scoped-JWT swap could be
justified under existing governance, the review closed with a classification that reverses the
implementation report's own framing rather than ratifying it:

**PR #22 BLOCKED — STORAGE SECURITY ADR REQUIRED.**
