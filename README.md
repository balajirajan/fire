# FinFlow

A personal & family wealth management app — net worth, expenses, FIRE planning, insurance, health tracking, and more, all in one place.

Static HTML/CSS/JS, no build step, no framework. Backed by [Supabase](https://supabase.com) (Postgres + Auth + Storage), accessed directly from the browser via `js/supabase-client.js` and protected with Row Level Security — every table is scoped to `auth.uid()`, so each user only ever sees their own data.

## Features

- **Wealth** — Net Worth (Stocks/MF, Gold + Commodities, Government Scheme, Properties, Personal Debt), FIRE Plan + Goal Based Savings
- **Cash Flow** — Monthly Expenses, Income, Loan/EMI, Bank Balances, Daily Expense Capture, Tax Planning
- **Protection** — Insurance Tracker + Coverage Calculator, Reminders (renewals, warranties, filings), Document Vault (client-side AES-256-GCM encrypted)
- **Family & Health** — Life Expectancy Calculator, Medicine Tracker (medication/pill/supplement schedules + vaccination tracking), Checkup Reports (PDF upload with auto-detected lab values)
- **More** — SplitExpenses (shared group expense splitting), Spiritual (Rashi/Nakshatra/Lagna Finder)
- Free calculators (`calculator/`) and a public marketing site (`index.html`, `services.html`)

## Running locally

No build step, no `npm install` — just serve the directory:

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000`.

## Database setup

All tables, RLS policies, and Storage buckets are defined in [`supabase-schema.sql`](supabase-schema.sql). Run it once in your Supabase project's SQL Editor (Project → SQL Editor → New query) — every statement is written to be safe to re-run.

Update `SUPABASE_URL` and `SUPABASE_ANON_KEY` in `js/supabase-client.js` to point at your own Supabase project. The anon/publishable key is safe to expose client-side — RLS is what actually restricts access.

## Deploying

This is a static site — deploy the repo as-is to Vercel, Netlify, GitHub Pages, or any static host. No build command, no framework preset needed.

## Project structure

```
fire/
├── index.html, services.html        # public marketing pages
├── dashboard.html, net-worth.html,  # app pages — each is a
│   insurance-tracker.html, ...      # self-contained HTML file with
│                                     # inline <style>/<script>
├── calculator/                      # public, no-login-required calculators
├── split/                           # SplitExpenses (multi-user, separate sidebar)
├── js/                              # shared client-side modules
│   ├── supabase-client.js           # Supabase client + requireAuth()
│   ├── health-log/                  # Health module's data-access layer
│   └── ...                          # feature-specific calc/link helpers
└── supabase-schema.sql              # full DB schema, RLS policies, Storage buckets
```

Every page duplicates its own sidebar/header markup inline (no shared template/build step) — a sidebar or nav change means patching every page that shares it.
