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

<!-- BEGIN:module-ownership -->
# Module ownership cheat sheet

- AI provider/model selection + `fitlife_ai_settings` localStorage key →
  `src/lib/ai-providers.ts`
- AI request routing (Anthropic vs Mistral, vision rule) → `src/lib/ai.ts`
- Everything else (profiles, nutrition, workouts, plans, etc.) →
  `src/lib/storage.ts` (legacy god-module — do not extend)
<!-- END:module-ownership -->

<!-- BEGIN:symbol-collisions -->
# Avoid symbol collisions across feature branches

When adding new exported constants, types, or React state names, prefix
with the feature domain so parallel branches don't collide on merge:

- Good: `TTS_DEFAULT_SETTINGS`, `VOICE_INPUT_DEFAULT_SETTINGS`,
  `ttsVoiceSettings`, `voiceInputSettings`.
- Bad: `DEFAULT_VOICE_SETTINGS`, `voiceSettings`, `defaultSettings`.

Generic names WILL collide the moment a sibling branch lands. The
3-stage Mistral / TTS / voice-input integration in April 2026 paid a
multi-hour rebase tax on exactly this — two branches each exported
`DEFAULT_VOICE_SETTINGS` with incompatible shapes, and both declared
`const [voiceSettings, setVoiceSettings]` in `coach/page.tsx`.
<!-- END:symbol-collisions -->

<!-- BEGIN:api-key-posture -->
# API key posture is fixed: server env vars only

All third-party API keys live in server-side environment variables
(`MISTRAL_API_KEY`, `ANTHROPIC_API_KEY`). Route handlers read them via
`process.env`.

Do NOT:
- add client-side API-key input fields to `/settings`
- send keys in headers like `x-mistral-key` or `x-api-key`
- persist keys in `localStorage` (including `fitlife_ai_settings`)
- add "bring your own key" fallbacks in route handlers

If a new feature needs a key, add it to `.env` / Vercel project env and
read it server-side. The `/api/ai/status` route reports whether keys
are configured so the UI can show capability without ever seeing the
secret.
<!-- END:api-key-posture -->

<!-- BEGIN:dark-mode-pattern -->
# Dark-mode card pattern

Every new settings card, panel, or surface must ship paired light/dark
Tailwind classes. Never ship a dark-only (`bg-slate-800`, `text-white`)
card — it will look broken in light mode.

Canonical pairings:

- Card background: `bg-gray-100 dark:bg-slate-800`
- Section heading: `text-gray-600 dark:text-slate-300`
- Body text: `text-gray-500 dark:text-slate-400`
- Muted/footnote text: `text-gray-400 dark:text-slate-500`
- Input / select background: `bg-white dark:bg-slate-700`
- Input text: `text-gray-900 dark:text-white`
- Placeholder: `placeholder-gray-400 dark:placeholder-slate-500`
- Toggle off state: `bg-gray-300 dark:bg-slate-600`
- Inline info chip: `bg-white/60 dark:bg-slate-700/50`
- Border: `border-gray-200 dark:border-slate-800`

Copy the pattern from an existing card in `src/app/settings/page.tsx`
rather than inventing fresh colors.
<!-- END:dark-mode-pattern -->

<!-- BEGIN:branch-freshness -->
# Rebase long-lived feature branches onto `main` weekly

Feature branches that touch shared files (`src/app/coach/page.tsx`,
`src/app/settings/page.tsx`, `src/lib/storage.ts`, `src/lib/ai.ts`)
must be rebased onto `main` at least weekly, and always immediately
before opening a PR for review.

The longer a branch sits, the more expensive the integration. The
April 2026 three-branch integration is the reference case — each
branch was individually small, but the combined rebase took hours
because they had drifted on API-key posture, dark-mode styling, and
input-bar structure. Small, frequent rebases surface these conflicts
while they're still cheap to fix.

If you can't rebase (e.g. the branch isn't yours), at minimum run
`git fetch origin main && git log --oneline HEAD..origin/main -- <files>`
before editing a shared file, to see what's landed upstream.
<!-- END:branch-freshness -->
