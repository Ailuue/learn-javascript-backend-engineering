class Stack {
  constructor() {
    this.items = [];
  }

  push(item) {
    this.items.push(item);
  }

  size() {
    return this.items.length;
  }

  peek() {
    if (this.items.length === 0) {
      return null;
    }
    return this.items[this.items.length - 1];
  }

  pop() {
    if (this.items.length === 0) {
      return null;
    }
    return this.items.pop();
  }
}

module.exports = { Stack };
