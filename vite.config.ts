import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
// Precache every hashed app asset so the FIRST successful online load is sufficient.
function offlineShell(): Plugin {
  return {
    name: "cineverse-offline-shell",
    generateBundle(_, bundle) {
      const names = Object.keys(bundle).filter((x) => /\.(js|css)$/.test(x));
      const version =
        "cineverse-shell-" +
        createHash("sha256").update(names.join("|")).digest("hex").slice(0, 12);
      const assets = [
        "/",
        "/index.html",
        "/icon.svg",
        "/tmdb-logo.svg",
        "/manifest.webmanifest",
        ...names.map((n) => "/" + n),
      ];
      const source = readFileSync(
        new URL("./scripts/sw-template.js", import.meta.url),
        "utf8",
      )
        .replace("__CACHE_VERSION__", version)
        .replace("__PRECACHE_ASSETS__", JSON.stringify(assets));
      this.emitFile({ type: "asset", fileName: "sw.js", source });
    },
  };
}
export default defineConfig({
  plugins: [react(), offlineShell()],
  server: { proxy: { "/api": "http://127.0.0.1:8787" } },
  build: { sourcemap: false },
});
