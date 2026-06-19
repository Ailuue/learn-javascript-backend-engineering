const { PrefixTree } = require("./prefix_tree");

function buildTree(words) {
  const t = new PrefixTree();
  for (const w of words) {
    t.insert(w);
  }
  return t;
}

describe("exists", () => {
  const cases = [
    [["apple", "app", "banana"], "apple", true],
    [["apple", "app", "banana"], "app", true],
    [["apple", "app", "banana"], "ap", false],
    [["apple", "app", "banana"], "grape", false],
    [["apple", "app", "banana"], "ban", false],
    [["apple", "app", "banana"], "banana", true],
    [[], "anything", false],
  ];

  test.each(cases)("exists(%p, %p)", (words, word, expected) => {
    expect(buildTree(words).exists(word)).toBe(expected);
  });
});

describe("wordsWithPrefix", () => {
  const cases = [
    [["app", "apple", "banana", "band"], "app", ["app", "apple"]],
    [["app", "apple", "banana", "band"], "ban", ["banana", "band"]],
    [["app", "apple", "banana", "band"], "xyz", []],
    [["app", "apple", "banana", "band"], "", ["app", "apple", "banana", "band"]],
    [["app", "apple", "banana", "band"], "apple", ["apple"]],
  ];

  test.each(cases)("wordsWithPrefix(%p, %p)", (words, prefix, expected) => {
    const result = new Set(buildTree(words).wordsWithPrefix(prefix));
    expect(result).toEqual(new Set(expected));
  });
});

describe("findMatches", () => {
  const cases = [
    [["apple", "banana"], "apple and banana", ["apple", "banana"]],
    [["apple", "banana"], "nothing here", []],
    [["app", "apple"], "the apple app", ["app", "apple"]],
    [["hi", "him", "his"], "say hi to him", ["hi", "him"]],
  ];

  test.each(cases)("findMatches(%p, %p)", (words, document, expected) => {
    expect(buildTree(words).findMatches(document)).toEqual(new Set(expected));
  });
});

describe("advancedFindMatches", () => {
  const cases = [
    [["dang", "heck"], "d@ng h3ck", { "@": "a", "3": "e" }, ["d@ng", "h3ck"]],
    [["dang", "heck"], "dang heck", { "@": "a", "3": "e" }, ["dang", "heck"]],
    [["hello", "world"], "h3llo w0rld", { "3": "e", "0": "o" }, ["h3llo", "w0rld"]],
    [["cat"], "c@t", { "@": "a" }, ["c@t"]],
  ];

  test.each(cases)(
    "advancedFindMatches(%p, %p)",
    (words, document, variations, expected) => {
      expect(buildTree(words).advancedFindMatches(document, variations)).toEqual(
        new Set(expected)
      );
    }
  );
});

describe("longestCommonPrefix", () => {
  const cases = [
    [["flower", "flow", "flight"], "fl"],
    [["apple", "application", "apply"], "appl"],
    [["interview", "interact", "integrate"], "inte"],
    [["single"], "single"],
  ];

  test.each(cases)("longestCommonPrefix(%p)", (words, expected) => {
    expect(buildTree(words).longestCommonPrefix()).toBe(expected);
  });
});
