This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Environment variables

The `/api/ai` route proxies requests to Anthropic and is protected by an
origin check, a per-IP rate limit, and payload/schema validation.

- `ANTHROPIC_API_KEY` (required for `/api/ai`) — server-side Anthropic API
  key. The route returns 500 if unset. Never expose this to the client.
- `MISTRAL_API_KEY` (required for `/api/mistral`) — server-side Mistral API
  key, used by the Mistral provider and the Voxtral TTS/transcription
  routes.
- `ALLOWED_ORIGINS` (optional) — comma-separated list of external origins
  allowed to call `/api/ai` (e.g. `https://app.example.com,https://staging.example.com`).
  Same-origin requests (identified via the `Sec-Fetch-Site: same-origin`
  header) are always allowed regardless of this setting. When deployed on
  Vercel, `https://$VERCEL_URL` is added to the allowlist automatically.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
