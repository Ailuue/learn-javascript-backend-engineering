/**
 * Business logic that uses the external services.
 *
 * These functions construct service instances internally. To mock them, the
 * tests replace the `services` module with `jest.mock("./services")` — Jest's
 * answer to Python's `patch("checkout.EmailService")`. Because checkout requires
 * the module by path, mocking that module path swaps what checkout sees.
 */

const { EmailService, PaymentService, WeatherClient } = require("./services");

async function registerUser(email) {
  const service = new EmailService();
  const user = { id: 1, email, status: "active" };
  await service.sendWelcome(email);
  return user;
}

async function completePurchase(userId, amountCents, cardToken) {
  const service = new PaymentService();
  const charge = await service.charge(amountCents, cardToken);
  if (charge.status !== "success") {
    throw new Error(`Payment failed: ${JSON.stringify(charge)}`);
  }
  return { orderId: 100, userId, chargeId: charge.chargeId };
}

async function getWeatherAlert(city) {
  const client = new WeatherClient();
  const temp = await client.getTemperature(city);
  if (temp > 40) return `Extreme heat warning for ${city}: ${temp}°C`;
  if (temp < -10) return `Extreme cold warning for ${city}: ${temp}°C`;
  return null;
}

module.exports = { registerUser, completePurchase, getWeatherAlert };
