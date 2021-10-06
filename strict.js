/**
 * Uses a strict equality check (`===`) to validate that `value` is `false`.
 *
 * @param {*} value The value to be checked.
 * @returns {boolean} Only returns `true` if `value` is of 'boolean' type with value `false` (strict equality check).
 */
const isFalse = (value) => value === false;

/**
 * Uses a strict equality check (`===`) to validate that `value` is `true`.
 *
 * @param {*} value The value to be checked.
 * @returns {boolean} Only returns `true` if `value` is of 'boolean' type with value `true` (strict equality check).
 */
const isTrue = (value) => value === true;

module.exports = {
  isFalse,
  isTrue,
};
