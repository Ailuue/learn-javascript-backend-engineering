const { binarySearch } = require("./binary_search");

function range(n) {
  return Array.from({ length: n }, (_, i) => i);
}

const cases = [
  [10, range(200), true],
  [-1, range(20000), false],
  [15, [], false],
  [0, [0], true],
  [-1, [-2, -1], true],
  [105028, range(2000000), true],
  [2000001, range(2000000), false],
];

test.each(cases)("binarySearch finds target (case %#)", (target, arr, expected) => {
  expect(binarySearch(target, arr)).toBe(expected);
});
