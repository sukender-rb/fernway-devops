const { Pool } = require("pg");

// A single shared connection pool for the whole app.
// In prod (env vars set via k8s secrets later) DATABASE_URL will point
// at RDS; for local dev, .env / docker-compose sets it to localhost.
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
  // AWS RDS requires SSL/TLS by default and rejects plaintext connections
  // (that's the "no pg_hba.conf entry ... no encryption" error). Locally
  // against the Docker Compose Postgres container there's no SSL at all,
  // so only enable this when actually pointed at RDS.
  ssl: process.env.DATABASE_URL && process.env.DATABASE_URL.includes("rds.amazonaws.com")
    ? { rejectUnauthorized: false } // fine for learning; use RDS's CA bundle for real production hardening
    : false,
});

pool.on("error", (err) => {
  // A background/idle client emitted an error — log it, don't crash the process.
  console.error("Unexpected error on idle Postgres client", err);
});

module.exports = { pool };