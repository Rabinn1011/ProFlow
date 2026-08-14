/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  testEnvironment: "node",
  roots: ["<rootDir>/tests"],
  setupFilesAfterEnv: ["<rootDir>/tests/setup.ts"],
  transform: {
    "^.+\\.ts$": ["ts-jest", { tsconfig: "<rootDir>/tsconfig.test.json" }],
  },
  // Mongo is shared in-memory state; parallel suites would fight over the same
  // collections between clears.
  maxWorkers: 1,
  testTimeout: 30000,
  clearMocks: true,
};
