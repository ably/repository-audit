# Repository Configuration Rules

Rules for Ably public and private GitHub repositories, synthesized from the [repository-audit](https://github.com/ably/repository-audit) tool.

---

## A. Default Branch Name

The default branch must be named `main` (inclusive terminology).

| Condition | Severity |
|-----------|----------|
| Branch is `main` | Pass |
| Branch is `trunk` or `develop` | Warn |
| Anything else (e.g. `master`) | Fail |

### Check

```sh
gh repo view {owner}/{repo} --json defaultBranchRef --jq '.defaultBranchRef.name'
```

### Configure

```sh
# Rename the default branch (requires updating local clones and branch protection rules)
gh api repos/{owner}/{repo} -X PATCH -f default_branch=main
```

---

## B. Branch Protection on Default Branch

The default branch must have a branch protection rule (or ruleset) configured.

### Essential (Fail if violated)

| Rule | Required value |
|------|---------------|
| Allow deletions | **false** |
| Allow force pushes | **false** |
| Restrict pushes | **true** |

### Recommended (Warn if violated)

| Rule | Required value |
|------|---------------|
| Require approving reviews | **true** |
| Required approving review count | **>= 1** |
| Require conversation resolution | **true** |
| Require status checks to pass | **true** |
| Require branches to be up to date | **true** |

### Check

```sh
gh api repos/{owner}/{repo}/branches/main/protection \
  --jq '{
    allow_deletions: .allow_deletions.enabled,
    allow_force_pushes: .allow_force_pushes.enabled,
    restrict_pushes: (.restrictions != null),
    required_reviews: .required_pull_request_reviews.required_approving_review_count,
    require_conversation_resolution: .required_conversation_resolution.enabled,
    required_status_checks_strict: .required_status_checks.strict
  }'
```

### Configure

```sh
gh api repos/{owner}/{repo}/branches/main/protection -X PUT \
  -F "required_pull_request_reviews[required_approving_review_count]=1" \
  -F "required_pull_request_reviews[dismiss_stale_reviews]=false" \
  -F "required_status_checks[strict]=true" \
  -F "required_status_checks[contexts][]=" \
  -F "enforce_admins=false" \
  -F "restrictions=null" \
  -F "allow_force_pushes=false" \
  -F "allow_deletions=false" \
  -F "required_conversation_resolution=true"
```

---

## C. GitHub Feature Switches

| Feature | Public repos | Private/Internal repos |
|---------|-------------|------------------------|
| Issues | **enabled** | **enabled** |
| Projects | **disabled** | **disabled** |
| Wiki | **disabled** | **disabled** |
| Forking | **enabled** | **disabled** |

### Check

```sh
# Features (via gh repo view)
gh repo view {owner}/{repo} --json hasIssuesEnabled,hasProjectsEnabled,hasWikiEnabled,visibility \
  --jq '{issues: .hasIssuesEnabled, projects: .hasProjectsEnabled, wiki: .hasWikiEnabled, visibility: .visibility}'

# Forking (only available via REST API)
gh api repos/{owner}/{repo} --jq '{allow_forking: .allow_forking}'
```

### Configure

```sh
gh repo edit {owner}/{repo} \
  --enable-issues \
  --enable-projects=false \
  --enable-wiki=false

# Forking (public repos: enable, private repos: disable)
gh api repos/{owner}/{repo} -X PATCH -F allow_forking=true   # public
gh api repos/{owner}/{repo} -X PATCH -F allow_forking=false   # private/internal
```

---

## D. Merge Button Configuration

| Setting | Required value |
|---------|---------------|
| Auto-delete head branches | **true** |
| Allow rebase merge | **false** |
| Allow squash merge | **false** |
| Allow merge commits | **true** |
| Allow auto-merge | **false** |

### Check

```sh
# Merge settings (via gh repo view)
gh repo view {owner}/{repo} \
  --json deleteBranchOnMerge,rebaseMergeAllowed,squashMergeAllowed,mergeCommitAllowed \
  --jq '{delete_on_merge: .deleteBranchOnMerge, rebase: .rebaseMergeAllowed, squash: .squashMergeAllowed, merge_commit: .mergeCommitAllowed}'

# Auto-merge (only available via REST API)
gh api repos/{owner}/{repo} --jq '{allow_auto_merge: .allow_auto_merge}'
```

### Configure

```sh
gh repo edit {owner}/{repo} \
  --delete-branch-on-merge \
  --enable-rebase-merge=false \
  --enable-squash-merge=false \
  --enable-merge-commit \
  --enable-auto-merge=false
```

---

## Auditing via GitHub MCP

If using the [GitHub MCP server](https://github.com/github/github-mcp-server), the same checks can be performed using its tools:

```
# Get repository details (covers checks A, C, D)
get_repository(owner, repo)

# Get branch protection (covers check B)
get_branch_protection(owner, repo, branch)

# Update repository settings (configure checks C, D)
update_repository(owner, repo, ...)

# Update branch protection (configure check B)
update_branch_protection(owner, repo, branch, ...)
```

---

## Quick Audit Script

Run all checks for a single repo:

```sh
REPO="{owner}/{repo}"

echo "=== $REPO ==="

echo "A. Default branch:"
gh repo view "$REPO" --json defaultBranchRef --jq '.defaultBranchRef.name'

echo "B. Branch protection:"
BRANCH=$(gh repo view "$REPO" --json defaultBranchRef --jq '.defaultBranchRef.name')
gh api "repos/$REPO/branches/$BRANCH/protection" 2>/dev/null \
  --jq '{
    allow_deletions: .allow_deletions.enabled,
    allow_force_pushes: .allow_force_pushes.enabled,
    required_reviews: .required_pull_request_reviews.required_approving_review_count,
    required_status_checks_strict: .required_status_checks.strict,
    require_conversation_resolution: .required_conversation_resolution.enabled
  }' || echo "  No branch protection configured"

echo "C. Features:"
gh repo view "$REPO" --json hasIssuesEnabled,hasProjectsEnabled,hasWikiEnabled,visibility \
  --jq '{issues: .hasIssuesEnabled, projects: .hasProjectsEnabled, wiki: .hasWikiEnabled, visibility: .visibility}'
echo "   Forking:"
gh api "repos/$REPO" --jq '{allow_forking: .allow_forking}'

echo "D. Merge button:"
gh repo view "$REPO" --json deleteBranchOnMerge,rebaseMergeAllowed,squashMergeAllowed,mergeCommitAllowed \
  --jq '{delete_on_merge: .deleteBranchOnMerge, rebase: .rebaseMergeAllowed, squash: .squashMergeAllowed, merge_commit: .mergeCommitAllowed}'
echo "   Auto-merge:"
gh api "repos/$REPO" --jq '{allow_auto_merge: .allow_auto_merge}'
```

---

## Sample Audit Results

Tested 2026-03-24 against real Ably repos.

### ably/ably-js (PUBLIC) - Well configured

| Check | Result | Details |
|-------|--------|---------|
| A. Default branch | Pass | `main` |
| B. Branch protection | Warn | `allow_deletions: false`, `allow_force_pushes: false`, `required_reviews: 1`, `status_checks_strict: true`, **`conversation_resolution: false`** |
| C. Features | Pass | issues: true, projects: false, wiki: false, forking: true |
| D. Merge button | Pass | delete_on_merge: true, rebase: false, squash: false, merge_commit: true, auto_merge: false |

### ably/ably-chat-js (PUBLIC) - Minor issues

| Check | Result | Details |
|-------|--------|---------|
| A. Default branch | Pass | `main` |
| B. Branch protection | Warn | `allow_deletions: false`, `allow_force_pushes: false`, `required_reviews: 1`, `status_checks_strict: true`, **`conversation_resolution: false`** |
| C. Features | Pass | issues: true, projects: false, wiki: false, forking: true |
| D. Merge button | **Fail** | delete_on_merge: true, rebase: false, squash: false, merge_commit: true, **auto_merge: true** |

### ably/ably-ai-transport-js (INTERNAL) - Multiple issues

| Check | Result | Details |
|-------|--------|---------|
| A. Default branch | Pass | `main` |
| B. Branch protection | **Fail** | No branch protection configured |
| C. Features | **Fail** | issues: true, projects: false, **wiki: true**, forking: false (correct for internal) |
| D. Merge button | **Fail** | **delete_on_merge: false**, **rebase: true**, **squash: true**, merge_commit: true, auto_merge: false |

---

## Questions for Discussion

These rules were written in 2021-2022. Some may no longer reflect current team preferences.

### Merge strategy (Rule D)

1. **Should squash merge be allowed?** Many teams now prefer squash merging to keep the main branch history clean (one commit per PR). The current rules forbid it, enforcing merge commits only. Is this still the desired approach?

2. **Should auto-merge be allowed?** ably-chat-js has it enabled. Auto-merge can speed up workflows when CI is the bottleneck. Is this now considered acceptable, or should it remain forbidden?

3. **Should rebase merge be allowed?** Some teams prefer rebase for a linear history without merge commits. Worth reconsidering?

### Branch protection (Rule B)

4. **Should conversation resolution be required?** Both ably-js and ably-chat-js have this disabled, suggesting it may not be practical. Should this be downgraded from "recommended" to "optional", or removed?

5. **Should the required reviewer count be higher than 1?** The original tool warns if < 1. Some teams require 2 reviewers for critical repos. Is 1 the right threshold for all repos?

6. **Should rules differ between public and private repos?** The current branch protection rules apply uniformly. Private/internal repos (like ably-ai-transport-js) often have smaller teams where strict branch protection adds friction. Should there be a lighter set of rules for internal repos?

7. **Branch protection rules vs. rulesets?** GitHub now recommends rulesets over legacy branch protection rules. Should the audit check for rulesets as well (or instead)?

### Features (Rule C)

8. **Should Projects remain disabled?** GitHub Projects (v2) is a very different product from the original Projects. If teams are using Projects v2 for planning, should this rule be relaxed?

9. **Should Issues be required on private/internal repos?** Some internal repos may use Linear or another tracker instead. Should this be a warn rather than fail for non-public repos?

### Scope

10. **Should there be different rule tiers?** e.g. "must" (fail), "should" (warn), "may" (info) — with different tiers for SDK repos vs. internal tooling vs. forks vs. archived repos.

11. **Should archived repos be excluded?** The original tool doesn't appear to filter out archived repos, which can't be meaningfully configured.

12. **Are there new rules worth adding?** e.g. requiring a LICENSE file, CODEOWNERS, Dependabot/Renovate config, security policy, or specific GitHub Actions permissions.
