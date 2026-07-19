import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// base must match the GitHub Pages repo path (e.g. /net-worth-tracker/)
// for a project site at https://<user>.github.io/<repo>/
export default defineConfig({
  plugins: [react()],
  base: '/net-worth-tracker/',
})
