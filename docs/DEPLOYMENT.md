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
   The two Supabase variables are **required**, not optional: the `/api/*`
   proxies fail closed (503) without them, so generation does not work at all
   until Supabase is configured (see "Securing the proxies" in the README).
5. **Redeploy** — Deployments → ⋯ on the latest deploy → Redeploy (uncheck
   *Use existing Build Cache*).

## API routing

The proxies are **flat** functions, and the provider sub-path travels as a
`?path=` query value (not a URL path segment):

- `/api/heygen?path=v2/user/remaining_quota`
- `/api/runway?path=v1/organization`
- `/api/elevenlabs?path=v1/user`

## Verifying the deployment

Open these on the production domain — each returns JSON, not a 404 page. The
`health` pings are public; every other call always requires a signed-in
caller (fails with 503 if Supabase itself isn't configured on the server).

| URL | Expected |
| --- | --- |
| `/api/health` | `{"heygen":true,"runway":true,"elevenlabs":true}` |
| `/api/heygen?path=health` | `{"ok":true,"provider":"heygen","keyConfigured":true}` |
| `/api/runway?path=health` | `{"ok":true,"provider":"runway","keyConfigured":true}` |
| `/api/elevenlabs?path=health` | `{"ok":true,"provider":"elevenlabs","keyConfigured":true}` |

Then in the app: sign in (if Supabase is configured) → Settings → *Test
connection* on each provider card → green ✓.

## Troubleshooting `NOT_FOUND fra1::…` on `/api/*`

That page is Vercel's platform 404 — the serving deployment has no serverless
function for the path. Check in this order:

1. **Deployments → latest Production deployment → "Functions" tab.** You should
   see `api/heygen`, `api/runway`, `api/elevenlabs`, `api/health`, `api/media`.
   An empty list means the build skipped `api/` — almost always a non-empty
   **Root Directory** or a framework preset override; fix per the checklist
   and redeploy.
2. **Source commit** — the deployment page shows the commit hash; confirm it
   contains the `api/` folder.
3. **PWA cache** — after a redeploy, fully close and reopen the installed app.
   The service worker never caches `/api/*` and `registerType: 'autoUpdate'`
   applies new versions automatically, but a suspended iOS PWA can lag; a full
   relaunch forces the update.

## Local development

`npm run dev` serves only the frontend. To run the `/api` proxies locally use
`vercel dev` (requires `vercel login` + `vercel link`).

## Checks

`npm run typecheck`, `npm run lint`, `npm test`, and `npm run build` all run in
CI (`.github/workflows/ci.yml`) on every push and pull request.
