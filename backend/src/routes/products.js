const express = require("express");
const { pool } = require("../db");

const router = express.Router();

// GET /api/products — list the full catalog
router.get("/", async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT id, name, price_cents, light, water, size, tag, image_emoji
       FROM products
       ORDER BY name ASC`
    );
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
});

// GET /api/products/:id — single product, used for detail views
router.get("/:id", async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT id, name, price_cents, light, water, size, tag, image_emoji
       FROM products WHERE id = $1`,
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Product not found" });
    }
    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
