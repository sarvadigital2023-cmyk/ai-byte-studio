/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/react" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string
  readonly VITE_SUPABASE_ANON_KEY?: string
  // Provider keys (HeyGen / Runway / ElevenLabs) are intentionally NOT typed
  // here: they are read only by the /api serverless proxies on the server,
  // so they never end up in the client bundle.
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
