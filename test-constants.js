const primitivesExcludingString = [
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
];

module.exports = {
  primitivesExcludingString,

  everythingButObject: primitivesExcludingString.concat([
    'hello', // string primitive
    '', // empty string primitive
  ]),

  everythingButString: primitivesExcludingString.concat([
    {}, // empty
    { foo: 'bar' }, // simple object
  ]),
};
