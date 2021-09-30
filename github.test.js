const { format: prettyFormat } = require('pretty-format');
const {
  everythingButObject,
  everythingButString,
} = require('./test-constants');

const { GitHub } = require('./github');

const github = (env) => new GitHub(env);

describe('constructor', () => {
  everythingButObject.forEach((badEnv) => {
    it(`fails if process environment argument is ${prettyFormat(badEnv)}`, () => {
      // eslint-disable-next-line no-new
      expect(() => { new GitHub(badEnv); }).toThrow();
    });
  });
});

describe('sha', () => {
  const expectedLength = 40; // https://git-scm.com/book/en/v2/Git-Tools-Revision-Selection#_single_revisions
  const expectedPattern = /^[0-9a-f]+$/; // https://stackoverflow.com/a/5317339/392847

  it('is populated when GitHub environment not available', () => {
    const { sha } = github({});
    expect(sha).toHaveLength(expectedLength);
    expect(sha).toMatch(expectedPattern);
  });

  it('uses the GitHub environment if it is available', () => {
    const mockValue = 'foo';
    expect(github({ GITHUB_SHA: mockValue }).sha).toMatch(mockValue);
  });
});

describe('branch', () => {
  it('is populated when GitHub environment not available', () => {
    const { branch } = github({});
    expect(typeof branch).toBe('string');
    expect(branch.length).toBeGreaterThan(0);
    expect(branch.trim().length).toBeGreaterThan(0);
  });

  it('is populated when GitHub environment for pull request is available', () => {
    // as observed: https://github.com/ably/repository-audit/issues/4#issuecomment-931551129
    const env = {
      GITHUB_REF: 'refs/pull/14/merge',
      GITHUB_EVENT_NAME: 'pull_request',
      GITHUB_HEAD_REF: 'explore-github-environment',
    };

    expect(github(env).branch).toBe('explore-github-environment');
  });

  it('is populated when GitHub environment for push is available', () => {
    // as observed: https://github.com/ably/repository-audit/issues/4#issuecomment-931551129
    const env = {
      GITHUB_REF: 'refs/heads/main',
      GITHUB_EVENT_NAME: 'push',
      GITHUB_HEAD_REF: '',
    };

    expect(github(env).branch).toBe('main');
  });

  it('fails if the GitHub environment is available but the event name is not recognised', () => {
    const badEnv = {
      GITHUB_REF: 'foo',
      GITHUB_EVENT_NAME: 'eat_pie',
      GITHUB_HEAD_REF: 'bar',
    };

    // eslint-disable-next-line no-unused-vars
    expect(() => { const dummy = github(badEnv).branch; }).toThrow();
  });
});

describe('static utility methods', () => {
  describe('branchFromPushEventRef', () => {
    everythingButString.forEach((badRef) => {
      it(`fails if ref argument is ${prettyFormat(badRef)}`, () => {
        expect(() => { GitHub.branchFromPushEventRef(badRef); }).toThrow();
      });
    });

    describe('ref argument has too few or empty parts', () => {
      [
        'refs',
        'refs/',
        'refs/heads',
        'refs/heads/',
        'refs/heads//',
      ].forEach((badRef) => {
        it(`fails if ref argument is ${prettyFormat(badRef)}`, () => {
          expect(() => { GitHub.branchFromPushEventRef(badRef); }).toThrow();
        });
      });
    });

    it('returns expected branch name', () => {
      expect(GitHub.branchFromPushEventRef('refs/heads/main')).toBe('main');
      expect(GitHub.branchFromPushEventRef('refs/heads/feature/123-foo-bar')).toBe('feature/123-foo-bar');
    });
  });
});
