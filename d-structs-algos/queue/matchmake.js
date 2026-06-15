function matchmake(queue, user) {
  const [name, action] = user;
  if (action === "leave") {
    queue.searchAndRemove(name);
  }
  if (action === "join") {
    queue.push(name);
  }
  if (queue.size() >= 4) {
    const user1 = queue.pop();
    const user2 = queue.pop();
    return `${user1} matched ${user2}!`;
  }
  return "No match found";
}

module.exports = { matchmake };
