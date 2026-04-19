<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

<!-- BEGIN:mcp-push-rules -->
# Pushing changes via the GitHub MCP

The GitHub MCP write tools (`mcp__github__create_or_update_file`,
`mcp__github__push_files`) re-upload the **entire file** on every write.
They become unreliable above ~15 KB and fail consistently above ~30 KB.

Before editing an existing file, check its size:

- **Under 10 KB**: edit freely via MCP.
- **10–15 KB**: edit via MCP, but always verify with `get_file_contents`
  afterwards that the new SHA matches what you sent.
- **Over 15 KB**: do NOT edit via MCP. Either:
  1. factor the change into a small new sibling module and import from it, or
  2. ask the user to apply the change from a local clone.

Files currently over the 15 KB threshold (audit periodically):

- `src/app/log/page.tsx` (~49 KB) — also too large for the Read tool
- `src/app/workouts/page.tsx` (~39 KB)
- `src/app/settings/page.tsx` (~34 KB)
- `src/app/plan/page.tsx` (~25 KB)
- `src/lib/storage.ts` (~24 KB)
- `src/app/coach/page.tsx` (~17 KB)
<!-- END:mcp-push-rules -->

<!-- BEGIN:atomic-commits -->
# Atomic commits — never leave the branch in a broken state

Never push a commit where consumers (imports, JSX usage, function calls)
land without their producers (exports, components, functions).

- Group producer + consumer changes into a **single** `push_files` call.
- If you must split, push the producer FIRST, verify it landed with
  `get_file_contents`, then push the consumer.
- If a tool call times out or returns no result, assume the write did NOT
  happen. Refetch state before retrying — do not assume success.
<!-- END:atomic-commits -->

<!-- BEGIN:pre-push-build-gate -->
# Pre-push build gate

Vercel runs `npm run build` (full Next.js build, TS strict) on every push.
Before pushing a non-trivial change:

1. Run `npx tsc --noEmit` if `node_modules` is present, OR
2. Manually trace every changed import path: confirm every imported symbol
   exists at the expected path, and every type literal satisfies the
   imported interface.

If the build is going to fail, you'd rather know now than wait for the
Vercel webhook.
<!-- END:pre-push-build-gate -->

<!-- BEGIN:branch-base-check -->
# Verify branch base before editing

A fresh agent session can start on a branch that was forked from a
stale `main`. Edits then land against old contracts, and the PR looks
"additive" but silently regresses shipped work. This has bitten us
twice — the original coach-first IA pivot (PR #10, closed for
divergence) and the API hardening branch (PR #14, which had to be
rebased because it dropped the PR #11 TTS posture and several response
shapes).

Before any code edit on an existing branch:

1. `git fetch origin`
2. `git log --oneline origin/main -10` — confirm the expected merged
   PRs are present (check commit subjects against `feature-map`).
3. `git merge-base --is-ancestor origin/main HEAD` — if this exits
   non-zero, the branch is **behind** `main`. Rebase BEFORE editing.
   Do not layer new commits on a stale base.

In the PR body, state the base SHA at PR-creation time so reviewers
can verify it matches current `origin/main`.
<!-- END:branch-base-check -->

<!-- BEGIN:prompt-writer-preflight -->
# Writing prompts for new sessions

When the user asks for a prompt to continue work in a new Claude Code
session ("write me a prompt for…", "give me a prompt I can paste"),
always include a top-of-prompt pre-flight section:

```
Pre-flight (run before any edit):
1. `git fetch origin`
2. `git log --oneline origin/main -10`   — confirm expected merged PRs
3. `git merge-base --is-ancestor origin/main HEAD`
     — if non-zero, rebase onto origin/main before editing
```

This is non-negotiable. New sessions have no memory of which PRs
merged since the branch was created, so they cannot infer base
staleness from conversational context. Including the pre-flight in
the prompt closes that gap.
<!-- END:prompt-writer-preflight -->

<!-- BEGIN:storage-module-policy -->
# Don't extend `src/lib/storage.ts` further

