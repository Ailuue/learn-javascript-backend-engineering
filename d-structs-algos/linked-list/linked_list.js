class LinkedList {
  constructor() {
    this.head = null;
    this.tail = null;
  }

  *[Symbol.iterator]() {
    let node = this.head;
    while (node !== null) {
      yield node;
      node = node.next;
    }
  }

  addToHead(node) {
    if (this.head === null) {
      this.tail = node;
    }
    node.setNext(this.head);
    this.head = node;
  }

  addToTail(node) {
    if (this.head === null) {
      this.head = node;
      this.tail = node;
      return;
    }
    this.tail.setNext(node);
    this.tail = node;
  }

  removeFromHead() {
    if (this.head === null) {
      return undefined;
    }
    const removing = this.head;
    this.head = this.head.next;
    if (this.head === null) {
      this.tail = null;
    }
    removing.setNext(null);
    return removing;
  }

  removeFromTail() {
    if (this.tail === null) {
      return undefined;
    }
    const removing = this.tail;
    if (this.head === this.tail) {
      this.head = null;
      this.tail = null;
      return removing;
    }
    let current = this.head;
    while (current.next !== this.tail) {
      current = current.next;
    }
    current.setNext(null);
    this.tail = current;
    return removing;
  }

  toString() {
    const nodes = [];
    let current = this.head;
    while (current && current.val !== undefined) {
      nodes.push(current.val);
      current = current.next;
    }
    return nodes.join(" -> ");
  }
}

module.exports = { LinkedList };
