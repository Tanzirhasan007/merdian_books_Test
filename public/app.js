const booksList = document.getElementById('books');
const genreSelect = document.getElementById('genre');
const basketList = document.getElementById('basket');
const summary = document.getElementById('summary');
const basketCount = document.getElementById('basket-count');
const checkoutForm = document.getElementById('checkout-form');
const checkoutMessage = document.getElementById('checkout-message');
const checkoutToggle = document.getElementById('checkout-toggle');

const basket = new Map(); // bookId -> { book, quantity }

function formatPrice(value) {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
  }).format(Number(value || 0));
}

function sanitizeCardNumber(value) {
  return value.replace(/\D/g, '').slice(0, 19).replace(/(.{4})/g, '$1 ').trim();
}

function sanitizeExpiry(value) {
  return value.replace(/\D/g, '').slice(0, 4).replace(/^(\d{2})(\d{0,2})$/, (match, month, year) => {
    return year ? `${month}/${year}` : month;
  });
}

function updateCheckoutState() {
  const hasItems = basket.size > 0;
  checkoutToggle.disabled = !hasItems;
  checkoutToggle.textContent = hasItems ? 'Proceed to checkout' : 'Your basket is empty';
  if (!hasItems) {
    checkoutForm.classList.add('hidden');
  }
}

async function loadBooks(genre = '') {
  const url = genre ? `/api/books?genre=${encodeURIComponent(genre)}` : '/api/books';
  const res = await fetch(url);
  const books = await res.json();
  booksList.innerHTML = '';

  books.forEach((book) => {
    const card = document.createElement('article');
    const inStock = book.stock > 0;

    card.className = 'book-card';
    card.innerHTML = `
      <div class="book-card-header">
        <span class="tag">${book.genre}</span>
        <span class="price">${formatPrice(book.price)}</span>
      </div>
      <h3>${book.title}</h3>
      <p class="author">${book.author}</p>
      <p class="stock ${inStock ? 'in-stock' : 'out-stock'}">${inStock ? `${book.stock} in stock` : 'Out of stock'}</p>
    `;

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'primary-button book-button';
    button.textContent = inStock ? 'Add to basket' : 'Out of stock';
    button.disabled = !inStock;
    button.addEventListener('click', () => addToBasket(book));

    card.appendChild(button);
    booksList.appendChild(card);
  });

  return books;
}

async function loadGenres() {
  const res = await fetch('/api/books');
  const books = await res.json();
  const genres = [...new Set(books.map((book) => book.genre))].sort();

  genres.forEach((genre) => {
    const option = document.createElement('option');
    option.value = genre;
    option.textContent = genre;
    genreSelect.appendChild(option);
  });
}

function addToBasket(book) {
  const line = basket.get(book.id) || { book, quantity: 0 };

  if (line.quantity >= book.stock) {
    checkoutMessage.textContent = 'You have reached the available stock for this title.';
    return;
  }

  line.quantity += 1;
  basket.set(book.id, line);
  checkoutMessage.textContent = '';
  renderBasket();
}

function changeQuantity(bookId, delta) {
  const line = basket.get(bookId);
  if (!line) return;

  const nextQuantity = line.quantity + delta;
  if (nextQuantity <= 0) {
    basket.delete(bookId);
  } else {
    line.quantity = nextQuantity;
    basket.set(bookId, line);
  }

  renderBasket();
}

