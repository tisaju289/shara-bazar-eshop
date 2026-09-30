import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import tailwindcss from "@tailwindcss/vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [
    tsconfigPaths(),
    tailwindcss(),
    tanstackStart(),
    react(),
  ],
  server: {
    host: "0.0.0.0",
    port: 5000,
    strictPort: true,
    allowedHosts: true,
  },
  build: {
    rollupOptions: {
      output: {
        // Function form: only splits modules that are actually part of the
        // bundle, so the SSR build (where deps are external) doesn't fail
        // with "cannot be included in manualChunks" errors.
        manualChunks(id) {
          const path = id.replaceAll("\\", "/");
          if (!path.includes("/node_modules/")) return;
          if (
            path.includes("/node_modules/react/") ||
            path.includes("/node_modules/react-dom/") ||
            path.includes("/node_modules/scheduler/")
          ) {
            return "react-vendor";
          }
          if (
            path.includes("/node_modules/@tanstack/react-query/") ||
            path.includes("/node_modules/@tanstack/react-router/")
          ) {
            return "tanstack-vendor";
          }
          if (
            path.includes("@radix-ui/react-dialog") ||
            path.includes("@radix-ui/react-dropdown-menu") ||
            path.includes("@radix-ui/react-select")
          ) {
            return "ui-vendor";
          }
          if (path.includes("/node_modules/lucide-react/")) {
            return "lucide";
          }
        },
      },
    },
    chunkSizeWarningLimit: 1000,
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
      },
    },
  },
});
