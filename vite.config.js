import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Relative base so the built site works at https://<user>.github.io/<repo>/
// whatever the repo is called.
export default defineConfig({
  plugins: [react()],
  base: './',
})
