class RBNode {
  constructor(val = null) {
    this.val = val;
    this.red = false;
    this.left = null;
    this.right = null;
    this.parent = null;
  }
}

class RBTree {
  constructor() {
    this.NIL = new RBNode();
    this.root = this.NIL;
  }

  insert(val) {
    const node = new RBNode(val);
    node.red = true;
    node.left = this.NIL;
    node.right = this.NIL;

    let parent = null;
    let current = this.root;
    while (current !== this.NIL) {
      parent = current;
      if (node.val < current.val) {
        current = current.left;
      } else if (node.val > current.val) {
        current = current.right;
      } else {
        return;
      }
    }

    node.parent = parent;
    if (parent === null) {
      this.root = node;
    } else if (node.val < parent.val) {
      parent.left = node;
    } else {
      parent.right = node;
    }

    this._fixInsert(node);
  }

  _fixInsert(node) {
    while (node.parent !== null && node.parent.red) {
      let p = node.parent;
      let gp = p.parent;

      if (p === gp.left) {
        const uncle = gp.right;
        if (uncle !== null && uncle.red) {
          p.red = false;
          uncle.red = false;
          gp.red = true;
          node = gp;
        } else {
          if (node === p.right) {
            node = p;
            this._rotateLeft(node);
            p = node.parent;
            gp = p.parent;
          }
          p.red = false;
          gp.red = true;
          this._rotateRight(gp);
        }
      } else {
        const uncle = gp.left;
        if (uncle !== null && uncle.red) {
          p.red = false;
          uncle.red = false;
          gp.red = true;
          node = gp;
        } else {
          if (node === p.left) {
            node = p;
            this._rotateRight(node);
            p = node.parent;
            gp = p.parent;
          }
          p.red = false;
          gp.red = true;
          this._rotateLeft(gp);
        }
      }
    }
    this.root.red = false;
  }

  _rotateLeft(x) {
    const y = x.right;
    x.right = y.left;
    if (y.left !== null && y.left !== this.NIL) {
      y.left.parent = x;
    }
    y.parent = x.parent;
    if (x.parent === null) {
      this.root = y;
    } else if (x === x.parent.left) {
      x.parent.left = y;
    } else {
      x.parent.right = y;
    }
    y.left = x;
    x.parent = y;
  }

  _rotateRight(x) {
    const y = x.left;
    x.left = y.right;
    if (y.right !== null && y.right !== this.NIL) {
      y.right.parent = x;
    }
    y.parent = x.parent;
    if (x.parent === null) {
      this.root = y;
    } else if (x === x.parent.right) {
      x.parent.right = y;
    } else {
      x.parent.left = y;
    }
    y.right = x;
    x.parent = y;
  }
}

module.exports = { RBNode, RBTree };
