# Meridian Books

The online shop for Meridian Books, an independent bookseller. This is the starter application for **LD6049 DevOps Principles**.

Your group works as DevOps consultants for Meridian. Right now the shop is built, tested and released by hand. Over the module you'll build a CI/CD pipeline around this code.

## What it does

- Lists books, with a genre filter
- Adds books to a basket
- Works out the basket total, with 10% off when you buy 3 or more books
- Includes a secure, simulated payment checkout flow for card payments
- Provides a refreshed storefront layout for a better customer experience

## Run it

You need **Node.js 22 or later** and **Git**.

```bash
git clone <this repository's URL>
cd meridian-books
npm install
npm start
```

Open http://localhost:3000 in your browser.

To use a different port:

```bash
PORT=4000 npm start
```

Stop the app with `Ctrl + C`.

## Run the tests

```bash
npm test
```

## API

| Method | Path | What it does |
|--------|------|--------------|
| GET | `/api/books` | All books. Add `?genre=Fiction` to filter. |
| GET | `/api/books/:id` | One book |
| POST | `/api/basket/total` | Basket total. Body: `{ "items": [{ "bookId": 1, "quantity": 2 }] }` |
| GET | `/api/info` | Shop name and number of books |

## Project layout

```
data/books.json     Book catalogue
public/             Web page, styles and browser script
src/app.js          Express routes
src/basket.js       Basket and discount rules
src/config.js       App settings
src/server.js       Starts the server
test/               Jest tests
```

## Licence

MIT
