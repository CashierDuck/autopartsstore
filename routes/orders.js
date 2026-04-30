// handles saving the order to the db and sending the confirmation email
// cc auth already happened on the frontend before this gets called

const express = require('express');
const router = express.Router();
const nodemailer = require('nodemailer');
const db = require('../localdb');

async function sendConfirmation({ to, name, orderId, items, subtotal, shipping, total, authNumber }) {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: 'mikerubio109@gmail.com',
      pass: 'geya vmky wnum dkmn',
    },
  });

  const itemLines = items.map(i =>
    `  ${i.description} x${i.qty}  $${(i.price * i.qty).toFixed(2)}`
  ).join('\n');

  await transporter.sendMail({
    from: 'mikerubio109@gmail.com',
    to,
    subject: `Order Confirmation #${orderId}`,
    text: `Hi ${name},\n\nThank you for your order!\n\nOrder #${orderId}\n\n${itemLines}\n\nSubtotal: $${subtotal}\nShipping: $${shipping}\nTotal:    $${total}\n\nAuthorization: ${authNumber}\n\nWe'll email you again when your order ships.\n\nAuto Parts Store`,
  });
}

async function calcShipping(totalWeight) {
  const [rates] = await db.query(
    'SELECT fee FROM shipping_rates WHERE max_weight >= ? ORDER BY max_weight ASC LIMIT 1',
    [totalWeight]
  );
  return rates.length ? parseFloat(rates[0].fee) : 19.99;
}

router.post('/', async (req, res) => {
  const { name, email, address, cc, items, authNumber } = req.body;

  if (!name || !email || !address || !cc || !items || items.length === 0 || !authNumber) {
    return res.status(400).json({ error: 'Missing required order data.' });
  }

  const subtotal = items.reduce((sum, i) => sum + i.price * i.qty, 0);
  const totalWeight = items.reduce((sum, i) => sum + (i.weight || 0) * i.qty, 0);
  const shipping = await calcShipping(totalWeight);
  const total = subtotal + shipping;
  const cc_last4 = cc.replace(/\s/g, '').slice(-4);

  // NIU sends back a whole json object, we just want the authorization number
  let authCode = authNumber;
  try {
    const parsed = JSON.parse(authNumber);
    if (parsed.authorization) authCode = String(parsed.authorization);
  } catch { /* already a plain string */ }

  let orderId;
  try {
    const [result] = await db.query(
      `INSERT INTO orders (customer_name, email, address, cc_last4, subtotal, shipping, total, auth_number, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'authorized')`,
      [name, email, address, cc_last4, subtotal.toFixed(2), shipping.toFixed(2), total.toFixed(2), authCode]
    );
    orderId = result.insertId;

    for (const item of items) {
      await db.query(
        `INSERT INTO order_items (order_id, part_number, description, price, weight, qty)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [orderId, item.number, item.description, item.price, item.weight || 0, item.qty]
      );
    }
  } catch (err) {
    console.error('DB error saving order:', err.message);
    return res.status(500).json({ error: 'Failed to save order. Contact support.' });
  }

  try {
    await sendConfirmation({
      to: email, name, orderId, items,
      subtotal: subtotal.toFixed(2),
      shipping: shipping.toFixed(2),
      total: total.toFixed(2),
      authNumber: authCode,
    });
  } catch (err) {
    console.warn('Confirmation email failed:', err.message);
  }

  res.json({ orderId, total: total.toFixed(2) });
});

module.exports = router;
