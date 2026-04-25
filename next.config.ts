import path from "node:path";
import type { NextConfig } from "next";

/**
 * Next.js configuration for Tauri desktop app.
 *
 * Key points:
 * - `output: 'export'`  : produce a fully static bundle under `out/` so that
 *                         Tauri can load it via the `tauri://` (file://) protocol.
 *                         This disables Server Actions / API Routes / ISR.
 *                         AI / RAG logic must live either on the Rust side
 *                         (`#[tauri::command]`) or run client-side in the browser.
 * - `images.unoptimized`: required when using default `next/image` under static export.
 * - `trailingSlash`     : ensures every route resolves to `<route>/index.html`,
 *                         which is the safest mapping for file:// asset loading.
 * - `turbopack.root`    : pin monorepo root to this project so Turbopack does not
 *                         mis-detect a parent `package-lock.json` as workspace root.
 */
const nextConfig: NextConfig = {
  output: "export",
  images: {
    unoptimized: true,
  },
  trailingSlash: true,
  turbopack: {
    root: path.resolve(__dirname),
  },
};

export default nextConfig;
