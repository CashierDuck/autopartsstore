// main server file, sets up express and all the routes

const express = require('express');
const path = require('path');

const http = require('http');
const catalogRoutes = require('./routes/catalog');
const orderRoutes = require('./routes/orders');
const adminRoutes = require('./routes/admin');
const warehouseRoutes = require('./routes/warehouse');

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Routes
app.use('/api/catalog', catalogRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/warehouse', warehouseRoutes);

// browser cant call NIU directly bc of CORS so we proxy it through here
app.post('/api/authorize', (req, res) => {
  const payload = JSON.stringify({
    vendor: 'Group 6A',
    trans: req.body.trans,
    cc: req.body.cc,
    name: req.body.name,
    exp: req.body.exp,
    amount: req.body.amount,
  });

  const options = {
    hostname: 'blitz.cs.niu.edu',
    path: '/CreditCard/',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Content-Length': Buffer.byteLength(payload),
    },
  };

  const request = http.request(options, response => {
    let data = '';
    response.on('data', chunk => { data += chunk; });
    response.on('end', () => res.send(data));
  });

  request.on('error', err => {
    console.error('CC proxy error:', err.message);
    res.status(502).send('Error: Could not reach payment processor.');
  });

  request.write(payload);
  request.end();
});

// everything else just loads the main page
app.get('/{*path}', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
