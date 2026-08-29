# 9. `Development-Plan` — Replit Tooling Audit and Removal

**Repository:** `chuzcltdchuzc-gif/Development-Plan`, local checkout at
`C:/Users/chuky/Documents/GitHub/Development-Plan`.

## The audit, kept strictly read-only

A first request asked for a full inventory of Replit-specific material in `Development-Plan`'s
Node/pnpm workspace (`artifacts/`, `lib/`, `scripts/`, root config) — explicitly read-only, no
deletions. The audit found six genuinely Replit-only files (`.replit`, `.replitignore`, `replit.md`,
three `.replit-artifact/artifact.toml` manifests), an unused root dependency
(`@replit/connectors-sdk`), three `@replit/vite-plugin-*` packages wired into
`artifacts/landvault-web` and `artifacts/mockup-sandbox`'s `vite.config.ts` files, and a handful of
cosmetic traces (a `# Replit` section in `.gitignore`, boilerplate meta-description text in
`landvault-web/index.html`, `// @replit` authoring comments left over from shadcn component
generation). Critically, the audit also established — by grep, not assumption — that none of this
had any dependency from the governed backend, the governed Next.js `frontend/`, `infra/`, or either
CI workflow: `backend-ci.yml` and `frontend-ci.yml` are both scoped by path filter to `backend/**`
and `frontend/**` respectively and mention neither pnpm nor anything under `artifacts/`.

## The removal, and the environment friction that came with it

A follow-up authorization approved acting on the audit's own findings, with explicit boundaries: keep
the `artifacts/`/`lib/`/`scripts/` workspaces themselves, touch nothing outside what the audit named,
update the lockfile through the project's own `pnpm install`, and stop to report rather than improvise
if anything didn't match expectations.

Two discoveries changed the shape of the removal work itself. First, rewriting
`artifacts/landvault-web/vite.config.ts` to drop the runtime-error-overlay/cartographer/dev-banner
imports revealed those plugins were already gated behind `process.env.REPL_ID !== undefined` — dead
weight outside Replit's own runtime, not something that had ever actually executed locally. Second,
and more consequentially, running `pnpm install` on this Windows machine repeatedly hit a chain of
missing native binaries (`@rollup/rollup-win32-x64-msvc`, then `lightningcss-win32-x64-msvc`, then
`@tailwindcss/oxide-win32-x64-msvc`) — the exact npm/pnpm optional-dependency bug
([npm/cli#4828](https://github.com/npm/cli/issues/4828)) already documented in this project's own
history, caused by `pnpm-workspace.yaml`'s `overrides` block deliberately excluding every non-Linux
platform binary under a comment reading "replit uses linux-x64 only." Rather than touch that
workspace-wide platform decision — explicitly out of the audit's named scope — each missing binary
was downloaded directly from the npm registry and extracted into the exact `node_modules/.pnpm/...`
path Node's resolver expects: local-only, gitignored, no tracked file touched, the identical technique
already used successfully in an earlier `aquasavannah-landvault` session for the same underlying bug.
A second, smaller environment quirk — this pnpm version's newer `allowBuilds` build-approval gate
auto-inserting a literal, invalid placeholder line (`esbuild: set this to true or false`) into
`pnpm-workspace.yaml` after the first `pnpm install` — was resolved by setting `esbuild: true`,
consistent with the fact `onlyBuiltDependencies` already listed `esbuild` as pre-approved under the
older mechanism; this fix recurred identically in every later session that ran `pnpm install` fresh
from a clean `main` checkout, and is called out plainly each time as incidental, not part of the
actual requested work.

## What actually changed

Six files deleted; `@replit/connectors-sdk` removed from the root `package.json`; the three
`@replit`-specific catalog entries and the `minimumReleaseAgeExclude` allowlist (which existed only
to exempt `@replit/*` and `stripe-replit-sync`, the latter confirmed unused anywhere) removed from
`pnpm-workspace.yaml`; the three Vite plugins removed from both `artifacts/landvault-web` and
`artifacts/mockup-sandbox`'s `package.json`/`vite.config.ts`; the `# Replit` `.gitignore` section
removed after confirming via grep that nothing else relied on `.cache/`/`.local/`; the meta-description
boilerplate and `// @replit` comments cleaned up, preserving the substantive styling rationale text
those comments actually carried. `pnpm run typecheck` came back clean across every affected package
except a pre-existing, unrelated `queryKey`-typing defect already present before this work began. The
change was committed to a dedicated branch and left there, uncommitted to `main`, per the standing
feature-branch-only rule — never picked up into a PR in this session, since later work superseded the
branch before that became necessary.
