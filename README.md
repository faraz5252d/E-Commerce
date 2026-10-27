# ShopEase - E-Commerce SPA

A complete college-project e-commerce Single Page Application.

| Layer | Technology |
|---|---|
| Frontend | Angular 19 (standalone components, signals), TypeScript, HTML, CSS |
| Backend | Node.js + Express.js REST API |
| Storage | Local JSON files in `backend/data/` (no database) |
| Auth | JWT tokens, bcrypt-hashed passwords |
| Payment | Cash on Delivery only |

## 1. Prerequisites (Windows 10/11)

1. **Node.js 20 LTS or 22 LTS** - https://nodejs.org (Angular 19 officially supports Node 18.19+, 20.11+ and 22). Check with `node -v`.
2. **Visual Studio Code** - https://code.visualstudio.com
3. Internet access for the first `npm install`.

No global Angular CLI installation is needed; the project uses its own copy through `npx`/npm scripts.

## 2. Run the project

You need **two terminals** (in VS Code: `Terminal > New Terminal`, then click the **+** to open a second one).

### Terminal 1 - Backend (port 3000)

```powershell
cd backend
npm install
npm start
```

You should see: `E-Commerce API running at http://localhost:3000`.
On the very first start the server creates `backend/data/*.json` with 24 sample products and two users.

### Terminal 2 - Frontend (port 4200)

```powershell
cd frontend
npm install
npm start
```

Open **http://localhost:4200** in your browser.

The Angular dev server forwards `/api` and `/images` requests to the backend (see `frontend/proxy.conf.json`), so no extra configuration is needed. **Start the backend first.**

> If PowerShell says "running scripts is disabled", run `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` once, or use Command Prompt (`cmd`) instead.

## 3. Demo accounts

| Role | Email | Password |
|---|---|---|
| Admin | `admin@shop.com` | `Admin@123` |
| Customer | `customer@shop.com` | `Customer@123` |

Anyone can register a new customer account from the Register page. Public sign-up can never create an admin; only an existing admin can promote a user (Admin > Users).

To reset all data back to the sample data: stop the backend and run `npm run seed` inside `backend/`.

## 4. Features

**Customer**
- Home: hero banner, Shop Now, search bar, categories, featured, latest, special offers, footer, cart count in navbar
- Product list: search by name, category filter, sort (price / name / rating / newest), pagination, loading spinner, error message with retry, empty-results message, out-of-stock handling
- Product details: full info, quantity selector limited to available stock, Add to Cart / Buy Now
- Cart: add, remove, +/- quantity, clear, subtotals and total, empty-cart message, stock limits, saved in `localStorage` across refreshes, re-validated against the server
- Checkout: name, email, Indian mobile (10 digits, starts 6-9), address, city, state, PIN (6 digits), order summary, Cash on Delivery
- Register / login / logout, profile editing, password change
- My Orders: history, status badges, cancel before shipping (stock is returned)

**Admin** (`/admin`)
- Dashboard: product, stock, order, customer counts and revenue
- Products & inventory: add, edit, delete, quick stock update, featured flag
- Orders: filter by status, change status (Placed > Confirmed > Shipped > Delivered, or Cancelled)
- Users: enable/disable accounts, promote/demote

## 5. Project structure

```
ecommerce-spa/
├── backend/
│   ├── server.js              # Express app, middleware, route mounting
│   ├── package.json
│   ├── data/                  # JSON "database" (created on first run)
│   │   ├── products.json
│   │   ├── users.json
│   │   └── orders.json
│   ├── public/images/         # Generated product pictures (SVG)
│   └── src/
│       ├── db.js              # read/write JSON files safely
│       ├── auth.js            # JWT + requireAuth / requireAdmin
│       ├── validators.js      # email, phone, PIN, password checks
│       ├── seed.js            # sample data
│       └── routes/            # auth, products, orders (+cart), admin
└── frontend/
    ├── angular.json, package.json, proxy.conf.json, tsconfig*.json
    └── src/
        ├── index.html, main.ts, styles.css
        └── app/
            ├── core/          # services, models, guards, interceptor
            ├── shared/        # navbar, footer, product card, toasts
            ├── pages/         # home, products, details, cart, checkout, ...
            └── admin/         # dashboard, products, orders, users
```

## 6. REST API

Base URL `http://localhost:3000/api`. Send `Authorization: Bearer <token>` for protected routes.

| Method | Path | Access | Purpose |
|---|---|---|---|
| POST | `/auth/register` | public | Create customer account |
| POST | `/auth/login` | public | Log in, returns token + user |
| GET | `/auth/me` | user | Current user |
| PUT | `/auth/profile` | user | Update name / phone |
| PUT | `/auth/password` | user | Change password |
| GET | `/products` | public | List. Query: `search, category, sort, page, limit, featured, offers` |
| GET | `/products/categories` | public | Categories with counts |
| GET | `/products/:id` | public | One product |
| POST | `/cart/validate` | public | Returns real prices/stock for a cart |
| POST | `/orders` | user | Place a COD order |
| GET | `/orders/mine` | user | Own order history |
| GET | `/orders/:id` | owner/admin | One order |
| POST | `/orders/:id/cancel` | owner | Cancel (Placed/Confirmed only) |
| GET | `/admin/stats` | admin | Dashboard numbers |
| POST/PUT/DELETE | `/admin/products[/:id]` | admin | Manage products |
| PATCH | `/admin/products/:id/stock` | admin | Update inventory |
| GET / PATCH | `/admin/users[/:id]` | admin | List users, change role/active |
| GET | `/admin/orders` | admin | All orders (`?status=`) |
| PATCH | `/admin/orders/:id/status` | admin | Update order status |

## 7. Security notes (what is done, and demo limits)

- Passwords are hashed with bcrypt; login errors never reveal whether an email exists.
- **The server decides prices.** The browser only sends `productId` and `quantity`; the backend reads the price and stock from `products.json`, rejects out-of-stock or changed carts (HTTP 409), and decrements stock when the order is saved.
- All inputs are validated on the server (the Angular validators are only for convenience). Angular escapes all output, and `<`/`>` are stripped from stored text.
- Admin routes check the role on every request; users can only read and cancel their own orders.
- Rate limiting on login/register, request-size limit, CORS limited to `localhost:4200`, basic security headers.
- JWT secret: set the `JWT_SECRET` environment variable for anything beyond a demo (the default is a fixed demo value).
- Limits of a JSON-file store: fine for one server process and a demonstration, but not for many simultaneous users. A real shop would use a database. The JWT is kept in `localStorage`, which is acceptable for a college demo.

## 8. Troubleshooting

| Problem | Fix |
|---|---|
| "Cannot reach the server" message in the browser | Start the backend (`cd backend && npm start`) and keep it running. |
| `EADDRINUSE: port 3000` | Another program uses port 3000. Close it, or run `set PORT=3001` before `npm start` and change the port in `frontend/proxy.conf.json`. |
| Angular complains about the Node version | Install Node 20 LTS or 22 LTS. |
| Images don't show | Make sure the backend is running (it serves `/images`). |
| Want fresh data | `cd backend && npm run seed` |
