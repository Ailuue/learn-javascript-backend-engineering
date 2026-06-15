const { Stack } = require("./stack");

function isBalanced(inputStr) {
  const stack = new Stack();
  for (const char of inputStr) {
    if (char === "(") {
      stack.push(char);
    } else if (char === ")") {
      if (stack.pop() === null) {
        return false;
      }
    }
  }
  return stack.peek() === null;
}

module.exports = { isBalanced };
