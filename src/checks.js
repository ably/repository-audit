const { isFalse, isTrue } = require('./strict');

const PASS = 'pass';
const FAIL = 'fail';
const WARN = 'warn';

const indicationLabel = (indication) => `${indication.charAt(0).toUpperCase()}${indication.substring(1)}`;

class Result {
  /**
   * Create and initialise a Result object, indicating the result of a check.
   *
   * @param {string} indication The high level result being expressed (PASS, FAIL or WARN).
   * @param {string} [description] Specific, markdown-formatted detail around the reasons for this check not passing, otherwise null.
   * May contain multiple lines or paragraphs when rendered.
   */
  constructor(indication, description) {
    this.indication = indication;
    this.description = description ?? null;
  }

  /**
   * @returns {string} The GitHub-compatible emoji representing this result's indication.
   * See: https://api.github.com/emojis
   */
  get emoji() {
    const { indication } = this;
    let colour;
    switch (indication) {
      case PASS: colour = 'green'; break;
      case WARN: colour = 'yellow'; break;
      case FAIL: colour = 'red'; break;
      default:
        throw new Error(`Unrecognised indication "${indication}".`);
    }

    return `:${colour}_circle:`;
  }

  get isPass() {
    return this.indication === PASS;
  }
}

class ResultList {
  /**
   * Create and initialise a ResultList object, aggregating results from multiple checks.
   *
   * @param {string} listDescription The markdown-formatted detail introducing the results.
   */
  constructor(listDescription) {
    this.listDescription = listDescription;
    this.indication = PASS;
    this.negativeResults = []; // of Result
  }

  /**
   * Add a result to this list, only if it's negative.
   *
   * @param {Result} result The result to add to this list, ignored if it's a PASS.
   */
  add(result) {
    if (result === PASS) return; // PASS is our default state and we're only accumulating negative results
    this.negativeResults.push(result);
    if (this.indication === FAIL) return; // game over (that is, don't overwrite existing FAIL if this result is a WARN)
    this.indication = result.indication;
  }

  /**
   * @returns {Result} The concluding result, taking into account all results added to this list. FAIL beats WARN.
   */
  get result() {
    const md = [`${this.listDescription}\n`]; // string accumulation buffer
    this.negativeResults.forEach((result) => {
      md.push(`\n- ${result.emoji} ${result.description}`);
    });
    return new Result(this.indication, md.join(''));
  }
}

const pass = () => new Result(PASS);
const fail = (description) => new Result(FAIL, description);
const warn = (description) => new Result(WARN, description);

const NO_DEFAULT_BRANCH_REF_MESSAGE = 'There is no default branch defined, probably indicating this repository is empty.';

class Repository {
  constructor(repository) {
    this.repository = repository;
  }

  /**
   * Validates the default branch name.
   *
   * @returns {Result} The result of this check for this repository.
   */
  defaultBranchName() {
    const { defaultBranchRef } = this.repository;
    if (!defaultBranchRef) return warn(NO_DEFAULT_BRANCH_REF_MESSAGE);
    const { name } = defaultBranchRef;
    switch (defaultBranchRef.name) {
      case 'main':
        return pass();
      case 'trunk':
      case 'develop':
        return warn(`Non-standard name \`${name}\`.`);
      default:
        return fail(`Non-standard name \`${name}\`. Assumed to be something non-inclusive.`);
    }
  }

  /**
   * Validates that there is a branch protection rule for the default branch and that it is configured correctly.
   *
   * @returns {Result} The result of this check for this repository.
   */
  branchProtectionRuleForDefaultBranch() {
    const { defaultBranchRef, branchProtectionRules } = this.repository;
    if (!defaultBranchRef) return warn(NO_DEFAULT_BRANCH_REF_MESSAGE);
    if (!branchProtectionRules) return fail('There are no branch protection rules defined.');
    if (branchProtectionRules.pageInfo.hasNextPage) return fail('There are more branch protection rules defined for this repository than this tool\'s simplistic GraphQL implementation can handle.');

    // https://docs.github.com/en/graphql/reference/objects#branchprotectionrule
    const { name } = defaultBranchRef;
    const rule = branchProtectionRules.nodes.find((node) => node.pattern === name);
    if (!rule) return fail(`There is no branch protection rule defined for pattern \`${name}\`.`);

    const results = new ResultList('Default branch protection rule:');

    // FAIL for Essentials
    let emit = (description) => results.add(fail(description));
    if (isTrue(rule.allowsDeletions)) emit('Can be deleted.');
    if (isTrue(rule.allowsForcePushes)) emit('Allows force push.');
    if (isFalse(rule.restrictsPushes)) emit('Does not restrict push.');

    // WARN for Ideals
    emit = (description) => results.add(warn(description));
    if (isFalse(rule.requiresApprovingReviews)) emit('Does not require reviewer approval.');
    if (rule.requiredApprovingReviewCount < 1) emit('Required approving reviewer count is too low.');
    if (isFalse(rule.requiresConversationResolution)) emit('Does not require conversations to be resolved before merging.');
    if (isFalse(rule.requiresStatusChecks)) emit('Does not require status checks to pass.');
    if (isFalse(rule.requiresStrictStatusChecks)) emit('Does not require branches to be up to date before merging.');

    return results.result;
  }

  features() {
    const {
      hasIssuesEnabled,
      hasProjectsEnabled,
      hasWikiEnabled,
      forkingAllowed,
      visibility,
    } = this.repository;

    const results = new ResultList('GitHub feature switches:');
    const emit = (description) => results.add(fail(description));

    if (isFalse(hasIssuesEnabled)) emit('Issues are disabled.');
    if (isTrue(hasProjectsEnabled)) emit('Projects are enabled.');
    if (isTrue(hasWikiEnabled)) emit('Wiki is enabled.');
    if (visibility === 'PUBLIC' && isFalse(forkingAllowed)) emit('Forking is disabled.');
    if (visibility !== 'PUBLIC' && isTrue(forkingAllowed)) emit('Forking is enabled.');

    return results.result;
  }

  mergeButton() {
    const {
      deleteBranchOnMerge,
      rebaseMergeAllowed,
      squashMergeAllowed,
      mergeCommitAllowed,
      autoMergeAllowed,
    } = this.repository;

    const results = new ResultList('Merge button switches:');
    const emit = (description) => results.add(fail(description));

    if (isFalse(deleteBranchOnMerge)) emit('Does not automatically delete head branches.');
    if (isTrue(rebaseMergeAllowed)) emit('Allows rebase merging.');
    if (isTrue(squashMergeAllowed)) emit('Allows squash merging.');
    if (isFalse(mergeCommitAllowed)) emit('Does not allow merge commits.');
    if (isTrue(autoMergeAllowed)) emit('Allows auto-merge.');

    return results.result;
  }
}

module.exports = {
  Result,
  Repository,
  PASS,
  FAIL,
  WARN,
  indicationLabel,
};
