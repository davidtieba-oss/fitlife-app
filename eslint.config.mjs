import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

// Matches raw Tailwind color utilities like `bg-teal-500`, `text-violet-400`,
// `hover:border-slate-700`, etc. Used by the guardrail below to steer new code
// toward the semantic tokens defined in globals.css.
const RAW_COLOR_RE = String.raw`\b(bg|text|border|ring|from|to|via|fill|stroke|outline|divide|placeholder|caret|decoration|accent|shadow)-(slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-\d{2,3}\b`;

const RAW_COLOR_MESSAGE =
  "Use semantic color tokens (bg-primary, text-muted, bg-surface, etc.) instead of raw Tailwind color utilities. Raw palette colors are allowed only in src/components/ui/.";

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
  ]),
  {
    files: ["src/**/*.{ts,tsx}"],
    ignores: ["src/components/ui/**"],
    rules: {
      "no-restricted-syntax": [
        "warn",
        {
          selector: `JSXAttribute[name.name='className'] Literal[value=/${RAW_COLOR_RE}/]`,
          message: RAW_COLOR_MESSAGE,
        },
        {
          selector: `JSXAttribute[name.name='className'] TemplateElement[value.cooked=/${RAW_COLOR_RE}/]`,
          message: RAW_COLOR_MESSAGE,
        },
      ],
    },
  },
]);

export default eslintConfig;
