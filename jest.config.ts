import type { JestConfigWithTsJest } from 'ts-jest'
import { UserScripts } from './utils'

const scripts = new UserScripts()

const jestConfig: JestConfigWithTsJest = {
  projects: [
    {
      displayName: 'build',
      roots: ['<rootDir>/test'],
      preset: 'ts-jest',
    },
    ...scripts.tests.map(({ name, path }) => ({
      displayName: name,
      roots: [path],
      preset: 'ts-jest',
      testEnvironment: 'jsdom',
    })),
  ],
}
export default jestConfig
