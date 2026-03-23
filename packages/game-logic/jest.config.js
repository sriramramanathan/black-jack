/** @type {import('jest').Config} */
module.exports = {
  // ts-jest lets Jest understand TypeScript directly — no manual compile step
  preset: 'ts-jest',

  // 'node' environment = standard Node.js globals (no browser DOM)
  // Game logic is pure functions — doesn't need a browser
  testEnvironment: 'node',

  // Where to find test files
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.test.ts'],

  // Coverage: which files to measure (exclude the index re-export barrel)
  collectCoverageFrom: ['src/**/*.ts', '!src/**/__tests__/**', '!src/index.ts'],

  // Minimum coverage thresholds — the build fails if these drop below
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 90,
      lines: 90,
      statements: 90,
    },
  },
};
