const allValues = {
  stringPrimitives: [
    'hello', // string primitive
    '', // empty string primitive
  ],
  otherPrimitives: [
    undefined,
    null,
    true, // boolean primitive
    false, // boolean primitive
    0, // number primitive
    1, // number primitive
    -1, // number primitive
    3.14159265359, // number primitive
    Symbol('bar'), // symbol primitive
    BigInt('0b11111111111111111111111111111111111111111111111111111'), // bigint primitive
  ],
  objects: [
    {}, // empty
    { foo: 'bar' }, // simple object
  ],
};

const valuesExcluding = (excludeKey) => Object
  .entries(allValues)
  .filter(([key]) => key !== excludeKey)
  .map(([, values]) => values)
  .flat();

module.exports = {
  everythingButObject: valuesExcluding('objects'),
  everythingButString: valuesExcluding('stringPrimitives'),
};
