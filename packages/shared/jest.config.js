/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',
  transform: { '^.+\\.ts$': ['babel-jest', { presets: [['babel-preset-expo']] }] },
};
