# 11. `Development-Plan` — Integrated MVP Programme, IMVP-1 & IMVP-2

**Repository:** `chuzcltdchuzc-gif/Development-Plan`.

## A recurring pattern: governance authorization, then a gated slice

Following the status report (entry 10), Governance Authority opened a formal, multi-slice "Integrated
MVP" programme aimed at one observable outcome — a real user signing in through the existing React UI
and completing a real registry journey against the governed FastAPI backend — with an explicit
permanent rule: feature branches only, never a direct push to `main`, and an instruction to stop at
every gate rather than push through uncertainty by assumption. This pattern repeated across every
slice that followed: a detailed authorization arrived, work proceeded until either the slice's own
exit gate or a genuine unresolved question was reached, and a structured status report went back
before the next slice began.

## IMVP-1 — Contract Reconciliation, and a decision escalated rather than made

The first slice was explicitly inspection-only: build the authoritative contract map between
`artifacts/landvault-web` and the governed backend, and do not start fixing anything yet. Re-deriving
the mismatch already sketched in entry 10 at the field level confirmed it was not mechanical — the
frontend's `trust_score`, its four-value status enum, and its `latitude`/`longitude` fields (the
backend's `CreateParcelRequest` has no such fields at all, and enforces `extra="forbid"`, meaning a
submission carrying them would simply be rejected) all required a genuine architectural decision, not
a rename script. The report escalated five specific questions rather than resolving them
unilaterally — which side's naming wins, whether `trust_score` should be dropped outright, how the
frontend should obtain geometry given Registry deliberately doesn't own it, what the evidence-status
vocabulary mismatch implied, and how to stop the drift recurring — and stopped there.

## Governance resolves the decisions; IMVP-2 executes them

Governance Authority's response resolved every escalated point at once: the governed backend is
authoritative over the legacy contract; `trust_score` is explicitly rejected, citing the same
historical Base44 finding entry 10 had already flagged; geometry stays a Spatial concern, with a
narrow read-contract proposal preferred over convenience; evidence vocabulary is deferred entirely to
whenever an Evidence HTTP API is actually authorized. IMVP-2 then executed this concretely: a full
rewrite of `lib/api-spec/openapi.yaml` to mirror the backend's real `_parcel_view` shape field-for-
field, replacing the fictional `DELETE /parcels/{id}` with the real one-way
`POST /parcels/{id}/archive`, and dropping `/dashboard/stats` outright since no such backend endpoint
exists and inventing one would be new capability, not stabilization. `trust_score` was removed
everywhere, including deleting the now-fully-unused `TrustScoreGauge` component; the Registry list
page's search/filter UI — discovered to be sending parameters the backend's list endpoint silently
accepts and ignores, since it implements no query-parameter handling at all — was rewritten to filter
the real, complete list client-side instead, an honest fix rather than a cosmetic one.
`/verify`'s copy was corrected line by line against the non-adjudication doctrine ("Title
Verification" to "Evidence Record Verification," "cryptographically verified" language removed
entirely alongside the evidence panel it belonged to, an explicit disclaimer added), and the
sidebar's hardcoded "Oluwaseun Adebayo / Registry Admin" identity was replaced with a neutral
"Not signed in" placeholder — deliberately not another hardcoded name, in preparation for real
session data.

## A material correction, surfaced mid-stream

While checking whether the orphaned `docs/b5.3-final-acceptance-record` branch was safe to close as
redundant, its actual content — never previously read in full — turned out to disclose something the
whole session's prior reporting had gotten wrong: B5.3's evidence-upload code was already on `main`,
landed via a direct push that bypassed branch protection under an earlier Governance Authority
direction accepting technical completion while explicitly recording the merge process itself as
non-compliant. This was not taken on the document's word — `git merge-base --is-ancestor` confirmed
the named commit really is an ancestor of `main`, and reading `evidence_service.py` directly off
`main` confirmed `upload_evidence()` is really there. The prior claim that "B5.3 is not on `main`"
had quietly conflated two different facts — GitHub's own merge-tracking (genuinely `false`) and the
code's actual presence (genuinely `true`) — because a squash commit has no ancestry link back to the
PR it superseded, so GitHub never auto-detected the merge and PR #12 sits open regardless. The
correction was reported prominently rather than folded quietly into the ongoing work, along with the
recommendation that the disclosure document itself — which never reached `main` — be merged through a
real PR rather than treated as redundant.

## A pre-approved, separately-shipped extension

Governance Authority also approved, in principle, extending the non-adjudication check
(`backend/tests/support/non_adjudication.py`, Engineering Rule 10) beyond backend Python source into
frontend user-facing copy. Since the existing check is AST-based and Python-specific — extending its
literal scope to `.tsx` source isn't a one-line addition, it needs a different scanning mechanism
entirely — this was built as a small, dependency-free Node script
(`artifacts/landvault-web/scripts/check-non-adjudication.mjs`) mirroring the backend's own blocklist
by hand (with an explicit comment that the two lists have no automatic sync and must be kept aligned
manually), including its own embedded self-test rather than pulling in a test framework that doesn't
exist anywhere in this workspace yet. Run against the current frontend source, it reported no
violations — worth noting explicitly, since the blocklist's phrases are narrowly ownership/title-
specific and would not by themselves have caught the softer "Title Verification" framing corrected by
hand in IMVP-2; the two efforts were complementary, not redundant. Pushed as its own focused branch,
separate from the auth work, per Governance Authority's own preference for a clean review boundary.
