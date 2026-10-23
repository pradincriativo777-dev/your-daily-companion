import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    maxWorkers: 1,
    fileParallelism: false,
    include: ["src/lib/__tests__/authorization.test.ts", "src/lib/__tests__/import-validation.test.ts"],
  },
});
