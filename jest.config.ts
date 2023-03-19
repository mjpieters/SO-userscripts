import type { JestConfigWithTsJest } from 'ts-jest'
import { UserScripts } from './utils'

const scripts = new UserScripts()

const jestConfig: JestConfigWithTsJest = {
  projects: [
    {
      displayName: 'build',
      roots: ['<rootDir>/test'],
      preset: 'ts-jest',
      coveragePathIgnorePatterns: ['node-modules', '<rootDir>/utils'],
    },
    ...scripts.tests.map(({ name, path }) => ({
      displayName: name,
      roots: [path],
      preset: 'ts-jest',
      testEnvironment: 'jsdom',
    })),
  ],
  coverageDirectory: 'coverage',
}
export default jestConfig
