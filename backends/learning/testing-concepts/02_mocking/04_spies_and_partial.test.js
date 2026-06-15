/**
 * Spies, partial mocks & interface safety
 * =======================================
 * Python's `autospec` enforces that a mock matches the real interface (method
 * names AND signatures). JavaScript has no runtime equivalent for signatures —
 * that guarantee comes from **TypeScript** plus `jest.mocked()`. But you can get
 * the *method-name* safety at runtime with `jest.spyOn`:
 *
 *   - A plain jest.fn() accepts any call (typos pass silently — the footgun).
 *   - jest.spyOn(obj, "method") THROWS if the method doesn't exist, catching a
 *     misspelled name the way autospec/spec does.
 *   - spyOn keeps the real implementation until you override it, and
 *     mockRestore() puts the original back.
 *   - Partial module mocks (jest.requireActual) keep some real exports.
 *
 * Run:
 *   npx jest backends/learning/testing-concepts/02_mocking/04_spies_and_partial
 */

const { EmailService } = require("./services");

// ---------------------------------------------------------------------------
// 1. The footgun: a plain jest.fn() accepts a misspelled method silently
// ---------------------------------------------------------------------------

test("plain mock accepts a misspelled method (no safety)", () => {
  const mock = { send: jest.fn() };
  // There's no "sned" guard on a hand-rolled object — this is the risk TS removes.
  mock.send = jest.fn();
  expect(mock.send).not.toHaveBeenCalled();
});

// ---------------------------------------------------------------------------
// 2. jest.spyOn catches a nonexistent method (the autospec/spec safety)
// ---------------------------------------------------------------------------

test("spyOn throws when the method does not exist", () => {
  const service = new EmailService();
  // "sned" is a typo — spyOn refuses to spy on a property that isn't there.
  expect(() => jest.spyOn(service, "sned")).toThrow();
});

test("spyOn works for a real method", () => {
  const service = new EmailService();
  const spy = jest.spyOn(service, "send").mockResolvedValue(true);
  expect(typeof service.send).toBe("function");
  expect(spy).not.toHaveBeenCalled();
  spy.mockRestore();
});

// ---------------------------------------------------------------------------
// 3. spyOn preserves the real implementation until you override it
// ---------------------------------------------------------------------------

test("spy can record calls while still running the real method", async () => {
  const service = new EmailService();
  // No mockImplementation → the real send runs, but the spy records the call.
  const spy = jest.spyOn(service, "send");

  const result = await service.send("a@x.com", "Hi", "body");

  expect(result).toBe(true); // real return value
  expect(spy).toHaveBeenCalledWith("a@x.com", "Hi", "body");
  spy.mockRestore();
});

test("mockRestore puts the original method back", async () => {
  const service = new EmailService();
  const spy = jest.spyOn(service, "send").mockResolvedValue("faked");

  expect(await service.send("a@x.com", "s", "b")).toBe("faked");
  spy.mockRestore();
  expect(await service.send("a@x.com", "s", "b")).toBe(true); // real again
});

// ---------------------------------------------------------------------------
// 4. Asserting exact call arguments (the closest to signature checking in JS)
// ---------------------------------------------------------------------------

test("assert the precise arguments a method was called with", async () => {
  const service = new EmailService();
  const spy = jest.spyOn(service, "sendWelcome").mockResolvedValue(true);

  await service.sendWelcome("alice@example.com");

  expect(spy).toHaveBeenCalledWith("alice@example.com");
  expect(spy).toHaveBeenCalledTimes(1);
  spy.mockRestore();
});
