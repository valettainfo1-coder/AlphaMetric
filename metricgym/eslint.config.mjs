import { FlatCompat } from "@eslint/eslintrc";
import { dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({ baseDirectory: __dirname });

const config = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
    },
  },
  {
    // lib/engine is pure TypeScript: it gets lifted into React Native later.
    // No React, no DOM access, no Next.js, no data-layer imports.
    files: ["lib/engine/**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: [
                "react",
                "react-*",
                "next",
                "next/*",
                "@/components/*",
                "@/app/*",
                "@/lib/data/*",
                "@/lib/stores/*",
              ],
              message:
                "lib/engine must stay pure TypeScript (no React/Next/DOM/data-layer imports).",
            },
          ],
        },
      ],
      "no-restricted-globals": [
        "error",
        { name: "window", message: "lib/engine must not touch the DOM." },
        { name: "document", message: "lib/engine must not touch the DOM." },
        { name: "navigator", message: "lib/engine must not touch the DOM." },
        { name: "localStorage", message: "lib/engine must not touch storage." },
      ],
    },
  },
  {
    ignores: [
      ".next/**",
      "next-env.d.ts",
      "node_modules/**",
      "public/sw.js",
      "playwright-report/**",
      "test-results/**",
    ],
  },
];

export default config;
