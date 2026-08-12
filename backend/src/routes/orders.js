const express = require("express");
const { pool } = require("../db");

const router = express.Router();

function isValidOrderPayload(body) {
  if (!body || typeof body !== "object") return false;
  const { customer, items } = body;
  if (!customer || !customer.name || !customer.email || !customer.address) return false;
  if (!Array.isArray(items) || items.length === 0) return false;
  return items.every(
    (i) => typeof i.id === "string" && Number.isInteger(i.qty) && i.qty > 0
  );
}

// POST /api/orders
// Body: { customer: { name, email, address }, items: [{ id, qty }] }
// The client never sends a price or total — we look up current prices
// from the DB ourselves so a tampered request can't pay less than list price.
router.post("/", async (req, res, next) => {
  if (!isValidOrderPayload(req.body)) {
    return res.status(400).json({ error: "Invalid order payload" });
  }
  const { customer, items } = req.body;
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const ids = items.map((i) => i.id);
    const productResult = await client.query(
      `SELECT id, price_cents FROM products WHERE id = ANY($1::text[])`,
      [ids]
    );
    const priceById = Object.fromEntries(
      productResult.rows.map((p) => [p.id, p.price_cents])
    );

    for (const item of items) {
      if (!(item.id in priceById)) {
        await client.query("ROLLBACK");
        return res.status(400).json({ error: `Unknown product id: ${item.id}` });
      }
    }

    const totalCents = items.reduce(
      (sum, item) => sum + priceById[item.id] * item.qty,
      0
    );

    const orderResult = await client.query(
      `INSERT INTO orders (customer_name, customer_email, address, total_cents)
       VALUES ($1, $2, $3, $4)
       RETURNING id, created_at`,
      [customer.name, customer.email, customer.address, totalCents]
    );
    const orderId = orderResult.rows[0].id;

    for (const item of items) {
      await client.query(
        `INSERT INTO order_items (order_id, product_id, quantity, unit_price_cents)
         VALUES ($1, $2, $3, $4)`,
        [orderId, item.id, item.qty, priceById[item.id]]
      );
    }

    await client.query("COMMIT");

    res.status(201).json({
      id: orderId,
      total_cents: totalCents,
      created_at: orderResult.rows[0].created_at,
      status: "placed",
    });
  } catch (err) {
    await client.query("ROLLBACK");
    next(err);
  } finally {
    client.release();
  }
});

// GET /api/orders/:id — fetch one order with its line items
router.get("/:id", async (req, res, next) => {
  try {
    const orderResult = await pool.query(
      `SELECT id, customer_name, customer_email, address, total_cents, status, created_at
       FROM orders WHERE id = $1`,
      [req.params.id]
    );
    if (orderResult.rows.length === 0) {
      return res.status(404).json({ error: "Order not found" });
    }

    const itemsResult = await pool.query(
      `SELECT oi.product_id, p.name, oi.quantity, oi.unit_price_cents
       FROM order_items oi
       JOIN products p ON p.id = oi.product_id
       WHERE oi.order_id = $1`,
      [req.params.id]
    );

    res.json({ ...orderResult.rows[0], items: itemsResult.rows });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
