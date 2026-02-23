import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Legacy v1 app (vanilla JS, not part of Next.js build)
    "legacy/**",
    // PocketBase hooks (Goja JS runtime, not compiled by Next.js)
    "pb_hooks/**",
    // Conductor utility scripts (CJS Node.js, not TS/ESM)
    "conductor/scripts/**",
    // Generated service worker bundle (Serwist/Webpack output)
    "public/sw.js",
  ]),
  {
    rules: {
      // Allow unused variables/params prefixed with _
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
    },
  },
]);

export default eslintConfig;
