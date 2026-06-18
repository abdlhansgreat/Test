import { defineConfig } from "vite";

// The app is plain HTML/CSS/JS — Vite just gives us a hot-reloading dev
// server (`npm run dev`) and an optimized production build (`npm run build`).
export default defineConfig({
  server: {
    host: true,   // also expose on the local network / in containers
    port: 5173,
  },
});
