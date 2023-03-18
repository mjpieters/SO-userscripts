// This **MUST** be a CommonJS module in JavaScript because semantic-release
// configuration needs to be able to import this without compilation, and
// semantic-release expects the configuration to be a CommonJS module.
// The module exports are re-exported in ./utils/index.d.ts for cleaner imports
// from ECMAScript modules.

// @ts-check
// eslint-disable-next-line @typescript-eslint/no-var-requires
const execSync = require('child_process').execSync

/**
 * Execute a shell command, return the output as a string
 * @param {string} command
 * @returns {string}
 */
const run = (command) => execSync(command).toString().trim()

/**
 * Retrieve the current branch name
 * @returns {string}
 */
const currentBranch = () =>
  (process.env.GITHUB_REF || '').replace('refs/heads/', '') ||
  run('git branch --show-current')

/**
 * Retrieve the current nearest tag
 * @param {string} defaultTag
 * @returns {string}
 */
const currentTag = (defaultTag = '1.0.0') => {
  return run(`git describe --tags --abbrev=0 || echo "${defaultTag}"`)
}

/**
 * Verify that a branch exists on the remote
 * @param {string} branch
 * @returns {boolean}
 */
const branchExistsOnRemote = (branch) => {
  try {
    run(`git ls-remote --exit-code --heads origin '${branch}'`)
    return true
  } catch (e) {
    return false
  }
}

module.exports = {
  currentBranch,
  currentTag,
  branchExistsOnRemote,
}
