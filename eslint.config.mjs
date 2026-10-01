import js from "@eslint/js";
import next from "eslint-config-next/core-web-vitals";
import prettier from "eslint-config-prettier";
import globals from "globals";
import tseslint from "typescript-eslint";

const WEB_FILES = ["apps/web/**/*.{js,jsx,mjs,cjs,ts,tsx}"];
const SOURCE_FILES = ["**/*.{js,jsx,mjs,cjs,ts,tsx}"];
const TYPESCRIPT_FILES = ["**/*.{ts,tsx,mts,cts}"];

/**
 * `eslint-config-next` ships a flat config array. It is scoped to the web
 * application so that React/Next-specific rules never apply to the packages.
 */
const nextScoped = next.flatMap((config) => {
  const isGlobalIgnores = Object.keys(config).every((key) => key === "ignores");
  return isGlobalIgnores ? [config] : [{ ...config, files: WEB_FILES }];
});

export default [
  {
    ignores: [
      "**/node_modules/**",
      "**/dist/**",
      "**/.next/**",
      "**/.turbo/**",
      "**/coverage/**",
      "**/*.tsbuildinfo",
      "apps/web/next-env.d.ts",
    ],
  },

  js.configs.recommended,
  ...tseslint.configs.recommended,

  {
    files: SOURCE_FILES,
    languageOptions: {
      globals: { ...globals.node },
    },
    rules: {
      eqeqeq: ["error", "always", { null: "ignore" }],
      "no-console": ["warn", { allow: ["warn", "error"] }],
    },
  },

  {
    files: TYPESCRIPT_FILES,
    rules: {
      "@typescript-eslint/consistent-type-imports": [
        "error",
        { prefer: "type-imports", fixStyle: "inline-type-imports" },
      ],
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
    },
  },

  ...nextScoped,

  // Must stay last so formatting rules never fight with Prettier.
  prettier,
];
