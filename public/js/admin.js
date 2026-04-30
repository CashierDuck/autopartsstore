// admin page - view/filter orders, cancel orders, edit shipping rates

async function loadOrders() {
  // grab whatever filters are set
  const status   = document.getElementById('filter-status').value;
  const from     = document.getElementById('filter-from').value;
  const to       = document.getElementById('filter-to').value;
  const minPrice = document.getElementById('filter-min').value;
  const maxPrice = document.getElementById('filter-max').value;

  const params = new URLSearchParams();
  if (status)   params.set('status', status);
  if (from)     params.set('from', from);
  if (to)       params.set('to', to);
  if (minPrice) params.set('minPrice', minPrice);
  if (maxPrice) params.set('maxPrice', maxPrice);

  const res = await fetch('/api/admin/orders?' + params.toString());
  const orders = await res.json();

  const list = document.getElementById('orders-list');
  if (orders.length === 0) {
    list.innerHTML = '<p class="empty-msg">No orders found.</p>';
    return;
  }

  list.innerHTML = orders.map(o => `
    <div class="order-row" onclick="openOrder(${o.id})">
      <span>#${o.id}</span>
      <span>${o.customer_name}</span>
      <span>$${parseFloat(o.total).toFixed(2)}</span>
      <span class="status-badge status-${o.status}">${o.status}</span>
      <span>${new Date(o.created_at).toLocaleDateString()}</span>
    </div>
  `).join('');
}

// load a single order and show it in the modal
async function openOrder(id) {
  const res = await fetch(`/api/admin/orders/${id}`);
  const order = await res.json();

  document.getElementById('modal-order-id').textContent = order.id;
  document.getElementById('modal-name').textContent = order.customer_name;
  document.getElementById('modal-email').textContent = order.email;
  document.getElementById('modal-address').textContent = order.address;
  document.getElementById('modal-status').textContent = order.status;
  document.getElementById('modal-date').textContent = new Date(order.created_at).toLocaleString();
  document.getElementById('modal-total').textContent = parseFloat(order.total).toFixed(2);

  const tbody = document.querySelector('#modal-items tbody');
  tbody.innerHTML = order.items.map(i => `
    <tr>
      <td>${i.description}</td>
      <td>${i.qty}</td>
      <td>$${parseFloat(i.price).toFixed(2)}</td>
      <td>$${(i.price * i.qty).toFixed(2)}</td>
    </tr>
  `).join('');

  // only show cancel button for orders that haven't been packed yet
  const cancelBtn = document.getElementById('modal-cancel-btn');
  if (order.status === 'authorized') {
    cancelBtn.classList.remove('hidden');
    cancelBtn.onclick = () => cancelOrder(order.id);
  } else {
    cancelBtn.classList.add('hidden');
  }

  document.getElementById('order-modal').classList.remove('hidden');
}

async function cancelOrder(id) {
  if (!confirm('Cancel this order?')) return;
  const res = await fetch(`/api/admin/orders/${id}/cancel`, { method: 'POST' });
  const data = await res.json();
  if (data.success) {
    document.getElementById('order-modal').classList.add('hidden');
    loadOrders();
  } else {
    alert(data.error);
  }
}

async function loadShippingRates() {
  const res = await fetch('/api/admin/shipping');
  const rates = await res.json();

  document.getElementById('shipping-rates-list').innerHTML = rates.map(r => `
    <div class="rate-row">
      <label>Up to (lbs): <input type="number" value="${r.max_weight}" step="0.01" id="weight-${r.id}" /></label>
      <label>Fee ($): <input type="number" value="${r.fee}" step="0.01" id="fee-${r.id}" /></label>
      <button onclick="saveRate(${r.id})">Save</button>
    </div>
  `).join('');
}

async function saveRate(id) {
  const max_weight = document.getElementById(`weight-${id}`).value;
  const fee = document.getElementById(`fee-${id}`).value;

  const res = await fetch(`/api/admin/shipping/${id}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ max_weight, fee }),
  });
  const data = await res.json();
  if (data.success) alert('Saved!');
  else alert(data.error);
}

document.getElementById('filter-btn').addEventListener('click', loadOrders);

document.getElementById('filter-clear-btn').addEventListener('click', () => {
  document.getElementById('filter-status').value = '';
  document.getElementById('filter-from').value = '';
  document.getElementById('filter-to').value = '';
  document.getElementById('filter-min').value = '';
  document.getElementById('filter-max').value = '';
  loadOrders();
});

document.getElementById('modal-close-btn').addEventListener('click', () => {
  document.getElementById('order-modal').classList.add('hidden');
});
