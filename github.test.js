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

describe('repositoryURL', () => {
  it('is populated when GitHub environment not available', () => {
    const url = github({}).repositoryURL('foo', 'bar');
    expect(typeof url).toBe('object'); // https://nodejs.org/docs/latest-v14.x/api/url.html
    expect(url.hostname).toBe('github.com');
    expect(url.protocol).toBe('https:');
    expect(url.pathname).toBe('/foo/bar');
  });

  it('is populated when GitHub environment available, and looking as expected', () => {
    // as observed: https://github.com/ably/repository-audit/issues/4#issuecomment-931663619
    const env = {
      GITHUB_SERVER_URL: 'https://github.com',
    };

    const url = github(env).repositoryURL('ably', 'ably-java');
    expect(typeof url).toBe('object'); // https://nodejs.org/docs/latest-v14.x/api/url.html
    expect(url.hostname).toBe('github.com');
    expect(url.protocol).toBe('https:');
    expect(url.pathname).toBe('/ably/ably-java');
  });

  it('is populated when GitHub environment available, even if unexpected host', () => {
    // as observed: https://github.com/ably/repository-audit/issues/4#issuecomment-931663619
    const surprisingEnv = {
      GITHUB_SERVER_URL: 'https://gitlab.com',
    };

    const url = github(surprisingEnv).repositoryURL('ably-labs', 'AblyD');
    expect(typeof url).toBe('object'); // https://nodejs.org/docs/latest-v14.x/api/url.html
    expect(url.hostname).toBe('gitlab.com');
    expect(url.protocol).toBe('https:');
    expect(url.pathname).toBe('/ably-labs/AblyD');
  });

  it('is populated when GitHub environment available, even if unexpected protocol', () => {
    // as observed: https://github.com/ably/repository-audit/issues/4#issuecomment-931663619
    const surprisingEnv = {
      GITHUB_SERVER_URL: 'http://github.com',
    };

    const url = github(surprisingEnv).repositoryURL('ably', 'ably-asset-tracking-android');
    expect(typeof url).toBe('object'); // https://nodejs.org/docs/latest-v14.x/api/url.html
    expect(url.hostname).toBe('github.com');
    expect(url.protocol).toBe('http:');
    expect(url.pathname).toBe('/ably/ably-asset-tracking-android');
  });
});

describe('currentRepositoryURL', () => {
  it('is null when GitHub environment not available', () => {
    const url = github({}).currentRepositoryURL;
    expect(url).toBe(null);
  });

  it('is null when just GitHub environment repository not available', () => {
    const partialEnv = {
      GITHUB_SERVER_URL: 'https://github.com',
    };
    const url = github(partialEnv).currentRepositoryURL;
    expect(url).toBe(null);
  });

  it('is populated when GitHub environment available', () => {
    // as observed: https://github.com/ably/repository-audit/issues/4#issuecomment-931663619
    const env = {
      GITHUB_SERVER_URL: 'https://github.com',
      GITHUB_REPOSITORY: 'ably/repository-audit',
    };
    const url = github(env).currentRepositoryURL;
    expect(typeof url).toBe('object'); // https://nodejs.org/docs/latest-v14.x/api/url.html
    expect(url.hostname).toBe('github.com');
    expect(url.protocol).toBe('https:');
    expect(url.pathname).toBe('/ably/repository-audit');
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
