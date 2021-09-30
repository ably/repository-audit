const childProcess = require('child_process');

/**
 * Presents a front end for the environment available to us when running in a GitHub workflow context.
 *
 * When not running in a GitHub workflow context, fallbacks are provided which are compatible with testing on developer
 * workstations. In other words, if `GITHUB_`-prefixed environment variables are available then we prefer to use them.
 */
class GitHub {
  /**
   * Create and initialise a GitHub object, presenting a front end for the environment available to us when running in
   * a GitHub workflow context.
   * @param {*} processEnvironment Typically Node.js' process.env, however may be mocked for testing purposes.
   */
  constructor(processEnvironment) {
    if (!processEnvironment || typeof processEnvironment !== 'object') {
      throw new Error('Process environment must be supplied.');
    }
    this.processEnvironment = processEnvironment;
  }

  /**
   * The the full, 40-character SHA-1 hash for the commit at `HEAD` of the current branch.
   */
  get sha() {
    const { GITHUB_SHA } = this.processEnvironment;
    return GITHUB_SHA ?? childProcess.execSync('git rev-parse HEAD').toString().trim();
  }
}

module.exports = {
  GitHub,
};
