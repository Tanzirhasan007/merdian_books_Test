const path = require('path');
const express = require('express');
const books = require('../data/books.json');
const basket = require('./basket');
const config = require('./config');

const app = express();
app.use(express.json({ limit: '1mb' }));
app.use(express.static(path.join(__dirname, '..', 'public')));

function normalizeItems(items) {
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error('Send an items array, e.g. [{ "bookId": 1, "quantity": 2 }]');
  }

  return items.map(({ bookId, quantity }) => {
    const numericBookId = Number(bookId);
    const numericQuantity = Number(quantity);

    if (!Number.isInteger(numericBookId) || numericBookId <= 0) {
      throw new Error('Each item needs a valid positive bookId');
    }

    if (!Number.isInteger(numericQuantity) || numericQuantity <= 0) {
      throw new Error('Each item needs a valid positive quantity');
    }

    return { bookId: numericBookId, quantity: numericQuantity };
  });
}

function validateCheckoutPayload(payload) {
  const customer = payload && payload.customer;
  const payment = payload && payload.payment;

  if (!customer || !customer.name || !customer.email) {
    throw new Error('Customer name and email are required');
  }

  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailPattern.test(String(customer.email))) {
    throw new Error('Customer email is invalid');
  }

  if (!payment || !payment.cardholder || !payment.cardNumber || !payment.expiry || !payment.cvc) {
    throw new Error('Cardholder, card number, expiry and CVC are required');
  }

  const cleanedCardNumber = String(payment.cardNumber).replace(/\s+/g, '');
  if (!/^\d{12,19}$/.test(cleanedCardNumber)) {
    throw new Error('Card number must be 12 to 19 digits');
  }

  if (!/^(0[1-9]|1[0-2])\/(\d{2})$/.test(String(payment.expiry))) {
    throw new Error('Card expiry must use MM/YY format');
  }

  if (!/^\d{3,4}$/.test(String(payment.cvc))) {
    throw new Error('CVC must be 3 or 4 digits');
  }
}

app.get('/api/books', (req, res) => {
  const { genre } = req.query;
  const result = genre ? books.filter((b) => b.genre.toLowerCase() === genre.toLowerCase()) : books;
  res.json(result);
});

app.get('/api/books/:id', (req, res) => {
  const book = books.find((b) => b.id === Number(req.params.id));
  if (!book) {
    return res.status(404).json({ error: 'Book not found' });
  }
  res.json(book);
});

app.post('/api/basket/total', (req, res) => {
  try {
    const items = normalizeItems(req.body && req.body.items);
    res.json(basket.total(items, books));
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/payment/checkout', (req, res) => {
  try {
    const items = normalizeItems(req.body && req.body.items);
    validateCheckoutPayload(req.body);

    const totals = basket.total(items, books);
    const cardDigits = String(req.body.payment.cardNumber).replace(/\s+/g, '');
    const orderId = `MB-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

    res.json({
      success: true,
      orderId,
      status: 'paid',
      paymentProvider: config.paymentProvider,
      paymentMethod: `Card ending in ${cardDigits.slice(-4)}`,
      amount: Number(totals.total.toFixed(2)),
      currency: 'GBP',
      subtotal: Number(totals.subtotal.toFixed(2)),
      discount: Number(totals.discount.toFixed(2)),
      message: 'Payment approved successfully.',
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.get('/api/info', (req, res) => {
  res.json({
    shop: config.shopName,
    books: books.length,
    paymentProvider: config.paymentProvider,
    discountThreshold: basket.MULTI_BUY_THRESHOLD,
    discountPercent: basket.MULTI_BUY_DISCOUNT * 100,
  });
});

module.exports = app;
