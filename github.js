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
   * The the full, 40-character SHA-1 hash for the commit at `HEAD` of the current branch (`GITHUB_SHA`).
   */
  get sha() {
    const { GITHUB_SHA } = this.processEnvironment;
    return GITHUB_SHA ?? childProcess.execSync('git rev-parse HEAD').toString().trim();
  }

  /**
   *
   */
  get branch() {
    const {
      GITHUB_REF,
      GITHUB_EVENT_NAME,
      GITHUB_HEAD_REF,
    } = this.processEnvironment;

    if (!(GITHUB_REF || GITHUB_EVENT_NAME || GITHUB_HEAD_REF)) {
      return childProcess.execSync('git rev-parse --abbrev-ref HEAD').toString().trim();
    }

    switch (GITHUB_EVENT_NAME) {
      case 'pull_request':
        return GITHUB_HEAD_REF;
      case 'push':
        return GitHub.branchFromPushEventRef(GITHUB_REF);
      default:
        throw new Error(`Event name "${GITHUB_EVENT_NAME} not recognised.`);
    }
  }

  /**
   * e.g. `https://github.com/ably/ably-java`.
   * @param {string} organizationName The org name (e.g. `ably`).
   * @param {string} repositoryName The repository name (e.g. `ably-java`).
   * @returns {URL} The absolute URL to visit this repository in a browser.
   */
  repositoryURL(organizationName, repositoryName) {
    const { GITHUB_SERVER_URL } = this.processEnvironment;
    // e.g. https://github.com/ably/ably-java
    const base = GITHUB_SERVER_URL ?? 'https://github.com/';
    return new URL(`${organizationName}/${repositoryName}`, base);
  }

  /**
   * Unpacks the branch name from `GITHUB_REF` when `GITHUB_EVENT_NAME` is known to be `'push'`.
   */
  static branchFromPushEventRef(ref) {
    // Based on this approach:
    // https://github.com/ably/sdk-upload-action/blob/51789744a865585f887a922995b7166dfb93ca4f/src/index.ts#L28
    const parts = ref.split('/');
    if (parts.length < 3) {
      throw new Error(`Too few parts. ref: ${ref}`);
    }
    if (parts.some((part) => part.length < 1)) {
      throw new Error(`Empty part(s). ref: ${ref}`);
    }
    if (parts[0] !== 'refs' || parts[1] !== 'heads') {
      throw new Error(`Unexpected prefix. ref: ${ref}`);
    }
    return parts.slice(2).join('/');
  }
}

module.exports = {
  GitHub,
};
