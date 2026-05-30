# 🚗 MRC — Fleet Management System

A modern, staff-only car rental management system built with **Next.js 15**, **TypeScript**, **Tailwind CSS**, and **Supabase**.

## ✨ Features

- **Dashboard** — KPI cards, calendar widget, to-do list, top-10 vehicles & customers
- **Vehicles** — Full CRUD, photo uploads, rate tiers, service tracking, KM tracking
- **Rentals** — 2-step booking wizard, overlap prevention, activate/return/exchange/cancel flows
- **Customers & Guarantors** — Full CRUD with inline forms
- **Suppliers** — Manage vehicle suppliers
- **Agreements** — Auto-generated printable rental agreements
- **Users** — Admin-only user management with role-based access
- **Settings** — Company info, service interval, branding

## 🛠 Tech Stack

| Layer | Tech |
|-------|------|
| Framework | Next.js 15 App Router |
| Language | TypeScript |
| Styling | Tailwind CSS + custom components |
| UI Components | Radix UI + custom shadcn-style |
| Database | Supabase (PostgreSQL) |
| Auth | Custom cookie-based session (bcryptjs) |
| Icons | Lucide React |

## 🚀 Setup

### 1. Supabase

1. Create a project at [supabase.com](https://supabase.com)
2. Run `supabase/schema.sql` in the SQL Editor
3. Copy your **Project URL**, **Anon Key**, and **Service Role Key**

### 2. Environment

```bash
cp .env.example .env.local
```

Fill in your `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
AUTH_SECRET=generate-with-openssl-rand-base64-32
```

### 3. Install & Run

```bash
npm install --legacy-peer-deps
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

Default login (from seed data):
- **Username:** `amil`
- **Password:** `Admin@1234`

### Verify deployed login data

If login fails on Vercel, run:

```bash
npm run check-login -- amil Admin@1234
```

This checks whether the configured Supabase project has the `amil` user row, whether the account is active, and whether the stored password hash matches.

If the password hash does not match, reset the default admin in the same Supabase project:

```bash
npm run reset-admin
``` 

## 🗄 Database

### Tables
- `users` — Staff accounts (admin/employee)
- `company_settings` — Company info & service interval
- `suppliers` — Vehicle suppliers
- `vehicles` — Fleet with photos, rate tiers, km tracking
- `vehicle_photos` — Vehicle image storage
- `rate_tiers` — Per-vehicle duration-based pricing
- `customers` — Rental customers
- `guarantors` — Customer guarantors
- `rentals` — Rental agreements with full financial tracking
- `vehicle_exchanges` — Vehicle swap history within rentals
- `todos` — Dashboard to-do list

## 📁 Project Structure

```
src/
├── app/
│   ├── (dashboard)/        # All protected routes
│   │   ├── dashboard/      # Main dashboard
│   │   ├── vehicles/       # Vehicle list + detail + new
│   │   ├── rentals/        # Rental list + detail + new wizard
│   │   ├── customers/      # Customer CRUD
│   │   ├── suppliers/      # Supplier CRUD
│   │   ├── guarantors/     # Guarantor CRUD
│   │   ├── calendar/       # Calendar view
│   │   ├── agreements/     # Printable agreements
│   │   ├── users/          # Admin user management
│   │   └── settings/       # Company settings
│   ├── actions/            # Server actions
│   └── login/              # Login page
├── components/
│   ├── dashboard/          # CalendarWidget, TodoWidget
│   ├── layout/             # Sidebar
│   ├── shared/             # StatusBadge, ServiceAlertBadge, PasswordConfirmModal
│   └── ui/                 # Radix-based UI primitives
├── lib/
│   ├── auth.ts             # Session management
│   ├── supabase.ts         # Supabase clients
│   └── utils.ts            # Helpers, formatters, calculators
└── types/index.ts          # TypeScript interfaces
```

## 🔐 Roles

| Action | Admin | Employee |
|--------|-------|----------|
| View all data | ✅ | ✅ |
| Create vehicles/rentals/customers | ✅ | ✅ |
| Update / Delete (with password) | ✅ | ✅* |
| User management | ✅ | ❌ |
| Company settings | ✅ | ❌ |

*Employees confirm with their own password for sensitive changes.

## ☁️ Deploy to Vercel

1. Push to GitHub
2. Import to [Vercel](https://vercel.com)
3. Add env variables in Vercel project settings
4. Deploy!

---

Made for **MRC**, Colombo 🇱🇰
