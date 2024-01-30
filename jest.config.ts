import type { Config } from 'jest'

const config: Config = {
  preset: 'ts-jest',
  testTimeout: 60000,
  testEnvironment: 'node',
  roots: ['./tests'],
  verbose: false,
  extensionsToTreatAsEsm: ['.ts'],
  transform: {
    '^.+\\.(t|j)sx?$': '@swc/jest',
  },
  collectCoverage: false,
}

export default config
