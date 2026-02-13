// jest.config.ts
import type { Config } from '@jest/types';

import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const config: Config.InitialOptions = {
  // using explicit ts-jest transform below (avoid preset to prevent default hoisting transformer)
  preset: "ts-jest",
  testEnvironment: 'jest-fixed-jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'], // Points to the setup file for jest-dom matchers
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'], // Ensures correct file resolution
  // Add other options as needed
  moduleNameMapper: {
    '^Images/(.*)$': '<rootDir>/src/static/$1',
    '^gpxparser$': '<rootDir>/__mocks__/gpxparser.js',
    '^uuid$': '<rootDir>/__mocks__/uuid.js',
    '^query-string$': '<rootDir>/__mocks__/query-string.js',
    '^p-limit$': '<rootDir>/__mocks__/p-limit.js',
    '^./stravaRouteParser$': '<rootDir>/__mocks__/stravaRouteParser.js',
    '\\.(css|scss|sass|less)$': '<rootDir>/__mocks__/styleMock.js',
  },
  transformIgnorePatterns: [
    'node_modules/(?!(@mswjs|@exodus|gpxparser|query-string|msw|until-async)/)'
  ],
  transform: {
    '^.+\\.(css|scss|sass|less)$': 'jest-transform-css',
    '^.+\\.(tsx?|jsx?)$': ['ts-jest', {
      tsconfig: 'tsconfig.test.json',
      babelConfig: true,
      // astTransformers: {
      //   before: [],
      //   after: []
      // }
    }]
  },
  moduleDirectories: [
    'node_modules',
    'src/utils', // Add your utility folder here
    __dirname,
  ]  
};

export default config;

