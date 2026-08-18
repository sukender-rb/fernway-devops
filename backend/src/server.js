require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");

const { pool } = require("./db");
const productsRouter = require("./routes/products");
const ordersRouter = require("./routes/orders");
const client = require("prom-client");

const app = express();
const PORT = process.env.PORT || 4000;

// Standard process metrics (CPU, memory, event loop lag, etc.) plus a
// custom histogram for request duration — this is what Prometheus scrapes.
const register = new client.Registry();
client.collectDefaultMetrics({ register });

const httpRequestDuration = new client.Histogram({
  name: "http_request_duration_seconds",
  help: "Duration of HTTP requests in seconds",
  labelNames: ["method", "route", "status_code"],
  buckets: [0.05, 0.1, 0.3, 0.5, 1, 2, 5],
});
register.registerMetric(httpRequestDuration);

app.use(helmet());
app.use(cors({ origin: process.env.CORS_ORIGIN || "*" }));
app.use(express.json());

app.use((req, res, next) => {
  const end = httpRequestDuration.startTimer();
  res.on("finish", () => {
    // req.route is only set once Express matches a route; fall back to
    // the raw path for 404s so those still show up in metrics.
    const route = req.route?.path || req.path;
    end({ method: req.method, route, status_code: res.statusCode });
  });
  next();
});

// Prometheus scrapes this endpoint on a timer (see monitoring/prometheus/prometheus.yml)
app.get("/metrics", async (req, res) => {
  res.set("Content-Type", register.contentType);
  res.end(await register.metrics());
});

// Health check — this is what Kubernetes will poll (liveness/readiness probes)
app.get("/health", async (req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({ status: "ok", db: "connected" });
  } catch (err) {
    res.status(503).json({ status: "error", db: "unreachable" });
  }
});

app.use("/api/products", productsRouter);
app.use("/api/orders", ordersRouter);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: "Not found" });
});

// Central error handler — keep this last
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
});

app.listen(PORT, () => {
  console.log(`Fernway API listening on port ${PORT}`);
});
