module.exports = {
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/tests/setup/testSetup.js'],
  collectCoverage: true,
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'src/modules/**/*.js',
    'src/services/**/*.js',
    'src/middleware/**/*.js',
    '!src/**/*.routes.js'
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },
  testMatch: ['**/tests/integration/**/*.test.js', '**/tests/unit/**/*.test.js'],
  clearMocks: true
};
