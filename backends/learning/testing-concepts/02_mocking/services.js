/**
 * External service dependencies.
 *
 * These classes are boundaries where the code talks to the outside world: SMTP,
 * payment processors, third-party APIs. In production they do real work; in
 * tests we replace them with mocks.
 */

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

class EmailService {
  async send(to, subject, body) {
    await sleep(200); // real SMTP latency
    console.log(`[EMAIL] → ${to}: ${subject}`);
    return true;
  }

  async sendWelcome(userEmail) {
    return this.send(userEmail, "Welcome!", `Hi ${userEmail}, welcome to the platform.`);
  }
}

class PaymentService {
  async charge(amountCents, cardToken) {
    await sleep(500); // real Stripe latency
    return { status: "success", chargeId: `ch_${Math.floor(Math.random() * 90000) + 10000}` };
  }

  async refund(chargeId) {
    await sleep(300);
    return { status: "refunded", chargeId };
  }
}

class WeatherClient {
  async getTemperature(city) {
    throw new Error("Requires a live API key and network access");
  }

  async isHot(city) {
    return (await this.getTemperature(city)) > 30;
  }
}

module.exports = { EmailService, PaymentService, WeatherClient };
