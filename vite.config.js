import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
// Port 5174 matches the local origin the backend allows (ADMIN_CORS_ORIGINS).
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: { port: 5174, strictPort: true },
  preview: { port: 5174 },
})
