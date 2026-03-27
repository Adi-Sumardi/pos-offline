/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/__tests__'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        diagnostics: false,
        tsconfig: {
          // Override strict settings for test compatibility
          jsx: 'react',
          esModuleInterop: true,
          allowJs: true,
          moduleResolution: 'node',
          module: 'commonjs',
          target: 'es2020',
          strict: false,
          noEmit: false,
        },
      },
    ],
  },
  testPathIgnorePatterns: ['/node_modules/', '/app/', '/components/'],
  collectCoverageFrom: [
    'utils/**/*.ts',
    'stores/**/*.ts',
    'db/queries/**/*.ts',
    '!**/*.d.ts',
  ],
};
