// Root Jest config covering both d-structs-algos and the backends.
//
// globalSetup builds the bookmark-manager SQLite test schema once. maxWorkers:1
// runs test files serially so the backend suites can share a single SQLite file
// and reset it between tests without write races (the d-structs-algos suites are
// trivially fast, so serial execution costs nothing meaningful).

module.exports = {
  testEnvironment: "node",
  testMatch: ["**/*.test.js"],
  globalSetup: "<rootDir>/backends/bookmark-manager/tests/globalSetup.js",
  maxWorkers: 1,
};
