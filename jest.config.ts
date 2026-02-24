import type { Config } from 'jest';

const config: Config = {
    preset: 'ts-jest/presets/default-esm', // Use ESM preset
    testEnvironment: 'node',
    roots: ['<rootDir>/src'],
    transform: {
        '^.+\\.tsx?$': ['ts-jest', {
            useESM: true,
            isolatedModules: true,
        }],
    },
    moduleNameMapper: {
        '^@controller/(.*)\\.js$': '<rootDir>/src/controllers/$1',
        '^@middleware/(.*)\\.js$': '<rootDir>/src/middleware/$1',
        '^@utils/(.*)\\.js$': '<rootDir>/src/utils/$1',
        '^@routes/(.*)\\.js$': '<rootDir>/src/routes/$1',
        '^@models/(.*)\\.js$': '<rootDir>/src/models/$1',
        '^(\\.{1,2}/.*)\\.js$': '$1', // Map .js imports to source files (crucial for ESM style imports)
    },
    setupFilesAfterEnv: ['<rootDir>/src/tests/setup.ts'],
    testMatch: ['**/*.test.ts'],
    extensionsToTreatAsEsm: ['.ts'], // Treat .ts files as ESM
};

export default config;
