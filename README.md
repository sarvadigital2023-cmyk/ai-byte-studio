# AI Byte Studio ⚡

Mobile-first **Progressive Web App** — an AI studio for generating avatar videos.
TikTok-style UX: dark neon interface, bottom tab bar, full-screen vertical previews,
gesture navigation.

## Studios

| Tab | Route | What it does |
| --- | --- | --- |
| 👤 **Solo Avatar** | `/solo` | Photo → scene → avatar → speech (text or cloned voice) → vertical video |
| 🎬 **Cinema Studio** | `/cinema` | 5–6 photo-based characters, script with dialogue, full movie render |
| 🎨 **Cartoon Studio** | `/cartoon` | 5–6 described characters, Pixar 3D / Anime / 2D Flat / Claymation styles |

Plus: `/result/:id` (player + Share Kit), `/history` (Supabase-backed), `/settings`
(providers & account). `/` redirects to `/solo`.

## Stack

- **React 18 + Vite 5 + TypeScript (strict)**
- **Tailwind CSS** — "Neon Dark" design system (`#050508` + neon blue/green/pink/yellow)
- **Framer Motion** — spring animations, direction-aware tab transitions, staggered lists
- **Zustand** — per-tab state, persisted; survives tab switching and reloads
- **vite-plugin-pwa (Workbox)** — installable PWA, offline app shell, auto-update toast
- **Supabase** — magic-link auth, `projects` / `generations` / `profiles` with RLS, private storage buckets
- **Providers**: HeyGen, Runway (video) · ElevenLabs (voice) — real API integrations
  behind a service layer (`src/services/providers/`). Browser code calls same-origin
  serverless proxies (`api/heygen`, `api/runway`, `api/elevenlabs`) that inject the
  API keys server-side, so keys never appear in the client bundle.

## Project structure

```
api/            # Vercel serverless proxies (flat functions, ?path= sub-path):
                # heygen.ts, runway.ts, elevenlabs.ts, health.ts (key status),
                # media.ts (HeyGen-only image fetch), _proxy.ts (shared guard)
src/
  pages/        # solo, cinema, cartoon, result, settings, history
  components/   # ui kit, layout, voice, characters, generation, result, pwa
  store/        # zustand: settings, solo, cast (cinema+cartoon), generation, toasts
  hooks/        # voice recorder, swipe tabs, install prompt, online status
  services/     # provider API clients, pipeline, share kit, history, supabase
  utils/        # accent palette, image compression, clipboard, formatting
supabase/
  migrations/   # schema + RLS + storage policies
scripts/
  generate-icons.mjs  # dependency-free PNG icon/splash generator (runs on build)
```

## Generation pipelines

- **HeyGen** (recommended): photo → talking-photo asset → ElevenLabs speech
  (cloned voice or default) → HeyGen `v2/video/generate` performs lipsync +
  gesture sync server-side → polled until the vertical 720×1280 video is ready.
  Cinema/Cartoon scripts are split into "Name: line" scenes, one per character.
- **Runway**: portraits via `text_to_image` (gen4_image), video via
  `image_to_video` (gen4_turbo). Note: Runway's public API has no audio-driven
  lipsync — videos are prompt-driven animations; use HeyGen for speech-synced
  avatars.
- **ElevenLabs**: Instant Voice Cloning (`v1/voices/add`) per character +
  multilingual TTS for every scripted line.

## Environment variables

All secrets live **only** in environment variables — never in the repo.

| Variable | Purpose | Read by |
| --- | --- | --- |
| `VITE_SUPABASE_URL` | Supabase project URL | Browser (public by design) |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon (publishable) key | Browser (public by design) |
| `VITE_HEYGEN_API_KEY` | HeyGen API key | Serverless proxies only |
| `VITE_RUNWAY_API_KEY` | Runway API key | Serverless proxies only |
| `VITE_ELEVENLABS_API_KEY` | ElevenLabs API key | Serverless proxies only |

The provider keys are read exclusively by the `api/` functions via
`process.env` — client code never references them, so Vite does not embed
them in the public bundle. (`HEYGEN_API_KEY` etc. without the `VITE_` prefix
are also accepted.) Without a required key, generation stops with an explicit
error toast — there are no fallbacks.

Locally: `cp .env.example .env`, then use `vercel dev` (not plain `vite dev`)
so the `/api` proxies run alongside the app.

## Securing the proxies (important for a public deployment)

The `/api/*` provider proxies spend the owner's **paid** HeyGen / Runway /
ElevenLabs credits, so they must not be an open relay. Every request that
reaches a provider is guarded (`api/_proxy.ts → guardRequest`) by:

- **Same-origin check** — browser requests from other sites are rejected.
- **In-memory rate limiting** — ~40 req/min per IP per warm instance.
- **Auth (when Supabase is configured)** — the caller must send a valid
  Supabase session token, verified server-side against `…/auth/v1/user`
  using only the public anon key (no service-role key). The browser attaches
  this automatically once signed in; generation shows a "sign in" prompt
  otherwise.

**Enable Supabase to fully lock down a public deployment.** Without it the
server has no way to verify callers, so only the same-origin + rate-limit
layers apply. The `api/health` ping stays public (it returns only booleans).

## Deploy to Vercel

1. Import the repo into Vercel — the standard Vite preset works out of the box
   (`npm run build`, output `dist/`). `vercel.json` adds SPA rewrites and correct
   service-worker/manifest headers.
2. **Project Settings → Environment Variables** → add the five variables above → redeploy.
3. (Optional) Create a Supabase project and run `supabase/migrations/0001_init.sql`
   in the SQL editor to enable auth, cloud history and storage.

## Develop

```bash
npm install
npm run dev        # local dev server
npm run build      # icons + typecheck + production build (PWA)
npm run preview    # serve the production build
```

## PWA notes

- Installable on Android (branded install banner via `beforeinstallprompt`) and iOS
  (standalone, black-translucent status bar, splash screens, safe-area aware UI).
- App shell is precached; provider/Supabase requests are network-only by design.
- New deployments show a non-intrusive "Update available → Refresh" toast.
