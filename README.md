# 🛒 GroceryShop - Full Stack Application

Full-stack grocery shop with supplier management and low-stock WhatsApp alerts.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Java 21+, Spring Boot 3 |
| Security | Spring Security + JWT |
| Database | MySQL / MariaDB |
| Migrations | Flyway |
| WhatsApp | Twilio WhatsApp API |
| Frontend | React + TypeScript + Vite |
| Data Fetching | TanStack Query |
| Build (backend) | Maven |
| JS Routing | React Router |

## Project Structure

```
grocery-shop/
├── backend/                  # Spring Boot API
│   ├── pom.xml
│   └── src/main/
│       ├── java/com/groceryshop/
│       │   ├── auth/         # Register/Login + JWT
│       │   ├── cart/         # Shopping cart
│       │   ├── category/     # Product categories
│       │   ├── config/       # Security, JWT filter, CORS
│       │   ├── dto/          # Request/response models
│       │   ├── exception/    # Global error handling
│       │   ├── order/        # Orders
│       │   ├── product/      # Products + low stock
│       │   ├── supplier/     # Suppliers
│       │   ├── user/         # Users + roles
│       │   ├── whatsapp/     # WhatsApp low-stock alerts
│       │   └── util/         # JWT util, current user helper
│       └── resources/
│           ├── application.yml
│           └── db/migration/ # Flyway SQL (V1-V8)
│
└── frontend/                 # React + Vite app
    └── src/
        ├── api/              # Axios client + API functions
        ├── components/       # Navbar, ProductCard, badges
        ├── context/          # Auth context (JWT storage)
        ├── hooks/            # TanStack Query hooks
        ├── lib/              # Formatting helpers
        ├── pages/            # App pages
        ├── pages/admin/      # Admin pages
        └── types/            # TypeScript interfaces
```

## Features

- **Authentication** - Register/login with JWT, role-based access (Customer/Admin)
- **Products** - Listing, detail, search, category filter, sort
- **Categories** - Browse and filter products
- **Shopping Cart** - Add/update/remove items, quantity controls
- **Orders** - Place order, order history, status tracking
- **Suppliers** - Admin CRUD, product-supplier mapping
- **Low Stock Alerts** - WhatsApp notifications to owner AND supplier when stock runs low
- **Admin Dashboard** - Stats, product/supplier/order management

## Prerequisites

- Java 17+ (tested with Java 21/25)
- Maven 3.8+ (or use the maven wrapper). If `mvn` is not on your PATH,
  use explicit path, e.g. `C:\Users\LDS\Downloads\apache-maven-3.9.16\bin\mvn.cmd`.
- Node.js 18+
- MySQL or MariaDB running on port 3306
- (Optional) Twilio account for WhatsApp alerts

## Database Setup

The app auto-creates the `grocery_shop` database and runs all Flyway migrations
on startup. Seed data (categories, suppliers, products) is applied automatically.

An **admin** user is seeded automatically:

| Username | Password  | Role  |
|----------|-----------|-------|
| `admin`  | `admin123` | ADMIN |

Configure DB credentials in `backend/src/main/resources/application.yml`
or via environment variables:

```bash
DB_URL=jdbc:mariadb://localhost:3306/grocery_shop
DB_USERNAME=root
DB_PASSWORD=your_password
```

## Running the Backend

```bash
cd backend
mvn spring-boot:run     # or: ./mvnw spring-boot:run  (maven wrapper)
```

The API starts at `http://localhost:8080/api`.

> Note: If port 8080 is occupied by another process, run on a different port:
> `mvn spring-boot:run -Dspring-boot.run.arguments=--server.port=8081`
> and update `frontend/vite.config.ts` proxy target to match.

## Running the Frontend

```bash
cd frontend
npm install
npm run dev
```

The frontend starts at `http://localhost:5173`. Vite proxies `/api` requests to the backend.

## WhatsApp Alerts (Optional)

Low-stock alerts are **disabled by default** and logged as simulated messages.
Enable by configuring environment variables in `application.yml`:

| Variable | Default | Purpose |
|----------|---------|---------|
| `WHATSAPP_ENABLED` | `false` | Enable real WhatsApp sending |
| `TWILIO_ACCOUNT_SID` | empty | Twilio account SID |
| `TWILIO_AUTH_TOKEN` | empty | Twilio auth token |
| `TWILIO_WHATSAPP_FROM` | `whatsapp:+14155238886` | Twilio WhatsApp number |
| `OWNER_WHATSAPP` | `+919876543210` | Owner's WhatsApp number |

When a product's `stock` falls to or below `minStock`, the system sends:
1. A low-stock alert to the **owner** (with supplier name + phone)
2. A restocking request to the **supplier** on WhatsApp

A daily scheduler also checks all products at 9:00 AM.

## JWT Auth Flow

```
Register → POST /api/auth/register → Returns JWT + user
Login    → POST /api/auth/login    → Returns JWT + user

Protected requests → Header: Authorization: Bearer <token>
```

Store the `token` from the response in localStorage (the frontend does this automatically).

## API Endpoints

| Method | Endpoint | Auth |
|--------|----------|------|
| POST | `/api/auth/register` | Public |
| POST | `/api/auth/login` | Public |
| GET | `/api/products` | Public |
| GET | `/api/products/{id}` | Public |
| GET | `/api/products/low-stock/check` | Admin |
| POST | `/api/products` | Admin |
| PUT | `/api/products/{id}` | Admin |
| PATCH | `/api/products/{id}/stock` | Admin |
| DELETE | `/api/products/{id}` | Admin |
| GET | `/api/categories` | Public |
| GET | `/api/cart` | Customer |
| POST | `/api/cart` | Customer |
| PUT | `/api/cart/{itemId}` | Customer |
| DELETE | `/api/cart/{itemId}` | Customer |
| POST | `/api/orders` | Customer |
| GET | `/api/orders` | Customer |
| GET | `/api/orders/{id}` | Customer |
| GET | `/api/orders/admin/all` | Admin |
| PATCH | `/api/orders/admin/{id}/status` | Admin |
| GET | `/api/admin/suppliers` | Admin |
| POST | `/api/admin/suppliers` | Admin |
| PUT | `/api/admin/suppliers/{id}` | Admin |
| DELETE | `/api/admin/suppliers/{id}` | Admin |

## Pages / Routes

| Route | Page | Access |
|-------|------|--------|
| `/` | Homepage | Public |
| `/login` | Login | Public |
| `/register` | Register | Public |
| `/products` | Product listing | Public |
| `/products/:id` | Product detail | Public |
| `/cart` | Cart | Customer |
| `/checkout` | Checkout | Customer |
| `/orders` | Order history | Customer |
| `/orders/:id` | Order detail | Customer |
| `/admin` | Admin dashboard | Admin |
| `/admin/products` | Product management | Admin |
| `/admin/suppliers` | Supplier management | Admin |
| `/admin/orders` | Order management | Admin |