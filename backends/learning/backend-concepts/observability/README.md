# Observability

The three pillars — logs, metrics, traces — with [`pino`](https://getpino.io)
(structured JSON logging), [`prom-client`](https://github.com/siimon/prom-client)
(Prometheus metrics), and Express.

| File | What it teaches |
|---|---|
| `01_structured_logging.js` | Pino JSON logs, child loggers (bound context), AsyncLocalStorage per-request context, pretty dev output |
| `02_metrics.js` | prom-client Counter/Histogram/Gauge + middleware + `/metrics` |
| `03_combined.js` | Correlation IDs threaded through logs + metrics, `X-Request-ID` |

`prometheus.yml` + `docker-compose.yml` run Prometheus (:9090) and Grafana (:3000).

## Run

```bash
npm install                 # from the repo root (pino, pino-pretty, prom-client)
node 01_structured_logging.js
node 03_combined.js         # Express app on :8000
docker compose up -d        # Prometheus + Grafana (scrapes host:8000/metrics)
```