`src/lib/storage.ts` is already a god-module covering profiles, metrics,
water, calories, meals, workouts, templates, settings, photos, grocery,
AI settings, chat, training plans, meal plans. Adding more makes future
MCP-pushed edits to it nearly impossible (see "Pushing changes via the
GitHub MCP").

For new concerns, create a sibling module under `src/lib/`
(e.g. `ai-providers.ts`, `notifications.ts`, `streaks.ts`). Splitting
the existing god-module is tracked as follow-up debt — see
`docs/postmortems/2026-04-mistral-provider-push.md`.
<!-- END:storage-module-policy -->

<!-- BEGIN:tts-posture -->
# Voxtral TTS posture — do not regress

`src/app/api/tts/route.ts` calls Mistral's `/v1/audio/speech`. Three
things are easy to get wrong and have each broken TTS at least once:

- Model id: **`voxtral-mini-tts-2603`**. `voxtral-tts` and
  `voxtral-tts-2603` are NOT valid ids and Mistral responds with
  `invalid_model` (HTTP 400).
- Do NOT send a `language` field in the request body. Voxtral derives
  language from the voice metadata and rejects `language` as
  `extra_forbidden`.
- Do NOT hardcode voice ids. Fabricated names like
  `Jessica`/`Laura`/`Jordan`/`Marcus` or `cheerful_female` all fail
  with `invalid_voice` (HTTP 404). The real catalog MUST be loaded at
  runtime from `/api/tts/voices` (which proxies
  `GET https://api.mistral.ai/v1/audio/voices`). The response shape is
  `{ items: [...] }` — keep `data` / `voices` as defensive fallbacks.

The proxy must also keep handling both binary audio and
`application/json` envelopes from Mistral — the deployment has been
observed switching between the two formats.
<!-- END:tts-posture -->

<!-- BEGIN:feature-map -->
# Feature map — do not silently drop these

Every entry below is a shipped, user-facing feature with its entry
point. Before a refactor that touches any of the listed files, confirm
the feature still loads and still works. If you intentionally remove
one, say so in the PR body; do NOT delete a feature as a side effect
of restructuring.

- **Multi-profile system** (create / switch / delete per-user data)
  → `src/lib/storage.ts` (`Profile`, `getProfiles`, `setActiveProfileId`),
  `src/lib/ProfileContext.tsx`, `src/components/Onboarding.tsx`,
  `src/app/settings/page.tsx`.
- **AI Coach chat** (multi-provider, Anthropic + Mistral)
  → `src/app/coach/page.tsx`, `src/lib/ai.ts`, `src/app/api/ai/route.ts`,
  `src/app/api/mistral/route.ts`.
- **AI provider settings** (provider tabs, model list, connection test)
  → `src/components/AISettings.tsx`, `src/lib/ai-providers.ts`,
  `src/app/api/ai/status/route.ts`, `src/app/api/mistral/status/route.ts`.
- **Voxtral TTS (voice output)** — see `tts-posture` above
  → `src/app/api/tts/route.ts`, `src/app/api/tts/voices/route.ts`,
  `src/lib/tts.ts`, `src/components/CoachAudioPlayer.tsx`,
  `/settings` → Voice Output section.
- **Voxtral voice input (transcription)**
  → `src/app/api/transcribe/route.ts`, `src/components/VoiceInput.tsx`,
  `/settings` → Voice Input section.
- **Food log + nutrition** (meal entries, macros, water, calories)
  → `src/app/log/page.tsx`, macro/water helpers in `src/lib/storage.ts`.
- **Workouts** (templates, sets, rest timer, exercise picker)
  → `src/app/workouts/page.tsx`, `src/components/RestTimer.tsx`,
  `src/components/ExercisePicker.tsx`.
- **Training + meal plans** (AI-generated weekly plans, grocery integration)
  → `src/app/plan/page.tsx`, `src/app/grocery/page.tsx`.
- **Progress** (weight, body, nutrition, photos, workouts tabs)
  → `src/app/progress/page.tsx`, `src/components/progress/*`.
- **Theme** (system / dark / light)
  → `src/lib/ThemeProvider.tsx`, toggled in `/settings`.
- **Reminders** (weigh-in, meals, workout, water)
  → `ReminderSettings` in `src/lib/storage.ts`, `/settings` → Reminders.
<!-- END:feature-map -->

<!-- BEGIN:module-ownership -->
# Module ownership cheat sheet

- AI provider/model selection + `fitlife_ai_settings` localStorage key →
  `src/lib/ai-providers.ts`
- AI request routing (Anthropic vs Mistral, vision rule) → `src/lib/ai.ts`
- Everything else (profiles, nutrition, workouts, plans, etc.) →
  `src/lib/storage.ts` (legacy god-module — do not extend)
<!-- END:module-ownership -->
