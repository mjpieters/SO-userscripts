import type { JestConfigWithTsJest } from 'ts-jest'
import { pathsToModuleNameMapper } from 'ts-jest'
import { compilerOptions } from './tsconfig.json'
import { UserScripts } from './utils'

const scripts = new UserScripts()

const jestConfig: JestConfigWithTsJest = {
  projects: [
    {
      displayName: 'build',
      roots: ['<rootDir>/test/'],
      preset: 'ts-jest',
      transform: { '^.+\\.(t|j)sx?$': '@swc/jest' },
      coveragePathIgnorePatterns: ['/node_modules/', '<rootDir>/utils/'],
    },
    ...scripts.tests.map(({ name, path }) => ({
      displayName: name,
      roots: [path],
      coveragePathIgnorePatterns: [
        '/node_modules/',
        `${path}/test/`,
        `<rootDir>/scripts/(?!${name})/`,
      ],
      preset: 'ts-jest',
      transform: { '^.+\\.(t|j)sx?$': '@swc/jest' },
      testEnvironment: 'jsdom',
      setupFilesAfterEnv: ['<rootDir>/utils/testSetup.ts'],
      modulePaths: [compilerOptions.baseUrl],
      moduleNameMapper: pathsToModuleNameMapper(compilerOptions.paths),
      transformIgnorePatterns: [
        '<rootDir>/node_modules/(?!(stimulus-use|@stackoverflow/stacks-icons))',
      ],
    })),
  ],
  coverageDirectory: 'coverage',
  collectCoverageFrom: ['**/*.{js,ts,jsx,tsx}'],
}
export default jestConfig
