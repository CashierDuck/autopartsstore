// handles saving the order and sending a confirmation email
// cc auth happens on the frontend before this gets called

const express = require('express');
const router = express.Router();
const nodemailer = require('nodemailer');
const db = require('../localdb');

async function sendConfirmation(to, name, orderId, items, subtotal, shipping, total, authNumber) {
  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    family: 4,
    connectionTimeout: 5000,
    greetingTimeout: 5000,
    auth: {
      user: 'mikerubio109@gmail.com',
      pass: 'geya vmky wnum dkmn',
    },
  });

  let itemLines = '';
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    itemLines += '  ' + item.description + ' x' + item.qty + '  $' + (item.price * item.qty).toFixed(2) + '\n';
  }

  await transporter.sendMail({
    from: 'mikerubio109@gmail.com',
    to: to,
    subject: 'Order Confirmation #' + orderId,
    text: 'Hi ' + name + ',\n\nThank you for your order!\n\nOrder #' + orderId + '\n\n' + itemLines + '\nSubtotal: $' + subtotal + '\nShipping: $' + shipping + '\nTotal:    $' + total + '\n\nAuthorization: ' + authNumber + '\n\nWe\'ll email you again when your order ships.\n\nAuto Parts Store',
  });
}

// look up the right shipping fee based on total weight
async function calcShipping(totalWeight) {
  const [rates] = await db.query(
    'SELECT fee FROM shipping_rates WHERE max_weight >= ? ORDER BY max_weight ASC LIMIT 1',
    [totalWeight]
  );

  if (rates.length > 0) {
    return parseFloat(rates[0].fee);
  }
  return 19.99;
}

router.post('/', async function(req, res) {
  const name = req.body.name;
  const email = req.body.email;
  const address = req.body.address;
  const cc = req.body.cc;
  const items = req.body.items;
  const authNumber = req.body.authNumber;

  if (!name || !email || !address || !cc || !items || items.length === 0 || !authNumber) {
    return res.status(400).json({ error: 'Missing required order data.' });
  }

  let subtotal = 0;
  let totalWeight = 0;

  for (let i = 0; i < items.length; i++) {
    subtotal += items[i].price * items[i].qty;
    totalWeight += (items[i].weight || 0) * items[i].qty;
  }

  const shipping = await calcShipping(totalWeight);
  const total = subtotal + shipping;
  const cc_last4 = cc.replace(/\s/g, '').slice(-4);

  // NIU returns a full JSON object - pull out just the auth number to store
  let authCode = authNumber;
  try {
    const parsed = JSON.parse(authNumber);
    if (parsed.authorization) {
      authCode = String(parsed.authorization);
    }
  } catch (e) {
    // already a plain string, leave it
  }

  let orderId;

  try {
    const [result] = await db.query(
      'INSERT INTO orders (customer_name, email, address, cc_last4, subtotal, shipping, total, auth_number, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, "authorized")',
      [name, email, address, cc_last4, subtotal.toFixed(2), shipping.toFixed(2), total.toFixed(2), authCode]
    );
    orderId = result.insertId;

    // insert each line item separately
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      await db.query(
        'INSERT INTO order_items (order_id, part_number, description, price, weight, qty) VALUES (?, ?, ?, ?, ?, ?)',
        [orderId, item.number, item.description, item.price, item.weight || 0, item.qty]
      );
    }
  } catch (err) {
    console.error('DB error saving order:', err.message);
    return res.status(500).json({ error: 'Failed to save order. Contact support.' });
  }

  // email failure shouldn't break the order
  try {
    await sendConfirmation(
      email, name, orderId, items,
      subtotal.toFixed(2),
      shipping.toFixed(2),
      total.toFixed(2),
      authCode
    );
  } catch (err) {
    console.warn('Confirmation email failed:', err.message);
  }

  res.json({ orderId: orderId, total: total.toFixed(2) });
});

module.exports = router;
