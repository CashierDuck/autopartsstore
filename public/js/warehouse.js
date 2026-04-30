// warehouse page logic — pack orders, ship orders, load inventory

let currentPackOrderId = null;

// --- tabs ---

document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(t => t.classList.add('hidden'));
    btn.classList.add('active');
    document.getElementById(btn.dataset.tab).classList.remove('hidden');

    if (btn.dataset.tab === 'pack-tab') loadPackOrders();
    if (btn.dataset.tab === 'ship-tab') loadShipOrders();
  });
});

// --- pack orders ---

async function loadPackOrders() {
  const res = await fetch('/api/warehouse/pack');
  const orders = await res.json();

  const list = document.getElementById('pack-list');
  document.getElementById('pack-detail').classList.add('hidden');
  list.classList.remove('hidden');

  if (orders.length === 0) {
    list.innerHTML = '<p class="empty-msg">No orders ready to pack.</p>';
    return;
  }

  list.innerHTML = orders.map(o => `
    <div class="order-row" onclick="openPackOrder(${o.id})">
      <span>#${o.id}</span>
      <span>${o.customer_name}</span>
      <span>$${parseFloat(o.total).toFixed(2)}</span>
      <span>${new Date(o.created_at).toLocaleDateString()}</span>
    </div>
  `).join('');
}

async function openPackOrder(id) {
  const res = await fetch(`/api/warehouse/pack/${id}`);
  const order = await res.json();
  currentPackOrderId = id;

  document.getElementById('pack-list').classList.add('hidden');
  document.getElementById('pack-order-id').textContent = order.id;
  document.getElementById('pack-address').textContent = order.address;

  document.getElementById('pack-items').innerHTML = order.items.map(i => `
    <tr>
      <td>${i.description}</td>
      <td>${i.part_number}</td>
      <td>${i.qty}</td>
    </tr>
  `).join('');

  document.getElementById('pack-detail').classList.remove('hidden');
}

document.getElementById('back-to-pack-btn').addEventListener('click', loadPackOrders);

document.getElementById('mark-packed-btn').addEventListener('click', async () => {
  if (!currentPackOrderId) return;
  const res = await fetch(`/api/warehouse/pack/${currentPackOrderId}`, { method: 'POST' });
  const data = await res.json();
  if (data.success) {
    alert(`Order #${currentPackOrderId} marked as packed.`);
    loadPackOrders();
  } else {
    alert(data.error);
  }
});

// --- ship orders ---

async function loadShipOrders() {
  const res = await fetch('/api/warehouse/ship');
  const orders = await res.json();

  const list = document.getElementById('ship-list');
  if (orders.length === 0) {
    list.innerHTML = '<p class="empty-msg">No orders ready to ship.</p>';
    return;
  }

  list.innerHTML = orders.map(o => `
    <div class="order-row">
      <span>#${o.id}</span>
      <span>${o.customer_name}</span>
      <span>${o.address}</span>
      <span>$${parseFloat(o.total).toFixed(2)}</span>
      <button onclick="shipOrder(${o.id})">Mark Shipped</button>
    </div>
  `).join('');
}

async function shipOrder(id) {
  if (!confirm(`Mark order #${id} as shipped?`)) return;
  const res = await fetch(`/api/warehouse/ship/${id}`, { method: 'POST' });
  const data = await res.json();
  if (data.success) {
    alert(`Order #${id} marked as shipped. Customer emailed.`);
    loadShipOrders();
  } else {
    alert(data.error);
  }
}

// --- receiving / inventory ---

document.getElementById('receiving-form').addEventListener('submit', async e => {
  e.preventDefault();
  const part_number = document.getElementById('recv-part').value;
  const qty = document.getElementById('recv-qty').value;
  const msg = document.getElementById('recv-msg');

  const res = await fetch('/api/warehouse/inventory', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ part_number, qty: parseInt(qty) }),
  });
  const data = await res.json();

  msg.classList.remove('hidden');
  if (data.success) {
    msg.textContent = `Added ${qty} units of part #${part_number} to inventory.`;
    msg.style.color = 'green';
    document.getElementById('recv-part').value = '';
    document.getElementById('recv-qty').value = '';
    loadInventory();
  } else {
    msg.textContent = data.error;
    msg.style.color = '#e94560';
  }
});

async function loadInventory() {
  const res = await fetch('/api/warehouse/inventory');
  const rows = await res.json();

  const list = document.getElementById('inventory-list');
  if (rows.length === 0) {
    list.innerHTML = '<p class="empty-msg">No inventory logged yet.</p>';
    return;
  }

  list.innerHTML = `
    <table class="items-table">
      <thead><tr><th>Part #</th><th>Qty on Hand</th></tr></thead>
      <tbody>${rows.map(r => `<tr><td>${r.part_number}</td><td>${r.qty_on_hand}</td></tr>`).join('')}</tbody>
    </table>
  `;
}
