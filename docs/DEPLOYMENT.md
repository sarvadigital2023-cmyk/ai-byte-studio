# Deployment Guide (Vercel)

## Production setup checklist

1. **GitHub default branch** — GitHub → repo → Settings → General → *Default
   branch* → switch (⇄) to `main` → Update. (Merging a PR does **not** change
   the default branch — this switch is always manual.)
2. **Vercel production branch** — Vercel → Project → Settings → Git →
   *Production Branch* = `main` → Save.
3. **Build settings** — Settings → Build & Development:
   - Framework Preset: **Vite**
   - Root Directory: **empty** (repository root — the `api/` folder must be at
     the deployment root, or the serverless functions will not be built)
   - Build Command / Output Directory: defaults (`npm run build` → `dist`)
4. **Environment variables** — Settings → Environment Variables (all three
   environments): `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`,
   `VITE_HEYGEN_API_KEY`, `VITE_RUNWAY_API_KEY`, `VITE_ELEVENLABS_API_KEY`.
5. **Redeploy** — Deployments → ⋯ on the latest deploy → Redeploy (uncheck
   *Use existing Build Cache*).

## Verifying the API proxies

Open these URLs on the production domain — each must return JSON, not a 404
page:

| URL | Expected |
| --- | --- |
| `/api/health` | `{"heygen":true,"runway":true,"elevenlabs":true}` |
| `/api/heygen/health` | `{"ok":true,"provider":"heygen","keyConfigured":true}` |
| `/api/runway/health` | `{"ok":true,"provider":"runway","keyConfigured":true}` |
| `/api/elevenlabs/health` | `{"ok":true,"provider":"elevenlabs","keyConfigured":true}` |

Then in the app: Settings → *Test connection* on each provider card → green ✓.

## Troubleshooting `NOT_FOUND fra1::…` on `/api/*`

That page is Vercel's platform 404 — the deployment serving the request has no
serverless function for the path. Check in this order:

1. **Deployments → open the latest Production deployment → "Functions" tab.**
   - Functions listed (`api/heygen/[...path]`, `api/runway/[...path]`,
     `api/elevenlabs/[...path]`, `api/health`, `api/media`) → the deploy is
     fine; make sure the domain points to *this* deployment.
   - Empty list → the build skipped `api/`: almost always a non-empty **Root
     Directory** or a framework preset override; fix per the checklist above
     and redeploy.
2. **Deployment source commit** — the deployment page shows the commit hash;
   it must contain the `api/` folder (any commit from `cc078d2` on).
3. **PWA cache** — after a redeploy, fully close and reopen the installed
   app, or accept the "Update available → Refresh" toast; the service worker
   never caches `/api/*`, but the shell updates through it.

## Local development

`npm run dev` serves only the frontend. To run the `/api` proxies locally use
`vercel dev` (requires `vercel login` + `vercel link`).
