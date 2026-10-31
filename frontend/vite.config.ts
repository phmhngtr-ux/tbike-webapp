import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Dev: /api duoc proxy toi backend FastAPI (mac dinh http://localhost:8000)
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: { "/api": { target: process.env.VITE_DEV_API_PROXY ?? "http://localhost:8000", changeOrigin: true } },
  },
  test: { environment: "node" },
} as never);
