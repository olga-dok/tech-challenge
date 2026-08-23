import nextJest from "next/jest.js";
import type { Config } from "jest";

const createJestConfig = nextJest({ dir: "./" });

// Most tests render components (jsdom). The SSE reader test overrides this
// per-file with `@jest-environment node` — it needs real, unpolyfilled
// `ReadableStream`/`TextDecoder`, which jsdom's Web Streams support is too
// incomplete to provide.
const config: Config = {
  testEnvironment: "jest-environment-jsdom",
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
  testPathIgnorePatterns: ["<rootDir>/.next/", "<rootDir>/node_modules/"],
};

export default createJestConfig(config);
