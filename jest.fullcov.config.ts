// jest.config.ts
import type { Config } from '@jest/types';

import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const config: Config.InitialOptions = {
    // using explicit ts-jest transform below (avoid preset to prevent default hoisting transformer)
    collectCoverage: true,
    collectCoverageFrom: ["src/{jsx,redux,server,utils}/**/*.{js,jsx,ts,tsx}"],
    coveragePathIgnorePatterns: [
    ],
    testEnvironment: 'jsdom', // Provides a browser-like environment (Jest 28+ requires separate install)
    setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'], // Points to the setup file for jest-dom matchers
    moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'], // Ensures correct file resolution
    // Add other options as needed
    moduleNameMapper: {
        '^Images/(.*)$': '<rootDir>/src/static/$1',
        '^gpxparser$': '<rootDir>/__mocks__/gpxparser.js',
        '^./stravaRouteParser$': '<rootDir>/__mocks__/stravaRouteParser.js',
        '\\.(css|scss|sass|less)$': '<rootDir>/__mocks__/styleMock.js',
    },
    transform: {
        '^.+\\.(css|scss|sass|less)$': 'jest-transform-css',
        '^.+\\.tsx?$': ['ts-jest', {
            tsconfig: 'tsconfig.test.json',
            babelConfig: true,
            // disable ast transformers (hoisting) to avoid ts-jest hoist errors
            astTransformers: {
                before: [],
                after: []
            }
        }]
    },
    moduleDirectories: [
        'node_modules',
        'src/utils', // Add your utility folder here
        __dirname,
    ],
    testMatch: [
        '**/?(*.)+(test).ts(x)?' // adjust as needed
  ],
};

export default config;

