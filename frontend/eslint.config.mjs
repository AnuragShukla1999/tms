import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    // The generic CRUD engine renders whatever rows the API returns, so those rows are intentionally untyped.
    files: ["src/features/crud/**", "src/features/resources/**", "src/features/dashboard/ops-dashboard.tsx", "src/app/(app)/ledger/**", "src/lib/list.ts", "src/lib/format.ts"],
    rules: { "@typescript-eslint/no-explicit-any": "off" },
  },
  globalIgnores([".next/**", "node_modules/**", "next-env.d.ts"]),
]);
