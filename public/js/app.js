// Client-side app logic
// Handles catalog browsing, search, and cart management

const cart = {}; // { partNumber: { part, qty } }
const PAGE_SIZE = 30;
let currentPage = 1;
let allParts = [];

// --- Page navigation ---

document.querySelectorAll('.nav-link').forEach(link => {
  link.addEventListener('click', e => {
    e.preventDefault();
    const page = link.dataset.page;
    showPage(page);
    document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
    link.classList.add('active');
  });
});

function showPage(name) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById(`${name}-page`).classList.add('active');
  if (name === 'cart') renderCart();
  if (name === 'admin') { loadOrders(); loadShippingRates(); }
  if (name === 'warehouse') loadPackOrders();
  if (name === 'receiving') loadInventory();
}

// --- Catalog ---

async function loadCatalog(query = '') {
  const grid = document.getElementById('catalog-grid');
  grid.innerHTML = '<p class="loading">Loading...</p>';

  const url = query
    ? `/api/catalog/search?q=${encodeURIComponent(query)}`
    : '/api/catalog';

  try {
    const res = await fetch(url);
    const parts = await res.json();

    if (!res.ok) {
      grid.innerHTML = `<p class="error-msg">${parts.error || 'Failed to load parts.'}</p>`;
      return;
    }

    if (parts.length === 0) {
      grid.innerHTML = '<p class="loading">No parts found.</p>';
      document.getElementById('pagination').innerHTML = '';
      return;
    }

    // sort based on dropdown
    const sort = document.getElementById('sort-select').value;
    if (sort === 'price-asc')  parts.sort((a, b) => a.price - b.price);
    if (sort === 'price-desc') parts.sort((a, b) => b.price - a.price);
    if (sort === 'name-asc')   parts.sort((a, b) => a.description.localeCompare(b.description));
    if (sort === 'name-desc')  parts.sort((a, b) => b.description.localeCompare(a.description));

    allParts = parts;
    currentPage = 1;
    renderPage();

  } catch (err) {
    grid.innerHTML = '<p class="error-msg">Could not connect to server.</p>';
  }
}

function renderPage() {
  const grid = document.getElementById('catalog-grid');
  const start = (currentPage - 1) * PAGE_SIZE;
  const pageParts = allParts.slice(start, start + PAGE_SIZE);
  const totalPages = Math.ceil(allParts.length / PAGE_SIZE);

  grid.innerHTML = pageParts.map(part => `
    <div class="part-card" onclick="openPartModal(${JSON.stringify(part).replace(/"/g, '&quot;')})">
      <img src="${part.pictureURL || ''}" alt="${part.description}"
           onerror="this.src='/img/placeholder.png'; this.onerror=null;" />
      <div class="part-name">${part.description}</div>
      <div class="part-price">$${parseFloat(part.price).toFixed(2)}</div>
      <div class="part-num">Part #${part.number}</div>
      <button onclick="event.stopPropagation(); addToCart(${JSON.stringify(part).replace(/"/g, '&quot;')})">
        Add to Cart
      </button>
    </div>
  `).join('');

  // pagination controls
  const pag = document.getElementById('pagination');
  if (totalPages <= 1) { pag.innerHTML = ''; return; }

  let pageButtons = '';
  for (let i = 1; i <= totalPages; i++) {
    pageButtons += `<button onclick="goToPage(${i})" class="${i === currentPage ? 'page-active' : ''}">${i}</button>`;
  }

  pag.innerHTML = `
    <button onclick="goToPage(${currentPage - 1})" ${currentPage === 1 ? 'disabled' : ''}>← Prev</button>
    ${pageButtons}
    <button onclick="goToPage(${currentPage + 1})" ${currentPage === totalPages ? 'disabled' : ''}>Next →</button>
  `;
}

function goToPage(page) {
  currentPage = page;
  renderPage();
  window.scrollTo(0, 0);
}

document.getElementById('search-btn').addEventListener('click', () => {
  const q = document.getElementById('search-input').value.trim();
  loadCatalog(q);
});

document.getElementById('clear-btn').addEventListener('click', () => {
  document.getElementById('search-input').value = '';
  loadCatalog();
});

document.getElementById('search-input').addEventListener('keydown', e => {
  if (e.key === 'Enter') document.getElementById('search-btn').click();
});

