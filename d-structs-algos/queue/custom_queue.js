class Queue {
  constructor() {
    this.items = [];
  }

  push(item) {
    this.items.unshift(item);
  }

  pop() {
    if (this.items.length === 0) {
      return null;
    }
    return this.items.pop();
  }

  peek() {
    if (this.items.length === 0) {
      return null;
    }
    return this.items[this.items.length - 1];
  }

  size() {
    return this.items.length;
  }

  searchAndRemove(item) {
    const index = this.items.indexOf(item);
    if (index === -1) {
      return null;
    }
    this.items.splice(index, 1);
    return item;
  }

  toString() {
    return `[${this.items.join(", ")}]`;
  }
}

module.exports = { Queue };
