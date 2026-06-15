const { isBalanced } = require("./balanced");

const cases = [
  ["(", false],
  ["()", true],
  ["(())", true],
  ["()()", true],
  ["(()))", false],
  ["((())())", true],
  ["(()(()", false],
  [")(", false],
  [")()(()", false],
  ["())(()", false],
];

test.each(cases)("isBalanced(%p)", (input, expected) => {
  expect(isBalanced(input)).toBe(expected);
});