document.getElementById('sort-select').addEventListener('change', () => {
  const sort = document.getElementById('sort-select').value;
  if (sort === 'price-asc')  allParts.sort((a, b) => a.price - b.price);
  if (sort === 'price-desc') allParts.sort((a, b) => b.price - a.price);
  if (sort === 'name-asc')   allParts.sort((a, b) => a.description.localeCompare(b.description));
  if (sort === 'name-desc')  allParts.sort((a, b) => b.description.localeCompare(a.description));
  currentPage = 1;
  renderPage();
});

// --- Cart ---

function addToCart(part) {
  if (cart[part.number]) {
    cart[part.number].qty += 1;
  } else {
    cart[part.number] = { part, qty: 1 };
  }
  updateCartCount();
}

function updateCartCount() {
  const total = Object.values(cart).reduce((sum, item) => sum + item.qty, 0);
  document.getElementById('cart-count').textContent = total;
}

function renderCart() {
  const container = document.getElementById('cart-items');
  const summary = document.getElementById('cart-summary');
  const items = Object.values(cart);

  if (items.length === 0) {
    container.innerHTML = '<p class="empty-msg">Your cart is empty.</p>';
    summary.classList.add('hidden');
    return;
  }

  container.innerHTML = items.map(({ part, qty }) => `
    <div class="cart-item">
      <div class="item-info">
        <div class="item-name">${part.description}</div>
        <div class="item-price">$${parseFloat(part.price).toFixed(2)} each</div>
      </div>
      <div class="qty-controls">
        <button onclick="changeQty(${part.number}, -1)">-</button>
        <span>${qty}</span>
        <button onclick="changeQty(${part.number}, 1)">+</button>
      </div>
      <button class="remove-btn" onclick="removeItem(${part.number})" title="Remove">×</button>
    </div>
  `).join('');

  const subtotal = items.reduce((sum, { part, qty }) => sum + part.price * qty, 0);
  const shipping = calcShipping(items);
  const total = subtotal + shipping;

  document.getElementById('subtotal').textContent = subtotal.toFixed(2);
  document.getElementById('shipping').textContent = shipping.toFixed(2);
  document.getElementById('total').textContent = total.toFixed(2);
  summary.classList.remove('hidden');
}

// Shipping is based on total weight — brackets match admin settings spec
function calcShipping(items) {
  const totalWeight = items.reduce((sum, { part, qty }) => sum + (part.weight || 0) * qty, 0);
  if (totalWeight <= 0) return 0;
  if (totalWeight <= 5) return 5.99;
  if (totalWeight <= 15) return 9.99;
  if (totalWeight <= 30) return 14.99;
  return 19.99;
}

function changeQty(partNumber, delta) {
  if (!cart[partNumber]) return;
  cart[partNumber].qty += delta;
  if (cart[partNumber].qty <= 0) delete cart[partNumber];
  updateCartCount();
  renderCart();
}

function removeItem(partNumber) {
  delete cart[partNumber];
  updateCartCount();
  renderCart();
}

document.getElementById('checkout-btn').addEventListener('click', () => {
  populateCheckoutSummary();
  showPage('checkout');
  document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
});

document.getElementById('back-to-cart-btn').addEventListener('click', () => {
  showPage('cart');
  document.querySelector('[data-page="cart"]').classList.add('active');
});

document.getElementById('conf-continue-btn').addEventListener('click', () => {
  showPage('catalog');
  document.querySelector('[data-page="catalog"]').classList.add('active');
});

function populateCheckoutSummary() {
  const items = Object.values(cart);
  const subtotal = items.reduce((sum, { part, qty }) => sum + part.price * qty, 0);
  const shipping = calcShipping(items);
  document.getElementById('co-subtotal').textContent = subtotal.toFixed(2);
  document.getElementById('co-shipping').textContent = shipping.toFixed(2);
  document.getElementById('co-total').textContent = (subtotal + shipping).toFixed(2);
}

document.getElementById('co-cc').addEventListener('input', e => {
  let v = e.target.value.replace(/\D/g, '').slice(0, 16);
  e.target.value = v.replace(/(.{4})/g, '$1 ').trim();
});

