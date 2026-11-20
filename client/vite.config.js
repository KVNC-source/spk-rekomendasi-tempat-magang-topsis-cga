import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  // The mock API imports the C7 formula straight from the server (one source for both). In dev the
  // server only serves files under the project root, so allow that one folder (not server/.env).
  server: { fs: { allow: [".", "../server/src/lib"] } },
});
