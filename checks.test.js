const {
  Repository,
  PASS,
  FAIL,
  WARN,
} = require('./checks');

const repository = (data) => new Repository(data);

describe('default branch name', () => {
  it('returns fail if "main"', () => {
    expect(repository({ defaultBranchRef: { name: 'main' } }).defaultBranchName()).toBe(PASS);
  });

  it('returns warn if "trunk"', () => {
    expect(repository({ defaultBranchRef: { name: 'trunk' } }).defaultBranchName()).toBe(WARN);
  });

  it('returns warn if "develop"', () => {
    expect(repository({ defaultBranchRef: { name: 'develop' } }).defaultBranchName()).toBe(WARN);
  });

  it('returns fail if "master"', () => {
    expect(repository({ defaultBranchRef: { name: 'master' } }).defaultBranchName()).toBe(FAIL);
  });

  it('returns fail if some random string', () => {
    expect(repository({ defaultBranchRef: { name: 'ably' } }).defaultBranchName()).toBe(FAIL);
  });

  it('returns fail if null', () => {
    expect(repository({ defaultBranchRef: { name: null } }).defaultBranchName()).toBe(FAIL);
  });

  it('returns fail if undefined', () => {
    expect(repository({ defaultBranchRef: { name: undefined } }).defaultBranchName()).toBe(FAIL);
  });

  it('returns fail if not present', () => {
    expect(repository({ defaultBranchRef: { } }).defaultBranchName()).toBe(FAIL);
  });
});

describe('result values', () => {
  it('pass is green', () => {
    expect(PASS).toBe('green');
  });

  it('warn is yellow', () => {
    expect(WARN).toBe('yellow');
  });

  it('fail is red', () => {
    expect(FAIL).toBe('red');
  });
});

test.todo('branchProtectionRuleForDefaultBranch');
