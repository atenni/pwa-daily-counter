import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  base: "/pwa-daily-counter/",
  plugins: [
    VitePWA({
      manifest: {
        name: "Daily Counter",
        short_name: "Counter",
        start_url: "/pwa-daily-counter/",
        scope: "/pwa-daily-counter/",
        display: "standalone",
        background_color: "#ffffff",
        theme_color: "#3b82f6",
        icons: [
          {
            src: "icon-192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "icon-512.png",
            sizes: "512x512",
            type: "image/png",
          },
        ],
      },
    }),
  ],
  build: {
    outDir: "dist",
  },
});
