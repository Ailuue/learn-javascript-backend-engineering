/**
 * jest.fn() — standalone mock functions
 * =====================================
 * `jest.fn()` is a function that records every call. Hand one to code under test
 * as a fake dependency (dependency injection).
 *
 * Configure behaviour:
 *   fn.mockReturnValue(x)        what fn() returns
 *   fn.mockResolvedValue(x)      what an async fn() resolves to
 *
 * Assert on calls (matchers throw on failure):
 *   expect(fn).toHaveBeenCalled()
 *   expect(fn).toHaveBeenCalledTimes(n)
 *   expect(fn).toHaveBeenCalledWith(...args)
 *   expect(fn).not.toHaveBeenCalled()
 *
 * Inspect calls directly:
 *   fn.mock.calls           array of arg-arrays, one per call
 *   fn.mock.results         array of { type, value }
 *
 * Run:
 *   npx jest backends/learning/testing-concepts/02-mocking/02_mock_functions
 */

// ---------------------------------------------------------------------------
// 1. Injecting a mock dependency
// ---------------------------------------------------------------------------

async function sendNotification(emailService, userEmail, message) {
  await emailService.send(userEmail, "Notification", message);
}

test("sendNotification calls send with the right args", async () => {
  const emailService = { send: jest.fn().mockResolvedValue(true) };

  await sendNotification(emailService, "alice@example.com", "Your order shipped.");

  expect(emailService.send).toHaveBeenCalledWith(
    "alice@example.com",
    "Notification",
    "Your order shipped."
  );
});

// ---------------------------------------------------------------------------
// 2. mockResolvedValue — control what an async mock resolves to
// ---------------------------------------------------------------------------

async function processPayment(paymentService, amount, token) {
  const result = await paymentService.charge(amount, token);
  return result.chargeId;
}

test("processPayment returns the charge id", async () => {
  const paymentService = {
    charge: jest.fn().mockResolvedValue({ status: "success", chargeId: "ch_xyz" }),
  };

  expect(await processPayment(paymentService, 1000, "tok_abc")).toBe("ch_xyz");
});

// ---------------------------------------------------------------------------
// 3. Call count and call inspection
// ---------------------------------------------------------------------------

async function batchNotify(emailService, emails) {
  for (const email of emails) {
    // eslint-disable-next-line no-await-in-loop
    await emailService.send(email, "Batch", "Hello");
  }
}

test("batchNotify calls send once per email", async () => {
  const emailService = { send: jest.fn().mockResolvedValue(true) };
  await batchNotify(emailService, ["a@x.com", "b@x.com", "c@x.com"]);
  expect(emailService.send).toHaveBeenCalledTimes(3);
});

test("batchNotify sends to the correct addresses in order", async () => {
  const emailService = { send: jest.fn().mockResolvedValue(true) };
  await batchNotify(emailService, ["a@x.com", "b@x.com"]);

  // mock.calls is an array of argument arrays — one entry per call.
  expect(emailService.send.mock.calls).toEqual([
    ["a@x.com", "Batch", "Hello"],
    ["b@x.com", "Batch", "Hello"],
  ]);
});

// ---------------------------------------------------------------------------
// 4. Asserting a path is NOT taken
// ---------------------------------------------------------------------------

function notifyIfOptedIn(emailService, email, optedIn) {
  if (optedIn) emailService.send(email, "News", "...");
}

test("opted-out user receives no email", () => {
  const emailService = { send: jest.fn() };
  notifyIfOptedIn(emailService, "alice@example.com", false);
  expect(emailService.send).not.toHaveBeenCalled();
});

test("opted-in user receives an email", () => {
  const emailService = { send: jest.fn() };
  notifyIfOptedIn(emailService, "bob@example.com", true);
  expect(emailService.send).toHaveBeenCalledTimes(1);
});

// ---------------------------------------------------------------------------
// 5. Mocking a chained / nested return shape
// ---------------------------------------------------------------------------

function getUserEmailDomain(paymentService, chargeId) {
  const email = paymentService.getCharge(chargeId).customer.email;
  return email.split("@")[1];
}

test("nested return values", () => {
  const paymentService = {
    getCharge: jest.fn().mockReturnValue({ customer: { email: "alice@example.com" } }),
  };

  expect(getUserEmailDomain(paymentService, "ch_123")).toBe("example.com");
  expect(paymentService.getCharge).toHaveBeenCalledWith("ch_123");
});
