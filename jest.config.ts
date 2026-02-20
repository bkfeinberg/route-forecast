// jest.config.ts
import type { Config } from '@jest/types';

import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const config: Config.InitialOptions = {
  preset: "ts-jest",
  testEnvironment: 'jest-fixed-jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'], // Points to the setup file for jest-dom matchers
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'], // Ensures correct file resolution
  // Add other options as needed
  moduleNameMapper: {
    "\\.(jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga|htm)(\\?.*)?$": "<rootDir>/__mocks__/fileMock.js",
    '^Images/(.*)$': '<rootDir>/src/static/$1',
    '^uuid$': '<rootDir>/__mocks__/uuid.js',
    '^query-string$': '<rootDir>/__mocks__/query-string.js',
    '^p-limit$': '<rootDir>/__mocks__/p-limit.js',
    '\\.(css|scss|sass|less)$': '<rootDir>/__mocks__/styleMock.js',
  },
  transformIgnorePatterns: [
    'node_modules/(?!(@mswjs|@exodus|gpxparser|query-string|msw|until-async|export-to-csv)/)'
  ],
  transform: {
    '^.+\\.(css|scss|sass|less)$': 'jest-transform-css',
    '^.+\\.(tsx?|jsx?)$': ['ts-jest', {
      tsconfig: 'tsconfig.test.json',
      babelConfig: true,
    }]
  },
  moduleDirectories: [
    'node_modules',
    'src/utils', // Add your utility folder here
    __dirname,
  ]  
};

export default config;

