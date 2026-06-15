class BinarySearchTreeNode {
  constructor(val = null) {
    this.val = val;
    this.left = null;
    this.right = null;
  }

  insert(val) {
    if (this.val === null) {
      this.val = val;
      return;
    }
    if (val < this.val) {
      if (this.left === null) {
        this.left = new BinarySearchTreeNode(val);
      } else {
        this.left.insert(val);
      }
    } else {
      if (this.right === null) {
        this.right = new BinarySearchTreeNode(val);
      } else {
        this.right.insert(val);
      }
    }
  }

  delete(val) {
    if (this.val === null) {
      return this;
    }
    if (val < this.val) {
      if (this.left !== null) {
        this.left = this.left.delete(val);
      }
    } else if (val > this.val) {
      if (this.right !== null) {
        this.right = this.right.delete(val);
      }
    } else {
      if (this.left === null) {
        return this.right;
      } else if (this.right === null) {
        return this.left;
      }
      let minLargerNode = this.right;
      while (minLargerNode.left !== null) {
        minLargerNode = minLargerNode.left;
      }
      this.val = minLargerNode.val;
      this.right = this.right.delete(minLargerNode.val);
    }
    return this;
  }

  preorder(visited) {
    if (this.val) {
      visited.push(this.val);
    }
    if (this.left) {
      this.left.preorder(visited);
    }
    if (this.right) {
      this.right.preorder(visited);
    }
    return visited;
  }

  postorder(visited) {
    if (this.left) {
      this.left.postorder(visited);
    }
    if (this.right) {
      this.right.postorder(visited);
    }
    if (this.val) {
      visited.push(this.val);
    }
    return visited;
  }

  inorder(result = []) {
    if (this.left) {
      this.left.inorder(result);
    }
    if (this.val !== null) {
      result.push(this.val);
    }
    if (this.right) {
      this.right.inorder(result);
    }
    return result;
  }

  exists(val) {
    if (this.val === val) {
      return true;
    }
    if (val < this.val) {
      if (this.left) {
        return this.left.exists(val);
      }
    }
    if (val > this.val) {
      if (this.right) {
        return this.right.exists(val);
      }
    }
    return false;
  }

  height() {
    let left = 0;
    let right = 0;
    if (!this.val) {
      return 0;
    }
    if (this.left) {
      left = this.left.height();
    }
    if (this.right) {
      right = this.right.height();
    }
    return Math.max(left, right) + 1;
  }
}

module.exports = { BinarySearchTreeNode };
