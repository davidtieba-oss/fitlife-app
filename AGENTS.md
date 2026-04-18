<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

<!-- BEGIN:feature-map -->
# Feature map — do NOT silently drop these during refactors

Information-architecture rewrites (tabs, layouts, route shuffles) have
repeatedly dropped shipped features because the refactor only looked
at what was visible in chrome. Before removing a route, component, or
module, grep the codebase for every reference and confirm the feature
is either being moved or intentionally retired.

| Feature | Entry points | Files |
| --- | --- | --- |
| AI Coach (chat) | `/coach`, slash-menu in composer | `src/app/coach/page.tsx`, `src/lib/ai.ts`, `src/app/api/ai/route.ts` |
| Text-to-Speech (Listen button on coach replies) | `Listen` button on each assistant bubble in `/coach`; voice picker in `/settings` | `src/app/api/tts/route.ts`, `src/app/api/tts/voices/route.ts`, `src/lib/tts.ts`, `src/lib/tts-settings.ts`, `src/components/VoiceSettingsCard.tsx`, `SpeakButton` in `src/app/coach/page.tsx` |
| Dashboard | `/today` (root `/` redirects here for returning users) | `src/app/today/page.tsx` |
| Multi-profile | Header avatar switcher, Settings | `src/components/AppHeader.tsx`, `src/lib/ProfileContext.tsx` |

If you are refactoring any of the above, list the concrete references
you plan to touch in your commit message. When in doubt, ask.
<!-- END:feature-map -->

<!-- BEGIN:tts-posture -->
# TTS posture

- Mistral key is **server-env only**: `MISTRAL_API_KEY`. Never add a
  client-side key input, never send `x-mistral-key` from the browser,
  never persist the key in `localStorage`.
- Voice selection (just the voice id string) is persisted in
  `localStorage` via `src/lib/tts-settings.ts` — NOT inside
  `src/lib/storage.ts`.
- The proxy at `/api/tts` must handle both binary audio and
  `application/json` envelopes from Mistral (the deployment switches
  formats). Do not remove the JSON fallback.
- Do NOT send a `language` field to `/v1/audio/speech` — Voxtral
  derives language from the voice metadata and rejects `language` as
  `extra_forbidden`.
- Current model id: `voxtral-mini-tts-2603`.
<!-- END:tts-posture -->

<!-- BEGIN:storage-module-policy -->
# Don't extend `src/lib/storage.ts` further

`src/lib/storage.ts` is already a god-module covering profiles,
metrics, water, calories, meals, workouts, templates, settings,
photos, grocery, AI settings, chat, training plans, meal plans. For
new concerns, create a sibling module under `src/lib/` (e.g.
`tts-settings.ts`).
<!-- END:storage-module-policy -->