async function renderBasket() {
  basketList.innerHTML = '';

  if (basket.size === 0) {
    summary.textContent = 'Your basket is empty.';
    basketCount.textContent = '0 items';
    updateCheckoutState();
    return;
  }

  basket.forEach(({ book, quantity }) => {
    const li = document.createElement('li');
    li.className = 'basket-item';
    li.innerHTML = `
      <div>
        <h3>${book.title}</h3>
        <p>${formatPrice(book.price)} each</p>
      </div>
      <div class="basket-actions">
        <div class="stepper">
          <button type="button" data-action="decrease" data-book-id="${book.id}" aria-label="Decrease quantity">−</button>
          <span>${quantity}</span>
          <button type="button" data-action="increase" data-book-id="${book.id}" aria-label="Increase quantity">+</button>
        </div>
        <button type="button" class="remove-button" data-action="remove" data-book-id="${book.id}">Remove</button>
      </div>
    `;
    basketList.appendChild(li);
  });

  basketList.querySelectorAll('button[data-action]').forEach((button) => {
    const bookId = Number(button.dataset.bookId);
    const action = button.dataset.action;

    button.addEventListener('click', () => {
      if (action === 'increase') {
        const book = basket.get(bookId)?.book;
        if (book && basket.get(bookId).quantity >= book.stock) {
          checkoutMessage.textContent = 'You have reached the available stock for this title.';
          return;
        }
        changeQuantity(bookId, 1);
      }

      if (action === 'decrease') {
        changeQuantity(bookId, -1);
      }

      if (action === 'remove') {
        basket.delete(bookId);
        renderBasket();
      }
    });
  });

  const items = [...basket.values()].map(({ book, quantity }) => ({ bookId: book.id, quantity }));
  const res = await fetch('/api/basket/total', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ items }),
  });
  const totals = await res.json();

  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  basketCount.textContent = `${totalItems} item${totalItems === 1 ? '' : 's'}`;

  summary.innerHTML = `
    <div class="totals-line"><span>Subtotal</span><strong>${formatPrice(totals.subtotal)}</strong></div>
    <div class="totals-line"><span>Discount</span><strong>- ${formatPrice(totals.discount)}</strong></div>
    <div class="totals-line total"><span>Total</span><strong>${formatPrice(totals.total)}</strong></div>
  `;

  updateCheckoutState();
}

checkoutToggle.addEventListener('click', () => {
  checkoutForm.classList.toggle('hidden');
  if (!checkoutForm.classList.contains('hidden')) {
    checkoutForm.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
});

checkoutForm.addEventListener('submit', async (event) => {
  event.preventDefault();

  if (basket.size === 0) {
    checkoutMessage.textContent = 'Your basket is empty.';
    return;
  }

  const formData = new FormData(checkoutForm);
  const payload = {
    items: [...basket.values()].map(({ book, quantity }) => ({ bookId: book.id, quantity })),
    customer: {
      name: String(formData.get('name') || '').trim(),
      email: String(formData.get('email') || '').trim(),
    },
    payment: {
      cardholder: String(formData.get('cardholder') || '').trim(),
      cardNumber: String(formData.get('cardNumber') || '').trim(),
      expiry: String(formData.get('expiry') || '').trim(),
      cvc: String(formData.get('cvc') || '').trim(),
    },
  };

  const submitButton = checkoutForm.querySelector('button[type="submit"]');
  submitButton.disabled = true;
  submitButton.textContent = 'Processing...';

  try {
    const res = await fetch('/api/payment/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Payment failed');
    }

    checkoutMessage.textContent = `${data.message} Order ${data.orderId} paid using ${data.paymentMethod}.`;
    basket.clear();
    checkoutForm.reset();
    renderBasket();
    checkoutForm.classList.add('hidden');
  } catch (error) {
    checkoutMessage.textContent = error.message;
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = 'Pay now';
  }
});

const cardNumberInput = checkoutForm.querySelector('input[name="cardNumber"]');
const expiryInput = checkoutForm.querySelector('input[name="expiry"]');
const cvcInput = checkoutForm.querySelector('input[name="cvc"]');

cardNumberInput.addEventListener('input', (event) => {
  event.target.value = sanitizeCardNumber(event.target.value);
});

expiryInput.addEventListener('input', (event) => {
  event.target.value = sanitizeExpiry(event.target.value);
});

cvcInput.addEventListener('input', (event) => {
  event.target.value = event.target.value.replace(/\D/g, '').slice(0, 4);
});

document.querySelector('[data-scroll-target="catalogue"]').addEventListener('click', () => {
  document.getElementById('catalogue').scrollIntoView({ behavior: 'smooth', block: 'start' });
});

genreSelect.addEventListener('change', () => loadBooks(genreSelect.value));

renderBasket();
loadGenres();
loadBooks();
