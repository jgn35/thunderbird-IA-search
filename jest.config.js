/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'jest-environment-node',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  testMatch: ['**/*.test.js'],
  moduleFileExtensions: ['js', 'json', 'node'],
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/**/*.config.js',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov'],
  verbose: true,
  transform: {},
};
