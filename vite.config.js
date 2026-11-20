import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Without it the app would call "undefined/api/…" on its own site, and the SPA rewrite would answer
  // with index.html, so fail the deploy instead of shipping a broken app.
  if (mode === 'production' && !loadEnv(mode, '.', 'VITE_').VITE_BACKEND_URL) {
    throw new Error('VITE_BACKEND_URL is not set. Set it to the backend URL, e.g. https://chatify-api.onrender.com')
  }
  return {
    plugins: [react()],
  }
})
