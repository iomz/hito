import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    globals: true,
    include: ["src/**/*.{test,spec}.{js,ts,tsx}"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html", "lcov"],
      exclude: [
        "node_modules/",
        "src-tauri/",
        "**/*.d.ts",
        "**/*.config.*",
        "**/main.ts",
        "**/main.js",
        // Type definitions don't have runtime code to test - TypeScript compiler validates them
        "src/types.ts",
      ],
      // React components (.tsx) are intentionally omitted - business logic is tested in .ts files
      include: ["src/**/*.{ts,js}"],
      // Report on all TypeScript and JavaScript source files
      all: true,
      reportsDirectory: "./coverage",
      clean: true,
    },
  },
});
