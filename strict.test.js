const { format: prettyFormat } = require('pretty-format');
const { everythingButBoolean } = require('./test-constants');

const {
  isFalse,
  isTrue,
} = require('./strict');

describe('isFalse', () => {
  everythingButBoolean.concat([true]).forEach((badType) => {
    it(`returns false if value is ${prettyFormat(badType)}`, () => {
      expect(isFalse(badType)).toBe(false);
    });
  });

  it('returns true if value is false', () => {
    expect(isFalse(false)).toBe(true);
  });
});

describe('isTrue', () => {
  everythingButBoolean.concat([false]).forEach((badType) => {
    it(`returns false if value is ${prettyFormat(badType)}`, () => {
      expect(isTrue(badType)).toBe(false);
    });
  });

  it('returns true if value is true', () => {
    expect(isTrue(true)).toBe(true);
  });
});
