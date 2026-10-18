import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

// The playground: every scene and token, in both themes.
export default defineConfig({
  root: "playground",
  plugins: [tailwindcss()],
  build: {
    outDir: "../dist",
    emptyOutDir: true,
    target: "es2023",
    assetsInlineLimit: 0,
    // The overview, and the stream full screen.
    rollupOptions: {
      input: {
        index: "playground/index.html",
        stream: "playground/stream.html",
      },
    },
  },
  server: { port: 5175 },
});
