import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths()],
  oxc: {
    jsx: {
      runtime: "automatic",
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.{ts,tsx}"],
    pool: "threads",
    clearMocks: true,
    sequence: {
      concurrent: false
    }
  }
});
