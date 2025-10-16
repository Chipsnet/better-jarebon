import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  server: { allowedHosts: ["jarebon.minato86.com"] },
  plugins: [tailwindcss(), reactRouter(), tsconfigPaths()],
});
