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
- **Providers**: HeyGen, Runway (video) · ElevenLabs (voice) — behind a swappable
  service layer (`src/services/providers/`), currently in **mock mode** with realistic
  step delays, so the whole UX is demoable without keys.

## Project structure

```
src/
  pages/        # solo, cinema, cartoon, result, settings, history
  components/   # ui kit, layout, voice, characters, generation, result, pwa
  store/        # zustand: settings, solo, cast (cinema+cartoon), generation, toasts
  hooks/        # voice recorder, swipe tabs, install prompt, online status
  services/     # provider clients (mock ⇄ real), pipeline, share kit, history, supabase
  utils/        # accent palette, image compression, clipboard, formatting
supabase/
  migrations/   # schema + RLS + storage policies
scripts/
  generate-icons.mjs  # dependency-free PNG icon/splash generator (runs on build)
```

## Environment variables

All secrets live **only** in environment variables — never in the repo.

| Variable | Purpose |
| --- | --- |
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon (publishable) key |
| `VITE_HEYGEN_API_KEY` | HeyGen API key |
| `VITE_RUNWAY_API_KEY` | Runway API key |
| `VITE_ELEVENLABS_API_KEY` | ElevenLabs API key |

Locally: `cp .env.example .env` and fill in values.
Without keys the app runs in **local demo mode** (mock pipelines, local history).

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
