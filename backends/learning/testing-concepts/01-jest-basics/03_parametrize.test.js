/**
 * Data-driven tests with test.each
 * ================================
 * `test.each` runs the same test body over a table of cases. Each row becomes its
 * own reported test, so failures point at the exact input.
 *
 * Two table forms:
 *   - Array of arrays/values + a printf-style title ("%s", "%i", "%p")
 *   - Tagged template literal with named columns (most readable for many fields)
 *
 * Run:
 *   npx jest backends/learning/testing-concepts/01-jest-basics/03_parametrize
 */

// ---------------------------------------------------------------------------
// Code under test
// ---------------------------------------------------------------------------

const isEven = (n) => n % 2 === 0;
const clamp = (value, lo, hi) => Math.max(lo, Math.min(hi, value));
const normalizeEmail = (email) => email.trim().toLowerCase();

function parsePositiveInt(s) {
  const n = Number(s);
  if (!Number.isInteger(n)) throw new Error(`Not an integer: ${s}`);
  if (n <= 0) throw new Error(`Expected positive integer, got ${n}`);
  return n;
}

// ---------------------------------------------------------------------------
// 1. Single-parameter table
// ---------------------------------------------------------------------------

test.each([0, 2, 4, 100, -2, -100])("%i is even", (n) => {
  expect(isEven(n)).toBe(true);
});

test.each([1, 3, 99, -1, -99])("%i is odd", (n) => {
  expect(isEven(n)).toBe(false);
});

// ---------------------------------------------------------------------------
// 2. Multiple parameters as rows
// ---------------------------------------------------------------------------

test.each([
  ["alice@example.com", "alice@example.com"],
  ["ALICE@EXAMPLE.COM", "alice@example.com"],
  ["  bob@example.com  ", "bob@example.com"],
  ["Carol+Tag@Domain.ORG", "carol+tag@domain.org"],
])("normalizeEmail(%s) === %s", (input, expected) => {
  expect(normalizeEmail(input)).toBe(expected);
});

// ---------------------------------------------------------------------------
// 3. Tagged-template table — named columns read like a spec
// ---------------------------------------------------------------------------

describe("clamp", () => {
  test.each`
    value | lo   | hi    | expected | label
    ${5}  | ${1} | ${10} | ${5}     | ${"within range"}
    ${0}  | ${1} | ${10} | ${1}     | ${"below min"}
    ${15} | ${1} | ${10} | ${10}    | ${"above max"}
    ${1}  | ${1} | ${10} | ${1}     | ${"at min boundary"}
    ${10} | ${1} | ${10} | ${10}    | ${"at max boundary"}
  `("$label: clamp($value, $lo, $hi) === $expected", ({ value, lo, hi, expected }) => {
    expect(clamp(value, lo, hi)).toBe(expected);
  });
});

// ---------------------------------------------------------------------------
// 4. Parametrized error cases
// ---------------------------------------------------------------------------

test.each(["abc", "0", "-5"])("parsePositiveInt(%s) throws", (bad) => {
  expect(() => parsePositiveInt(bad)).toThrow();
});

test.each([
  ["1", 1],
  ["42", 42],
  ["999", 999],
])("parsePositiveInt(%s) === %i", (input, expected) => {
  expect(parsePositiveInt(input)).toBe(expected);
});

// ---------------------------------------------------------------------------
// 5. Cartesian product — nest test.each to multiply cases (2 × 3 = 6)
// ---------------------------------------------------------------------------

describe.each([0, 1])("a=%i", (a) => {
  test.each([10, 20, 30])("a + %i is positive", (b) => {
    expect(a + b).toBeGreaterThan(0);
  });
});
