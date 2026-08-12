require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");

const { pool } = require("./db");
const productsRouter = require("./routes/products");
const ordersRouter = require("./routes/orders");

const app = express();
const PORT = process.env.PORT || 4000;

app.use(helmet());
app.use(cors({ origin: process.env.CORS_ORIGIN || "*" }));
app.use(express.json());

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
