// warehouse routes - pack orders, ship orders, manage inventory

const express = require('express');
const router = express.Router();
const nodemailer = require('nodemailer');
const db = require('../localdb');

// orders that are authorized and ready to be packed
router.get('/pack', async (req, res) => {
  try {
    const [orders] = await db.query(
      "SELECT * FROM orders WHERE status = 'authorized' ORDER BY created_at ASC"
    );
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: 'Could not load orders.' });
  }
});

// single order with items for the packing list view
router.get('/pack/:id', async (req, res) => {
  try {
    const [[order]] = await db.query('SELECT * FROM orders WHERE id = ?', [req.params.id]);
    if (!order) return res.status(404).json({ error: 'Order not found.' });

    const [items] = await db.query('SELECT * FROM order_items WHERE order_id = ?', [req.params.id]);
    res.json({ ...order, items });
  } catch (err) {
    res.status(500).json({ error: 'Could not load order.' });
  }
});

router.post('/pack/:id', async (req, res) => {
  try {
    const [[order]] = await db.query('SELECT status FROM orders WHERE id = ?', [req.params.id]);
    if (!order) return res.status(404).json({ error: 'Order not found.' });
    if (order.status !== 'authorized') {
      return res.status(400).json({ error: 'Order is not in authorized status.' });
    }

    await db.query("UPDATE orders SET status = 'packed' WHERE id = ?", [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Could not update order.' });
  }
});

// orders that are packed and ready to go out
router.get('/ship', async (req, res) => {
  try {
    const [orders] = await db.query(
      "SELECT * FROM orders WHERE status = 'packed' ORDER BY created_at ASC"
    );
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: 'Could not load orders.' });
  }
});

// mark as shipped and email the customer
router.post('/ship/:id', async (req, res) => {
  try {
    const [[order]] = await db.query('SELECT * FROM orders WHERE id = ?', [req.params.id]);
    if (!order) return res.status(404).json({ error: 'Order not found.' });
    if (order.status !== 'packed') {
      return res.status(400).json({ error: 'Order must be packed before shipping.' });
    }

    await db.query("UPDATE orders SET status = 'shipped' WHERE id = ?", [req.params.id]);

    // send shipping notification - don't let email failure break the response
    try {
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: 'mikerubio109@gmail.com',
          pass: 'geya vmky wnum dkmn',
        },
      });

      await transporter.sendMail({
        from: 'mikerubio109@gmail.com',
        to: order.email,
        subject: `Your order #${order.id} has shipped!`,
        text: `Hi ${order.customer_name},\n\nGood news — your order #${order.id} is on its way!\n\nTotal: $${order.total}\n\nThanks for your order!\nAuto Parts Store`,
      });
    } catch (err) {
      console.warn('shipping email failed:', err.message);
    }

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Could not ship order.' });
  }
});

// add stock when new parts arrive - upsert so duplicates just add to qty
router.post('/inventory', async (req, res) => {
  const { part_number, qty } = req.body;
  if (!part_number || !qty) {
    return res.status(400).json({ error: 'part_number and qty are required.' });
  }

  try {
    await db.query(
      `INSERT INTO inventory (part_number, qty_on_hand) VALUES (?, ?)
       ON DUPLICATE KEY UPDATE qty_on_hand = qty_on_hand + ?`,
      [part_number, qty, qty]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Could not update inventory.' });
  }
});

router.get('/inventory', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM inventory ORDER BY part_number ASC');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Could not load inventory.' });
  }
});

module.exports = router;
