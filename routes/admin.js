// admin routes - manage orders and update shipping rates

const express = require('express');
const router = express.Router();
const db = require('../localdb');

// get all orders, filters are all optional
router.get('/orders', async (req, res) => {
  const { status, from, to, minPrice, maxPrice } = req.query;
  let query = 'SELECT * FROM orders WHERE 1=1';
  const params = [];

  if (status)   { query += ' AND status = ?'; params.push(status); }
  if (from)     { query += ' AND created_at >= ?'; params.push(from); }
  if (to)       { query += ' AND created_at <= ?'; params.push(to + ' 23:59:59'); }
  if (minPrice) { query += ' AND total >= ?'; params.push(minPrice); }
  if (maxPrice) { query += ' AND total <= ?'; params.push(maxPrice); }

  query += ' ORDER BY created_at DESC';

  try {
    const [rows] = await db.query(query, params);
    res.json(rows);
  } catch (err) {
    console.error('error fetching orders:', err.message);
    res.status(500).json({ error: 'Could not load orders.' });
  }
});

// get one order with its line items
router.get('/orders/:id', async (req, res) => {
  try {
    const [[order]] = await db.query('SELECT * FROM orders WHERE id = ?', [req.params.id]);
    if (!order) return res.status(404).json({ error: 'Order not found.' });

    const [items] = await db.query('SELECT * FROM order_items WHERE order_id = ?', [req.params.id]);
    res.json({ ...order, items });
  } catch (err) {
    console.error('error fetching order:', err.message);
    res.status(500).json({ error: 'Could not load order.' });
  }
});

// can only cancel if it hasn't been packed yet
router.post('/orders/:id/cancel', async (req, res) => {
  try {
    const [[order]] = await db.query('SELECT status FROM orders WHERE id = ?', [req.params.id]);
    if (!order) return res.status(404).json({ error: 'Order not found.' });
    if (order.status !== 'authorized') {
      return res.status(400).json({ error: 'Only authorized orders can be cancelled.' });
    }

    await db.query('UPDATE orders SET status = ? WHERE id = ?', ['cancelled', req.params.id]);
    res.json({ success: true });
  } catch (err) {
    console.error('error cancelling order:', err.message);
    res.status(500).json({ error: 'Could not cancel order.' });
  }
});

router.get('/shipping', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM shipping_rates ORDER BY max_weight ASC');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Could not load shipping rates.' });
  }
});

router.post('/shipping/:id', async (req, res) => {
  const { max_weight, fee } = req.body;
  try {
    await db.query('UPDATE shipping_rates SET max_weight = ?, fee = ? WHERE id = ?',
      [max_weight, fee, req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Could not update shipping rate.' });
  }
});

module.exports = router;
