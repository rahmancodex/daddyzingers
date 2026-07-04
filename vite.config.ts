import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { nitro } from "nitro/vite";
import { defineConfig } from "vite";
import tsConfigPaths from "vite-tsconfig-paths";
import { defineLovableTanstackConfig } from "@lovable.dev/vite-tanstack-config";

function getServerFunctionId({ functionName }: { filename: string; functionName: string }) {
  const publicName = functionName.replace(/_createServerFn_handler(?:_\d+)?$/, "");
  return publicName === "validateCouponServer" ? "validateCoupon" : publicName;
}

// Vercel build: use explicit config with Nitro's `vercel` preset so
// `.vercel/output/` (Build Output API v3) is generated.
// Lovable sandbox / anywhere else: use the Lovable wrapper which produces
// the expected `dist/` output the sandbox's dist-check validates.
const isVercelBuild = !!process.env.VERCEL || process.env.NITRO_PRESET === "vercel";

const vercelConfig = defineConfig({
  server: { host: "::", port: 8080 },
  css: { transformer: "lightningcss" },
  resolve: {
    alias: { "@": `${process.cwd()}/src` },
    dedupe: [
      "react",
      "react-dom",
      "react/jsx-runtime",
      "react/jsx-dev-runtime",
      "@tanstack/react-query",
      "@tanstack/query-core",
    ],
  },
  optimizeDeps: {
    include: ["react", "react-dom", "react-dom/client", "react/jsx-runtime", "react/jsx-dev-runtime"],
    ignoreOutdatedRequests: true,
  },
  plugins: [
    tailwindcss(),
    tsConfigPaths({ projects: ["./tsconfig.json"] }),
    tanstackStart({
      server: { entry: "server" },
      serverFns: { generateFunctionId: getServerFunctionId },
      importProtection: {
        behavior: "error",
        client: {
          files: ["**/server/**"],
          specifiers: ["server-only"],
        },
      },
    }),
    nitro({ preset: "vercel" }),
    viteReact(),
  ],
});

export default isVercelBuild
  ? vercelConfig
  : defineLovableTanstackConfig({
      tanstackStart: {
        server: { entry: "server" },
        serverFns: { generateFunctionId: getServerFunctionId },
      },
    });
