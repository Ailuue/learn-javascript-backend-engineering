# Mocking

Backend code touches things that are slow, costly, or unreliable in tests:
databases, email, payment APIs, HTTP endpoints. **Mocking** replaces them with
controlled fakes for the duration of a test.

Core tools:
- **`jest.mock(path)`** — auto-mock a whole module.
- **`jest.fn()`** — a standalone mock function that records calls.
- **`jest.spyOn(obj, "method")`** — wrap one real method on an existing object.

## The golden rule

Mock the module that the code under test **requires**. `checkout.js` does
`require("./services")`, so `jest.mock("./services")` swaps what it sees.

| File | What it teaches |
|---|---|
| `services.js` | External deps (EmailService, PaymentService, WeatherClient) |
| `checkout.js` | Business logic that uses those services |
| `01_mock_module.test.js` | `jest.mock`, `mockImplementation`, fake timers, `spyOn` + `requireActual` |
| `02_mock_functions.test.js` | `jest.fn`, `mockResolvedValue`, call matchers, `mock.calls` |
| `03_side_effects.test.js` | `mockResolvedValueOnce` sequences, `mockRejectedValue`, `mockImplementation` |
| `04_spies_and_partial.test.js` | `spyOn` interface safety, `mockRestore`, why signatures need TypeScript |

```bash
npx jest backends/learning/testing-concepts/02_mocking
```
