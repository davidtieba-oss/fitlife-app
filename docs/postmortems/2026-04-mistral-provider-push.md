# Post-mortem: Mistral provider rollout broke Vercel build for ~2 sessions

**Date:** 2026-04-14
**Branches:** `claude/add-mistral-provider-oB2r6` (broken), `claude/complete-mistral-provider-Hm5pp` (fix)
**Impact:** Vercel auto-deploy red for ~2 Claude sessions. No production impact (preview-only).

## TL;DR

Adding multi-provider AI support (Anthropic + Mistral) shipped a partially-applied commit that broke the Vercel build, then took most of a second session to recover. Two compounding root causes:

1. The GitHub MCP write tools (`create_or_update_file`, `push_files`) re-upload the **entire file** on every write and become unreliable above ~15 KB. `src/lib/storage.ts` (24 KB) and `src/app/settings/page.tsx` (33 KB) sit above that threshold, so any cross-cutting change that touches them via MCP is fragile.
2. `src/lib/storage.ts` is a god-module covering profiles, nutrition, workouts, plans, photos, AI settings, chat history. Any change to any subsystem forces a large-file push.

The eventual fix sidestepped both by **creating a small new module** (`src/lib/ai-providers.ts`, ~3.5 KB) instead of editing the large existing one, and repointing the small consumers to import from it.

## Timeline

**Session 1 — initial Mistral rollout**
- Designed multi-provider surface: `AIProvider`, `PROVIDER_LABELS`, extended `AiSettings` (per-provider model fields), `getActiveModelInfo`.
- Added consumers: `src/components/AIBadge.tsx` (new), `src/lib/ai.ts` (rewritten to route to `/api/ai` or `/api/mistral`), `src/app/api/mistral/route.ts` (new).
- Commit `953b32d` landed on `claude/add-mistral-provider-oB2r6` containing the consumers but **not** the corresponding `storage.ts` updates. Likely a silent push failure on the largest file.
- Vercel build failed: `Command "npm run build" exited with 1` — TS errors for missing `PROVIDER_LABELS`, `getActiveModelInfo`, `AiSettings.provider`, etc.

**Session 2 — recovery**
- Used `mcp__github__get_file_contents` to confirm what actually landed on the branch. `storage.ts` was the pre-Mistral version; consumers were post-Mistral.
- **Plan A**: rewrite `storage.ts` and `settings/page.tsx` via MCP `create_or_update_file`. Both pushes timed out (~25 KB and ~33 KB).
- Local `git push` was unavailable that day (sandbox network 503s).
- **Plan B**: create a small standalone module `src/lib/ai-providers.ts` containing the new symbols, repoint `AIBadge.tsx` and `ai.ts` to import from there. Each push <4 KB. Succeeded in 3 commits.
- Draft PR opened against the broken branch so merging the PR repairs that branch's deploys.

## Root causes

| # | Cause | Why it bit us |
|---|---|---|
| 1 | MCP write tools have no diff/patch mode — every edit re-uploads the whole file. | Above ~15 KB the tool call gets unreliable; above ~30 KB it fails consistently. Both `storage.ts` and `settings/page.tsx` are above that line. |
| 2 | `src/lib/storage.ts` is a god-module (24 KB) covering 13+ subsystems. | Any new subsystem (AI provider config, here) forces a large-file push and hits cause #1. |
| 3 | No atomic multi-file commit was used in Session 1 — per-file `create_or_update_file` calls, one of which silently failed. | Consumers landed without their producers; the branch was structurally broken. |
| 4 | No pre-push build gate. Neither `tsc --noEmit` nor `next build` ran before the commit was pushed. | TS errors only surfaced when Vercel tried to build, ~minutes later. |
| 5 | The local-git escape hatch was unavailable (sandbox network was blocking pushes). | When MCP fails for a large file, `git push` should be the fallback. That day it wasn't an option. |

## What went well

- Pivoting to a new sibling file (`ai-providers.ts`) instead of editing the god-module. Pushed in seconds.
- Keeping the legacy `AiSettings = { model: string }` export in `storage.ts` so `settings/page.tsx` (also too big to push) continued to type-check unchanged.
- Verifying actual branch state with `get_file_contents` before assuming what was/wasn't pushed.
- Asking before destructive cleanup (the leftover local `storage.ts` edit).

## File-size landscape (as of 2026-04)

Files over the 15 KB MCP push danger line — touch with care:

| File | Size | Notes |
|---|---|---|
| `src/app/log/page.tsx` | 49 KB | Too large for the Read tool too; must be read in chunks. |
| `src/app/workouts/page.tsx` | 39 KB | |
| `src/app/settings/page.tsx` | 34 KB | Bit us in this incident. |
| `src/app/plan/page.tsx` | 25 KB | |
| `src/lib/storage.ts` | 24 KB | God-module — primary refactor target. |
| `src/app/coach/page.tsx` | 17 KB | |

## Lessons / playbook for next time

1. **Plan the push path before touching anything.** If a target file is >15 KB, do not edit it via MCP. Either factor the change into a new small module, or push from a local clone via `git push`.
2. **Never push consumers without their producers.** Group them in one commit (use `mcp__github__push_files` for atomic multi-file commits), or push the producer first and verify with `get_file_contents` before pushing the consumer.
3. **Run `tsc --noEmit` (or `next build`) before pushing.** If the sandbox can't run it, manually trace every changed import path and every type literal against its interface.
4. **Don't trust silent failures.** If a tool call times out or returns no result, assume the write did NOT happen. Refetch state with `get_file_contents` before retrying.
5. **Prefer new sibling modules over extending god-modules.** AI settings are a self-contained concern — they belong in `ai-providers.ts`, not in the same file as profile management and meal plans.
6. **When recovery time matters, ship the smallest possible fix first.** Don't try to also pay down tech debt in the rescue commit. The full `storage.ts` refactor is a separate PR done from a local clone.

## Follow-up debt

- **Split `src/lib/storage.ts`** into `storage/profiles.ts`, `storage/nutrition.ts`, `storage/workouts.ts`, `storage/plans.ts`, `storage/measurements.ts`, `storage/grocery.ts`, plus a thin `storage/index.ts` re-export. Done from a local clone in one PR.
- **Eventually fold `ai-providers.ts` into `storage/ai.ts`** once storage is split, so we don't have two surfaces for the same `fitlife_ai_settings` localStorage key.
- **Trim the page-level files** (`log/page.tsx`, `workouts/page.tsx`, `settings/page.tsx`) by extracting components — they're MCP-hostile at their current size.
- **Add a CI step** that runs `next build` on every push, so a failed build is caught at the GitHub side and not just the Vercel side.
