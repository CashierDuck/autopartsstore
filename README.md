CS 467 Auto Parts Store - Group 6A

Online auto parts store built for the CS 467 capstone at NIU. Customers can browse a parts catalog, add items to a cart, and place orders with real credit card authorization. There's also an admin panel, a warehouse interface for packing and shipping orders, and a receiving desk for logging inventory.

Tech stack:
- Node.js + Express backend
- Vanilla HTML/CSS/JavaScript frontend (no frameworks)
- MySQL on Railway (orders, inventory, shipping rates)
- NIU legacy database (parts catalog, read-only)
- NIU credit card processor (blitz.cs.niu.edu)
- Nodemailer + Gmail for confirmation and shipping emails
- Deployed on Render

To run locally:
1. npm install
2. set the DB env variables (see localdb.js) or it'll use the defaults
3. node server.js
4. go to http://localhost:3000

Staff login (admin, warehouse, receiving):
username: admin1
password: aps123
