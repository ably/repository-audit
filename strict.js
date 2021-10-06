const typeCheckedStrictEquals = (value, expectedValue) => {
  const typeOfValue = typeof value;
  const expectedType = typeof expectedValue;
  if (typeOfValue !== expectedType) {
    throw new Error(`Unexpected type '${typeOfValue}' when expected '${expectedType}.`);
  }
  return value === expectedValue;
};

/**
 * Uses a strict equality check (`===`) to validate that `value` is `false`.
 * If the type of `value` is not `boolean` then this function throws an error.
 *
 * @param {*} value The value to be checked.
 * @returns {boolean} Only returns `true` if `value` is of 'boolean' type with value `false` (strict equality check).
 */
const isFalse = (value) => typeCheckedStrictEquals(value, false);

/**
 * Uses a strict equality check (`===`) to validate that `value` is `true`.
 * If the type of `value` is not `boolean` then this function throws an error.
 *
 * @param {*} value The value to be checked.
 * @returns {boolean} Only returns `true` if `value` is of 'boolean' type with value `true` (strict equality check).
 */
const isTrue = (value) => typeCheckedStrictEquals(value, true);

module.exports = {
  isFalse,
  isTrue,
};
