import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { initSupabase } from './services/supabase'
import './index.css'

// Load runtime config (Supabase URL + anon key) from /api/config and create
// the Supabase client BEFORE the first render, so components and stores see a
// ready client. initSupabase never throws and times out quickly, so a missing
// or slow config endpoint just means local-only mode — the app still boots.
async function bootstrap() {
  await initSupabase()
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </StrictMode>,
  )
}

void bootstrap()
