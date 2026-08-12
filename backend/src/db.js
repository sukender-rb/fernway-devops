const { Pool } = require("pg");

// A single shared connection pool for the whole app.
// In prod (env vars set via k8s secrets later) DATABASE_URL will point
// at RDS; for local dev, .env / docker-compose sets it to localhost.
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on("error", (err) => {
  // A background/idle client emitted an error — log it, don't crash the process.
  console.error("Unexpected error on idle Postgres client", err);
});

module.exports = { pool };
