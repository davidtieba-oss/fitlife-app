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

`src/app/api/tts/route.ts` calls Mistral's `/v1/audio/speech`. Two
things are easy to get wrong and have broken TTS before:

- Model id: **`voxtral-mini-tts-2603`**. `voxtral-tts` is not a valid
  id and Mistral responds with `invalid_model` (HTTP 400).
- Do NOT send a `language` field in the request body. Voxtral derives
  language from the voice metadata and rejects `language` as
  `extra_forbidden`.

The proxy must also keep handling both binary audio and
`application/json` envelopes from Mistral — the deployment has been
observed switching between the two formats.
<!-- END:tts-posture -->

<!-- BEGIN:module-ownership -->
# Module ownership cheat sheet

- AI provider/model selection + `fitlife_ai_settings` localStorage key →
  `src/lib/ai-providers.ts`
- AI request routing (Anthropic vs Mistral, vision rule) → `src/lib/ai.ts`
- Everything else (profiles, nutrition, workouts, plans, etc.) →
  `src/lib/storage.ts` (legacy god-module — do not extend)
<!-- END:module-ownership -->
