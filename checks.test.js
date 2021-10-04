const {
  Result,
  Repository,
  PASS,
  FAIL,
  WARN,
} = require('./checks');

const repository = (data) => new Repository(data);

describe('default branch name', () => {
  it('returns fail if "main"', () => {
    expect(repository({ defaultBranchRef: { name: 'main' } }).defaultBranchName().indication).toBe(PASS);
  });

  it('returns warn if "trunk"', () => {
    expect(repository({ defaultBranchRef: { name: 'trunk' } }).defaultBranchName().indication).toBe(WARN);
  });

  it('returns warn if "develop"', () => {
    expect(repository({ defaultBranchRef: { name: 'develop' } }).defaultBranchName().indication).toBe(WARN);
  });

  it('returns fail if "master"', () => {
    expect(repository({ defaultBranchRef: { name: 'master' } }).defaultBranchName().indication).toBe(FAIL);
  });

  it('returns fail if some random string', () => {
    expect(repository({ defaultBranchRef: { name: 'ably' } }).defaultBranchName().indication).toBe(FAIL);
  });

  it('returns fail if null', () => {
    expect(repository({ defaultBranchRef: { name: null } }).defaultBranchName().indication).toBe(FAIL);
  });

  it('returns fail if undefined', () => {
    expect(repository({ defaultBranchRef: { name: undefined } }).defaultBranchName().indication).toBe(FAIL);
  });

  it('returns fail if not present', () => {
    expect(repository({ defaultBranchRef: { } }).defaultBranchName().indication).toBe(FAIL);
  });
});

describe('result string values', () => {
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

describe('result emoji values', () => {
  it('pass is green circle', () => {
    expect((new Result(PASS)).emoji).toBe(':green_circle:');
  });

  it('fail is red circle', () => {
    expect((new Result(FAIL)).emoji).toBe(':red_circle:');
  });

  it('warn is yellow circle', () => {
    expect((new Result(WARN)).emoji).toBe(':yellow_circle:');
  });
});

test.todo('branchProtectionRuleForDefaultBranch');
test.todo('features');
