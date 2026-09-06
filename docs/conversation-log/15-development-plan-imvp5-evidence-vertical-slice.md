# 15. `Development-Plan` — IMVP-5: Evidence Vertical Slice (PR #22)

**Repository:** `chuzcltdchuzc-gif/Development-Plan`.

## Scope, held narrow on purpose

With GD-007 reconciled (entry 14), Governance Authority authorized a genuinely narrow slice: a real,
Supabase-Storage-backed Evidence upload/list HTTP capability, stopping deliberately at a `HASHED`
status. WORM-grade sealing, Cloudflare R2, legal-hold, and any download/viewer expansion were named
as explicitly out of scope, with two hard preflight stop conditions built into the authorization
itself — one about not introducing a new runtime dependency without an approval step, one about not
introducing a new, ungoverned Storage-security architecture. The second of those two conditions turns
out, on later re-examination (entry 16), to be the one that should have fired during implementation
and did not.

## The build

On the backend, `EvidenceService` gained the same two-tier authorization pattern already established
by Registry and Spatial (ADR-015/ADR-022): a coarse role gate at the router plus a fine-grained
`_can_mutate` check in the service layer (creator-or-governance-role), backed by a new
`ParcelExistencePort` Protocol and a `PostgresParcelExistenceAdapter` — deliberately duplicated per
bounded context rather than imported across contexts, per the project's existing ADR-018 isolation
convention, rather than treated as an opportunity to share code across Evidence and Registry.
`list_evidence_for_parcel` was written to return 404 for a parcel outside the caller's tenant scope
rather than silently filtering it out of a list, matching how not-found is handled elsewhere in the
codebase. A new `SupabaseStorageAdapter` implemented the existing `StoragePort` Protocol's `put`/
`get`/`list_keys` over real HTTP via `httpx`, with `put_immutable`/`worm_grade` left raising
`NotImplementedError` since sealing is out of scope for this slice.

Two real technical blockers came up and were resolved by checking the actual environment rather than
assuming: first, whether a multipart dependency was needed for file upload turned out to be avoidable
entirely — a `data: bytes = Body(..., media_type="application/octet-stream")` parameter, once found,
appears correctly in the OpenAPI `requestBody` and lets Orval generate a `Blob`-typed client
parameter, whereas an earlier attempt using `Request` and reading `await request.body()` directly
produced no `requestBody` in the schema at all and left the generated client with no way to send file
bytes. Second, `SUPABASE_SERVICE_ROLE_KEY` needed adding to `kernel/config.py` and the local
gitignored `.env` (an earlier append attempt hadn't persisted, caught and re-added before restarting
the dev backend) to actually construct the adapter in `main.py`'s dependency override.

A recurring Orval/zod-v3 incompatibility (`z.int()` doesn't survive the toolchain) hit again for
`EvidenceResponse.size_bytes` and was fixed the same way as before — an `Annotated[int,
WithJsonSchema({"type": "number", ...})]` that changes only the OpenAPI-declared type, not the actual
wire value. A new problem specific to this slice was an ambiguous re-export: orval's zod target
generates both a runtime schema `const` and a same-named TypeScript `interface` for the first
multi-query-parameter operation in the codebase (`UploadParcelEvidenceParams`), which collided through
`lib/api-zod`'s blanket `export *`; fixed by narrowing the hand-authored barrel file rather than
touching any generated file. On the frontend, a new `EvidenceCard` component on the parcel detail page
used the raw generated `uploadParcelEvidence()` function directly (not its React Query wrapper, whose
`request` options are fixed at hook-creation time rather than per call) so the file's actual MIME type
could be set on each upload. A `SEALED` case was also added to the shared `StatusBadge` component for
the Evidence status enum — a choice that entry 16 later finds was not actually required and should be
reverted.

## Test corrections, and closing out

`test_empty_upload_rejected` initially expected a 400 but got a 422: a truly empty body is
indistinguishable from "no body sent" and is caught by FastAPI's own required-`Body(...)` validation
before the handler's manual `if not data` check ever runs — the test's expectation was corrected to
422 with a comment explaining that both layers still agree the request is rejected, rather than
forcing the code to produce a status it doesn't naturally produce. Nineteen new backend tests covered
the Evidence HTTP API and nine more covered the Storage adapter's contract against an
`httpx.MockTransport` fake, alongside the usual ruff/mypy cleanup pass. Both required CI checks came
back green, and the slice's own implementation report ended with **IMVP-5 IMPLEMENTATION COMPLETE —
LIVE BROWSER VERIFICATION REQUIRED** — explicitly not claiming a live Supabase Storage rehearsal or
real browser upload had been performed, since neither had been. That gap, and a direct challenge to
the Storage-security reasoning used to justify the service-role adapter design, is what the next
governance review (entry 16) addresses.
