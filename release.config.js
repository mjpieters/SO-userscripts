// @ts-check
// eslint-disable-next-line @typescript-eslint/no-var-requires
const execSync = require('child_process').execSync

const mainBranch = 'main'

/** @param {string} command */
const run = (command) => execSync(command).toString().trim()

const branch =
  (process.env.GITHUB_REF || '').replace('refs/heads/', '') ||
  run('git branch --show-current')

try {
  run(`git ls-remote --exit-code --heads origin '${branch}'`)
} catch (e) {
  throw new Error(`Branch '${branch}' needs to exist on remote to run release`)
}

console.log('Current branch:', branch)
const dryRun = branch !== mainBranch
const step = dryRun ? 'verifyConditionsCmd' : 'verifyReleaseCmd'
/* eslint-disable no-template-curly-in-string */
const version = dryRun
  ? run('git describe --tags --abbrev=0 || echo "1.0.0"')
  : '${nextRelease.version}'
const message = 'ci: Release scripts [skip ci]\n\n${nextRelease.notes}'
/* eslint-enable */

module.exports = {
  branches: [branch],
  dryRun,
  plugins: [
    '@semantic-release/commit-analyzer',
    '@semantic-release/release-notes-generator',
    [
      '@semantic-release/exec',
      { [step]: `env VERSION=${version} npm run build` },
    ],
    ['@semantic-release/git', { assets: ['dist'], message }],
  ],
}
