const { BinarySearchTreeNode } = require("./binary_search_tree");
const { getUsers } = require("./user");

function buildBst(vals) {
  const bst = new BinarySearchTreeNode();
  for (const v of vals) {
    bst.insert(v);
  }
  return bst;
}

const BALANCED = [5, 3, 7, 1, 4, 6, 8];

describe("insert + inorder (sorted property)", () => {
  test.each([3, 5, 10])("stays sorted with %p users", (numUsers) => {
    const users = getUsers(numUsers);
    const bst = new BinarySearchTreeNode();
    for (const user of users) {
      bst.insert(user);
    }
    const traversal = bst.inorder();
    const isSorted = traversal.every((val, i) => i === 0 || traversal[i - 1] < val);
    const traversalIds = traversal.map((u) => u.id).sort((a, b) => a - b);
    const userIds = users.map((u) => u.id).sort((a, b) => a - b);

    expect(isSorted).toBe(true);
    expect(traversalIds).toEqual(userIds);
  });
});

describe("traversals", () => {
  const cases = [
    [BALANCED, "inorder", [1, 3, 4, 5, 6, 7, 8]],
    [BALANCED, "preorder", [5, 3, 1, 4, 7, 6, 8]],
    [BALANCED, "postorder", [1, 4, 3, 6, 8, 7, 5]],
    [[5, 3, 7], "inorder", [3, 5, 7]],
    [[5, 3, 7], "preorder", [5, 3, 7]],
    [[5, 3, 7], "postorder", [3, 7, 5]],
  ];

  test.each(cases)("%p %s", (vals, order, expected) => {
    const bst = buildBst(vals);
    let result;
    if (order === "inorder") {
      result = bst.inorder();
    } else if (order === "preorder") {
      result = bst.preorder([]);
    } else {
      result = bst.postorder([]);
    }
    expect(result).toEqual(expected);
  });
});

describe("delete", () => {
  const cases = [
    [BALANCED, 1, [3, 4, 5, 6, 7, 8]],
    [BALANCED, 3, [1, 4, 5, 6, 7, 8]],
    [BALANCED, 5, [1, 3, 4, 6, 7, 8]],
    [BALANCED, 7, [1, 3, 4, 5, 6, 8]],
    [[5, 3], 3, [5]],
  ];

  test.each(cases)("delete %p from %p", (vals, target, expectedInorder) => {
    const bst = buildBst(vals);
    bst.delete(target);
    expect(bst.inorder()).toEqual(expectedInorder);
  });
});

describe("exists", () => {
  const cases = [
    [BALANCED, 3, true],
    [BALANCED, 9, false],
    [BALANCED, 1, true],
    [BALANCED, 8, true],
    [BALANCED, 0, false],
  ];

  test.each(cases)("exists %p in %p", (vals, target, expected) => {
    expect(buildBst(vals).exists(target)).toBe(expected);
  });
});

describe("height", () => {
  const cases = [
    [BALANCED, 3],
    [[5], 1],
    [[5, 3, 1], 3],
    [[5, 7, 9], 3],
    [[5, 3, 7, 1], 3],
  ];

  test.each(cases)("height of %p", (vals, expected) => {
    expect(buildBst(vals).height()).toBe(expected);
  });
});
