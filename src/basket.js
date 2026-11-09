const _ = require('lodash');

// Customers get 10% off when they buy 3 or more books in one order.
const MULTI_BUY_THRESHOLD = 3;
const MULTI_BUY_DISCOUNT = 0.10;

function itemCount(items) {
  return _.sumBy(items, 'quantity');
}

function subtotal(items, books) {
  return _.sumBy(items, (item) => {
    const book = books.find((b) => b.id === item.bookId);
    if (!book) {
      throw new Error(`Unknown book: ${item.bookId}`);
    }
    return book.price * item.quantity;
  });
}

function total(items, books) {
  const count = itemCount(items);
  const sub = subtotal(items, books);
  const discount = count >= MULTI_BUY_THRESHOLD ? sub * MULTI_BUY_DISCOUNT : 0;
  return {
    items: count,
    subtotal: _.round(sub, 2),
    discount: _.round(discount, 2),
    total: _.round(sub - discount, 2),
  };
}

module.exports = { itemCount, subtotal, total, MULTI_BUY_THRESHOLD, MULTI_BUY_DISCOUNT };
