class Node {
  constructor(val) {
    this.val = val;
    this.next = null;
  }

  setNext(node) {
    this.next = node;
  }

  toString() {
    return this.val;
  }
}

module.exports = { Node };
