const { format: prettyFormat } = require('pretty-format');

const { GitHub } = require('./github');

const github = (env) => new GitHub(env);

describe('constructor', () => {
  ([
    undefined,
    null,
    'hello', // string primitive
    true, // boolean primitive
    false, // boolean primitive
    0, // number primitive
    1, // number primitive
    -1, // number primitive
    3.14159265359, // number primitive
    Symbol('bar'), // symbol primitive
    BigInt('0b11111111111111111111111111111111111111111111111111111'), // bigint primitive
  ]).forEach((badEnv) => {
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
