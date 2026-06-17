/**
 * jest.mock — replacing a whole module
 * ====================================
 * `jest.mock("./services")` auto-mocks a whole module: every exported class
 * becomes a mock constructor and its methods become jest.fn()s.
 *
 * The golden rule: mock the module that the code under test *requires*.
 * checkout.js does `require("./services")`, so we mock `"./services"` and
 * checkout transparently gets the mocked version.
 *
 * jest.mock calls are hoisted to the top of the file by Jest, so the mock is in
 * place before checkout is required.
 *
 * Run:
 *   npx jest backends/learning/testing-concepts/02_mocking/01_mock_module
 */

jest.mock("./services");

const { EmailService, PaymentService, WeatherClient } = require("./services");
const checkout = require("./checkout");

// Reset mock state (calls + implementations) between tests for isolation.
beforeEach(() => jest.clearAllMocks());

// ---------------------------------------------------------------------------
// 1. Auto-mocked class: configure the instance the code constructs
//    mockImplementation lets each `new EmailService()` return our fake instance.
// ---------------------------------------------------------------------------

describe("registerUser", () => {
  test("sends a welcome email", async () => {
    const sendWelcome = jest.fn().mockResolvedValue(true);
    EmailService.mockImplementation(() => ({ sendWelcome }));

    const result = await checkout.registerUser("alice@example.com");

    expect(result.status).toBe("active");
    expect(sendWelcome).toHaveBeenCalledWith("alice@example.com");
  });

  test("returns a user object with the email", async () => {
    EmailService.mockImplementation(() => ({ sendWelcome: jest.fn().mockResolvedValue(true) }));
    const result = await checkout.registerUser("bob@example.com");
    expect(result.email).toBe("bob@example.com");
  });

  test("instantiates EmailService exactly once", async () => {
    EmailService.mockImplementation(() => ({ sendWelcome: jest.fn().mockResolvedValue(true) }));
    await checkout.registerUser("carol@example.com");
    expect(EmailService).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------
// 2. Controlling return values to drive branches
// ---------------------------------------------------------------------------

test("completePurchase success path", async () => {
  PaymentService.mockImplementation(() => ({
    charge: jest.fn().mockResolvedValue({ status: "success", chargeId: "ch_abc123" }),
  }));

  const result = await checkout.completePurchase(1, 5000, "tok_visa");

  expect(result.chargeId).toBe("ch_abc123");
  expect(result.orderId).toBe(100);
});

test("completePurchase throws on a declined charge", async () => {
  PaymentService.mockImplementation(() => ({
    charge: jest.fn().mockResolvedValue({ status: "declined", chargeId: null }),
  }));

  await expect(checkout.completePurchase(1, 5000, "tok_bad")).rejects.toThrow("Payment failed");
});

test("getWeatherAlert flags extreme heat", async () => {
  WeatherClient.mockImplementation(() => ({ getTemperature: jest.fn().mockResolvedValue(42) }));
  const alert = await checkout.getWeatherAlert("Phoenix");
  expect(alert).toContain("Extreme heat");
  expect(alert).toContain("42");
});

test("getWeatherAlert returns null in the normal range", async () => {
  WeatherClient.mockImplementation(() => ({ getTemperature: jest.fn().mockResolvedValue(20) }));
  expect(await checkout.getWeatherAlert("London")).toBeNull();
});

// ---------------------------------------------------------------------------
// 3. Asserting a path is NOT taken — registerUser never charges anything
// ---------------------------------------------------------------------------

test("registerUser never touches the payment service", async () => {
  const charge = jest.fn();
  EmailService.mockImplementation(() => ({ sendWelcome: jest.fn().mockResolvedValue(true) }));
  PaymentService.mockImplementation(() => ({ charge }));

  await checkout.registerUser("alice@example.com");

  expect(charge).not.toHaveBeenCalled();
});

// ---------------------------------------------------------------------------
// 4. Fake timers — the equivalent of patching time.sleep
//    Without fake timers, a real setTimeout would make the test wait.
// ---------------------------------------------------------------------------

async function slowHealthCheck() {
  await new Promise((resolve) => setTimeout(resolve, 10_000));
  return "ok";
}

test("fake timers skip the 10s wait", async () => {
  jest.useFakeTimers();
  const promise = slowHealthCheck();
  jest.advanceTimersByTime(10_000); // fast-forward instead of waiting
  await expect(promise).resolves.toBe("ok");
  jest.useRealTimers();
});

// ---------------------------------------------------------------------------
// 5. jest.spyOn — patch a single method on a real object (patch.object)
//    requireActual gives us the genuine WeatherClient despite jest.mock above.
// ---------------------------------------------------------------------------

test("spyOn a method on a real instance", async () => {
  const { WeatherClient: RealWeatherClient } = jest.requireActual("./services");
  const client = new RealWeatherClient();
  jest.spyOn(client, "getTemperature").mockResolvedValue(5);

  expect(await client.isHot("Oslo")).toBe(false);
});
