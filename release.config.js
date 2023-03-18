// @ts-check
// eslint-disable-next-line @typescript-eslint/no-var-requires
const gitUtils = require('./utils/git.cjs')

const mainBranch = 'main'
const currentBranch = gitUtils.currentBranch()

if (!gitUtils.branchExistsOnRemote(currentBranch)) {
  throw new Error(
    `Branch '${currentBranch}' needs to exist on remote to run release`
  )
}

console.log('Current branch:', currentBranch)
const dryRun = currentBranch !== mainBranch
const step = dryRun ? 'verifyConditionsCmd' : 'verifyReleaseCmd'
/* eslint-disable no-template-curly-in-string */
const version = dryRun ? gitUtils.currentTag() : '${nextRelease.version}'
const message = 'ci: Release scripts [skip ci]\n\n${nextRelease.notes}'
/* eslint-enable */

module.exports = {
  branches: [currentBranch],
  dryRun,
  plugins: [
    '@semantic-release/commit-analyzer',
    '@semantic-release/release-notes-generator',
    [
      '@semantic-release/exec',
      { [step]: `env VERSION=${version} yarn run build` },
    ],
    ['@semantic-release/git', { assets: ['dist'], message }],
  ],
}
