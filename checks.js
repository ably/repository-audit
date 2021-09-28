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
}

module.exports = {
  Repository,
};
