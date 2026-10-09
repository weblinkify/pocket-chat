const preset = require('jest-expo/ios/jest-preset');

/** @type {import('jest').Config} */
module.exports = {
  preset: 'jest-expo/ios',
  // msw's CJS build require()s ESM-only deps (rettime, until-async, ...); transform those too.
  transform: {
    ...preset.transform,
    '\\.mjs$': ['babel-jest', { caller: { name: 'metro', bundler: 'metro', platform: 'ios' } }],
  },
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  moduleNameMapper: { '^@/(.*)$': '<rootDir>/src/$1' },
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|nativewind|react-native-css-interop|marked|prism-react-renderer|@pocket-chat/.*|until-async|headers-polyfill))(?!.*\\.mjs$)',
  ],
  testPathIgnorePatterns: ['/node_modules/', '/.maestro/'],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/app/**',
    // Composition root: native SQLite/NetInfo wiring, exercised by Maestro E2E.
    '!src/providers/AppProviders.tsx',
    '!src/**/*.test.{ts,tsx}',
    '!src/test/**',
    '!src/**/index.ts',
  ],
  coverageThreshold: {
    global: { lines: 85, branches: 85, functions: 85, statements: 85 },
  },
};
