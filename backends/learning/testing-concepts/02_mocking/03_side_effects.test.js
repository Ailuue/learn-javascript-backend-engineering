/**
 * Dynamic mock behaviour
 * ======================
 * A family of jest.fn helpers makes a mock behave differently per call:
 *
 *   sequence of values   → mockReturnValueOnce / mockResolvedValueOnce (chained)
 *   throw / reject       → mockImplementation(() => { throw }) / mockRejectedValue
 *   dynamic by argument  → mockImplementation((arg) => ...)
 *
 * "Once" variants queue up per-call behaviour; once exhausted, the base
 * implementation (or mockResolvedValue) is used as the fallback.
 *
 * Run:
 *   npx jest backends/learning/testing-concepts/02_mocking/03_side_effects
 */

// ---------------------------------------------------------------------------
// Code under test
// ---------------------------------------------------------------------------

async function sendWithRetry(emailService, to, retries = 3) {
  for (let attempt = 0; attempt < retries; attempt += 1) {
    try {
      // eslint-disable-next-line no-await-in-loop
      return await emailService.send(to, "Retry test", "...");
    } catch (err) {
      if (attempt === retries - 1) throw err;
    }
  }
  return false;
}

async function fetchPrice(apiClient, itemId) {
  const response = await apiClient.get(`/prices/${itemId}`);
  return response.price;
}

// ---------------------------------------------------------------------------
// 1. Sequence of outcomes — fail twice, then succeed
// ---------------------------------------------------------------------------

test("retry succeeds on the third attempt", async () => {
  const send = jest
    .fn()
    .mockRejectedValueOnce(new Error("timeout"))
    .mockRejectedValueOnce(new Error("timeout"))
    .mockResolvedValueOnce(true);

  const result = await sendWithRetry({ send }, "alice@example.com", 3);

  expect(result).toBe(true);
  expect(send).toHaveBeenCalledTimes(3);
});

test("retry re-throws after all attempts are exhausted", async () => {
  const send = jest.fn().mockRejectedValue(new Error("timeout")); // always fails
  await expect(sendWithRetry({ send }, "alice@example.com", 3)).rejects.toThrow("timeout");
});

test("different resolved value per call", async () => {
  const get = jest
    .fn()
    .mockResolvedValueOnce({ price: 9.99 })
    .mockResolvedValueOnce({ price: 14.99 })
    .mockResolvedValueOnce({ price: 4.99 });
  const api = { get };

  expect(await fetchPrice(api, "widget")).toBe(9.99);
  expect(await fetchPrice(api, "gadget")).toBe(14.99);
  expect(await fetchPrice(api, "doohickey")).toBe(4.99);
});

// ---------------------------------------------------------------------------
// 2. Rejecting with an error
// ---------------------------------------------------------------------------

test("mockRejectedValue throws when awaited", async () => {
  const send = jest.fn().mockRejectedValue(new Error("SMTP server unreachable"));
  await expect(send("x@example.com", "s", "b")).rejects.toThrow("SMTP server unreachable");
});

// ---------------------------------------------------------------------------
// 3. mockImplementation — dynamic response based on arguments
// ---------------------------------------------------------------------------

test("implementation chooses output by argument", async () => {
  const priceDb = { "/prices/widget": { price: 9.99 }, "/prices/gadget": { price: 24.99 } };
  const get = jest.fn().mockImplementation(async (path) => {
    if (!(path in priceDb)) throw new Error(`Unknown path: ${path}`);
    return priceDb[path];
  });
  const api = { get };

  expect(await fetchPrice(api, "widget")).toBe(9.99);
  expect(await fetchPrice(api, "gadget")).toBe(24.99);
  await expect(fetchPrice(api, "unknown")).rejects.toThrow("Unknown path");
});

// ---------------------------------------------------------------------------
// 4. "Once" behaviour falls back to the base implementation
// ---------------------------------------------------------------------------

test("once-implementations run first, then the default takes over", () => {
  const fn = jest.fn().mockReturnValue("default_response").mockReturnValueOnce("first_call_override");

  expect(fn()).toBe("first_call_override"); // queued once-value
  expect(fn()).toBe("default_response"); // falls back to the base value
  expect(fn()).toBe("default_response");
});
