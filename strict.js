const isFalse = (value) => typeof value === 'boolean' && value === false;
const isTrue = (value) => typeof value === 'boolean' && value === true;

module.exports = {
  isFalse,
  isTrue,
};
