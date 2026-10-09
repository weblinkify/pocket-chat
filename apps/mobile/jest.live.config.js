/**
 * Live tests against a running API (no react-native preset, so the real Node fetch is used).
 * E2E_API_URL=http://localhost:8000 pnpm --filter @pocket-chat/mobile test:live
 * @type {import('jest').Config}
 */
module.exports = {
  testEnvironment: 'node',
  testMatch: ['<rootDir>/src/**/*.live.test.ts'],
  moduleNameMapper: { '^@/(.*)$': '<rootDir>/src/$1' },
  transform: {
    '^.+\\.(ts|tsx|js)$': [
      'babel-jest',
      { presets: ['babel-preset-expo'], babelrc: false, configFile: false },
    ],
  },
  transformIgnorePatterns: ['node_modules/(?!(@pocket-chat/.*))'],
};
