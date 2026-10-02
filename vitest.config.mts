import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

export default defineConfig({
  // The editor shell tests render React components from a .tsx file under
  // apps/web, where tsconfig sets `jsx: "preserve"` for Next. Under Vite that
  // leaves JSX untransformed and breaks the test runtime, so the transform is
  // pinned to the root tsconfig, which sets the automatic JSX runtime.
  tsconfig: "./tsconfig.json",
  resolve: {
    alias: {
      // Mirrors the `@/*` path mapping in apps/web/tsconfig.json.
      "@": fileURLToPath(new URL("./apps/web/src", import.meta.url)),
      // Resolve workspace packages from source so tests never depend on a
      // prior `dist` build (their package.json `exports` point at `dist`).
      "@aiphotoshop/design-schema": fileURLToPath(
        new URL("./packages/design-schema/src/index.ts", import.meta.url),
      ),
      "@aiphotoshop/design-engine": fileURLToPath(
        new URL("./packages/design-engine/src/index.ts", import.meta.url),
      ),
    },
  },
  test: {
    environment: "node",
    include: [
      "tests/**/*.test.ts",
      "tests/**/*.test.tsx",
      "packages/*/src/**/*.test.ts",
      "packages/*/src/**/*.test.tsx",
      "apps/*/src/**/*.test.ts",
      "apps/*/src/**/*.test.tsx",
    ],
    exclude: ["**/node_modules/**", "**/dist/**", "**/.next/**", "**/.turbo/**"],
  },
});