document.getElementById('co-exp').addEventListener('input', e => {
  let v = e.target.value.replace(/\D/g, '').slice(0, 6);
  if (v.length > 2) v = v.slice(0, 2) + '/' + v.slice(2);
  e.target.value = v;
});

document.getElementById('checkout-form').addEventListener('submit', async e => {
  e.preventDefault();
  const errEl = document.getElementById('checkout-error');
  errEl.classList.add('hidden');

  const name    = document.getElementById('co-name').value.trim();
  const email   = document.getElementById('co-email').value.trim();
  const address = document.getElementById('co-address').value.trim();
  const cc      = document.getElementById('co-cc').value.trim();
  const exp     = document.getElementById('co-exp').value.trim();

  if (!name || !email || !address || !cc || !exp) {
    errEl.textContent = 'Please fill in all fields.';
    errEl.classList.remove('hidden');
    return;
  }

  const items = Object.values(cart).map(({ part, qty }) => ({
    number: part.number,
    description: part.description,
    price: part.price,
    weight: part.weight,
    qty,
  }));

  const subtotal = items.reduce((sum, i) => sum + i.price * i.qty, 0);
  const shipping = calcShipping(Object.values(cart));
  const total = subtotal + shipping;

  const btn = document.getElementById('place-order-btn');
  btn.disabled = true;
  btn.textContent = 'Processing...';

  try {
    const transId = `${Date.now()}-${Math.floor(Math.random() * 1000000)}`;
    const authResult = await creditCardAuthorization(transId, cc, name, exp, total.toFixed(2));

    // NIU returns a json object, check for errors before continuing
    let authCode = authResult;
    try {
      const parsed = JSON.parse(authResult);
      if (parsed.errors && parsed.errors.length > 0) {
        errEl.textContent = 'Payment declined: ' + parsed.errors.join(', ');
        errEl.classList.remove('hidden');
        return;
      }
      if (parsed.authorization) authCode = String(parsed.authorization);
    } catch { /* plain string, check for Error prefix */ }

    if (!authCode || authCode.startsWith('Error')) {
      errEl.textContent = authCode || 'Payment declined. Please check your card details.';
      errEl.classList.remove('hidden');
      return;
    }

    const res = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, address, cc, exp, items, authNumber: authCode }),
    });
    const data = await res.json();

    if (!res.ok) {
      errEl.textContent = data.error || 'Order failed. Please try again.';
      errEl.classList.remove('hidden');
      return;
    }

    Object.keys(cart).forEach(k => delete cart[k]);
    updateCartCount();

    document.getElementById('conf-order-id').textContent = data.orderId;
    document.getElementById('conf-total').textContent = data.total;
    document.getElementById('conf-auth').textContent = authCode;
    showPage('confirmation');
    document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));

  } catch (err) {
    errEl.textContent = 'Could not connect to server. Please try again.';
    errEl.classList.remove('hidden');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Place Order';
  }
});

// part preview modal
let _modalPart = null;

function openPartModal(part) {
  _modalPart = part;
  document.getElementById('part-modal-img').src = part.pictureURL || '';
  document.getElementById('part-modal-img').onerror = function() { this.src = '/img/placeholder.png'; };
  document.getElementById('part-modal-name').textContent = part.description;
  document.getElementById('part-modal-num').textContent = `Part #${part.number}`;
  document.getElementById('part-modal-price').textContent = `$${parseFloat(part.price).toFixed(2)}`;
  document.getElementById('part-modal').classList.remove('hidden');
}

document.getElementById('part-modal-close').addEventListener('click', () => {
  document.getElementById('part-modal').classList.add('hidden');
});

document.getElementById('part-modal').addEventListener('click', e => {
  if (e.target === document.getElementById('part-modal'))
    document.getElementById('part-modal').classList.add('hidden');
});

document.getElementById('part-modal-add').addEventListener('click', () => {
  if (_modalPart) addToCart(_modalPart);
  document.getElementById('part-modal').classList.add('hidden');
});

// hamburger menu toggle
document.querySelector('.menu-btn').addEventListener('click', e => {
  e.stopPropagation();
  document.querySelector('.menu-items').classList.toggle('hidden');
});

document.addEventListener('click', () => {
  document.querySelector('.menu-items').classList.add('hidden');
});

// Load catalog on startup
loadCatalog();
