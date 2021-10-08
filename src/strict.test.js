const { format: prettyFormat } = require('pretty-format');
const { everythingButBoolean } = require('./test-constants');

const {
  isFalse,
  isTrue,
} = require('./strict');

describe('isFalse', () => {
  everythingButBoolean.forEach((badType) => {
    it(`fails if value is ${prettyFormat(badType)}`, () => {
      expect(() => { isFalse(badType); }).toThrow('Unexpected type');
    });
  });

  it('returns true if value is false', () => {
    expect(isFalse(false)).toBe(true);
  });

  it('returns false if value is true', () => {
    expect(isFalse(true)).toBe(false);
  });
});

describe('isTrue', () => {
  everythingButBoolean.forEach((badType) => {
    it(`fails if value is ${prettyFormat(badType)}`, () => {
      expect(() => { isFalse(badType); }).toThrow('Unexpected type');
    });
  });

  it('returns true if value is true', () => {
    expect(isTrue(true)).toBe(true);
  });

  it('returns false if value is false', () => {
    expect(isTrue(false)).toBe(false);
  });
});
