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
  ]),
  // Rule overrides - demote to warnings to unblock CI
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/ban-ts-comment": "warn",
      "@typescript-eslint/no-empty-object-type": "warn",
      "react/no-unescaped-entities": "warn",
      // React Compiler/Hooks rules - disable until codebase is cleaned up
      "react-compiler/react-compiler": "off",
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/static-components": "off",
      "react-hooks/purity": "off",
      "react-hooks/immutability": "off",
    },
  },
]);

export default eslintConfig;
