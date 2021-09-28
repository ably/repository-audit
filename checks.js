const PASS = 'green';
const FAIL = 'red';
const WARN = 'yellow';

class Repository {
  constructor(repository) {
    this.repository = repository;
  }

  defaultBranchName() {
    const { defaultBranchRef } = this.repository;
    if (!defaultBranchRef) return WARN; // nothing pushed to repository yet
    switch (defaultBranchRef.name) {
      case 'main':
        return PASS;
      case 'trunk':
      case 'develop':
        return WARN; // non-standard, but acceptable
      default:
        return FAIL; // assumed to be something non-inclusive
    }
  }

  branchProtectionRuleForDefaultBranch() {
    const { defaultBranchRef, branchProtectionRules } = this.repository;
    if (!defaultBranchRef) return FAIL;
    if (!branchProtectionRules) return FAIL;
    if (branchProtectionRules.pageInfo.hasNextPage) return FAIL;

    // https://docs.github.com/en/graphql/reference/objects#branchprotectionrule
    const rule = branchProtectionRules.nodes.find((node) => node.pattern === defaultBranchRef.name);
    if (!rule) return FAIL;

    // Essentials.
    if (rule.allowsDeletions) return FAIL;
    if (rule.allowsForcePushes) return FAIL;
    if (!rule.restrictsPushes) return FAIL;

    // Ideals.
    if (!rule.requiresApprovingReviews) return WARN;
    if (rule.requiredApprovingReviewCount < 1) return WARN;
    if (!rule.requiresConversationResolution) return WARN;
    if (!rule.requiresStatusChecks) return WARN;
    if (!rule.requiresStrictStatusChecks) return WARN;

    return PASS;
  }
}

module.exports = {
  Repository,
  PASS,
  FAIL,
  WARN,
};
