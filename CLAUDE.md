# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

EnrichMe — a personal & family wealth management app (net worth, expenses, FIRE planning, insurance, health tracking, bill splitting, and more). Static HTML/CSS/JS, **no build step, no framework, no `package.json`** (a dead Vite/React scaffold was deliberately removed — don't reintroduce one). Backed by Supabase (Postgres + Auth + Storage + Edge Functions), accessed directly from the browser.

## Commands

```bash
# Run locally — no npm install, just serve the directory
python3 -m http.server 8000
# then open http://localhost:8000

# Deploy — push to main; Vercel auto-deploys the static repo as-is
# (vercel.json pins framework/buildCommand/installCommand to null — don't add a build step)
git push origin main

# Apply/update the database schema — every statement is idempotent (create ... if not exists,
# alter table ... add column if not exists, drop policy if exists + recreate), safe to re-run
# wholesale in Supabase's SQL Editor after any schema change
# (Project → SQL Editor → New query, paste supabase-schema.sql)

# Deploy an edge function after editing supabase/functions/*
npx supabase functions deploy <function-name>

# Set a required secret for an edge function (see supabase/functions/_shared/mailgun.ts for the list)
npx supabase secrets set MAILGUN_API_KEY=...
```

**Tests**: there's no Jest/Node test runner. Pure-calculation modules (`js/goals-calc.js`, `js/obligations-calc.js`) have matching `*-calc-tests.html` pages (`goals-calc-tests.html`, `obligations-calc-tests.html`) that load the module and assert against it in an actual browser — open the file directly (e.g. `http://localhost:8000/goals-calc-tests.html`) and check pass/fail on the page. Follow this same pattern for any new pure-calc module.

**Lint/format**: none configured — no ESLint/Prettier config in the repo. Match the surrounding file's style (no semicolons-optional inconsistency, `var` not `let`/`const` in most page scripts, 2-space indent).

## Architecture

### Every page is a self-contained HTML file — there is no shared template

Each `*.html` file in the repo root has its own inline `<style>` and `<script>`, including its own copy of the sidebar/topbar markup. **There is no shared header/footer include and no build step to generate one.** Changing the sidebar nav, the logo, or the topbar means grep-ing for every page that shares that header family and patching each one individually (adjust `href` prefixes per page depth, e.g. `split/*.html` and `calculator/*.html` use `../` back to the root). `README.md` calls this out explicitly; treat it as the #1 gotcha in this codebase.

Marketing pages (`index.html`, `services.html`, `pricing.html`, `resources.html`) and `calculator/*.html` share a *different* header/footer than the logged-in app pages — keep those two families separate when patching.

### Sidebar structure (app pages)

Five pillar sections, in order: **Wealth** → **Cash Flow** → **Protection** → **Family & Health** → **More**. "Monthly CashFlow" groups Monthly Expenses + Daily Expense Capture + Income; Net Worth covers everything else financial (no Income). If you add a nav item, place it under the right pillar and update every page's copy of the sidebar.

### Backend: Supabase, RLS-scoped per user

`js/supabase-client.js` creates the one shared client and exports `requireAuth(loginPath)` — call it at the top of every page that needs a signed-in user. It is the **single choke point** for the signup-approval gate: a new account starts as `profiles.status = 'pending'`, and `requireAuth()` redirects anyone not `'approved'` to `pending-approval.html` no matter which page they hit first. Admin (`admin@enrichme.app`) approves/rejects via `admin-dashboard.html`, which calls the `admin-users` edge function (needs the service-role key, never exposed client-side). Don't duplicate this approval check elsewhere — extend `requireAuth()` instead.

Every table is scoped to `auth.uid()` via Row Level Security — there is no app-level access control beyond RLS policies defined in `supabase-schema.sql`. When adding a table, add matching `select/insert/update/delete` policies in the same migration.

**RLS gotcha learned the hard way** (SplitExpenses): a self-referencing `SELECT` policy combined with `INSERT ... RETURNING` can fail with an RLS-looking error that's actually a *timing* issue — Postgres evaluates the SELECT policy against the row an INSERT just created, and a `security definer` function with a self-referencing subquery doesn't reliably see that new row in the same statement. Fix pattern: add a second, non-subquery permissive policy (e.g. `created_by = auth.uid()`) alongside the subquery-based one — see `split_groups_select_own_created` next to `split_groups_select_member` in `supabase-schema.sql`, and the `is_split_group_member()` security-definer helper it depends on.

### `supabase-schema.sql` is the only source of truth for the DB

One large file, organized in commented sections (`-- ── Feature name ──`) — read the comment above a table before changing it, they explain *why* the shape is what it is (a lot of tables replaced earlier, differently-shaped tables; the comments record that history so you don't re-break it). New migrations are appended as `alter table ... add column if not exists` / `drop policy if exists` + `create policy` pairs rather than editing the original `create table` in place, so the file stays safe to re-run against a database that already has data. Follow that convention for any schema change — never assume you can `drop table` or rewrite a constraint in place.

### The expense-grid pattern: one shared table triple, many pages

`expense_groups` → `expense_items` → `expense_grid` is a shared, spreadsheet-style (grouped categories × months) table set that powers **four different pages** — `expenses.html`, `income.html`, `loans.html`, `bank-balances.html` — distinguished only by an `expense_grid.section` column (`'expenses' | 'income' | 'loans' | 'bank'`). `expense_grid.is_seed` marks auto-generated sample rows so real user input can be told apart from placeholder data. If you touch this pattern, check all four pages, not just the one you're editing.

### SplitExpenses (`split/`) is the one genuinely multi-user feature

Every other table in this app is one-row(s)-per-`auth.uid()`; `split/*` is different — a group's rows must be visible to every member, not just the creator, and members can be "shadow" entries (name/email only, no account yet) that get linked to a real `auth.uid()` later. Key pieces:
- `split/shared.js` — pure, dependency-free functions (`computeGroupBalances`, `simplifyDebts`, `computeEqualShares`) used by both `split/dashboard.html` and `split/group.html`; keep balance math here, not duplicated inline.
- Invite links (`split/join.html?group=<uuid>`) work because the group's own UUID is treated as an unguessable secret — no separate invite-code table. Joining calls `find`-or-`create`/claim logic so a shadow member gets *linked*, never duplicated (a double-submit or a slow response used to create duplicate `split_expense_shares` rows — every async save button in `split/*` now disables itself for the duration of its own request specifically to prevent this class of bug; keep that pattern for any new save action there).
- A "direct" 1:1 expense (no named group) is implemented as a hidden `split_groups` row (`is_direct = true`) rather than a nullable `group_id` — it reuses every existing balance/RLS/settle-up code path instead of a parallel data model.
- `category = 'advance'` on `split_expenses` is a personal loan/prepayment, deliberately excluded from splitting and from every balance calculation (`computeGroupBalances` skips it) — it's logged for the record but never generates `split_expense_shares` rows.

### Client-side E2E encryption (Document Vault)

`vault-*.html` pages use real AES-256-GCM encryption performed in the browser before anything reaches Supabase Storage — there is **no server-side key and no recovery path** if a user loses their key. Don't add a "reset/recover" flow that would require storing the key server-side; that would break the security model.

### Design system

The current visual language (rolled out from `index.html`, apply to any page you materially touch — not a drive-by repaint of untouched pages) is a light, warm-gray palette with one red accent, defined as CSS custom properties per page (`--bg`, `--bg-alt`, `--ink`, `--ink-soft`, `--ink-faint`, `--border`, `--accent`, `--accent-dark`, `--accent-tint`, `--black`/`--black-hover`) — copy the exact values from `index.html`'s `:root`, don't approximate. Primary buttons are solid-black fully-rounded pills; secondary buttons are the same shape outlined. Semantic green/red for financial amounts (owed/owing, positive/negative) is kept regardless of the brand accent — that's a money-app legibility convention, not brand decoration.

Icons are inlined Tabler Icons SVGs (outline variant) fetched per-symbol from `unpkg.com/@tabler/icons@latest/icons/outline/{name}.svg`, stripped of `xmlns`/`width`/`height`/the bounding-box path, wrapped in a `viewBox="0 0 24 24"` template with `stroke="currentColor"` — never hand-draw icon paths, and reuse an existing icon for a repeated concept rather than picking a new one (see the mapping table in `.claude/skills/enrichme-locale/SKILL.md`).

### Locale: India only, and no em dashes

Currency is always ₹/INR; no working multi-country/currency switcher (the nav's language selector is decorative). Product copy — anything a user reads, not code comments — never uses em dashes (—); use `" - "` or restructure the sentence instead. Full detail in `.claude/skills/enrichme-locale/SKILL.md`, which is a loadable skill, not just a doc — load it before touching any user-facing page.

### Edge functions

`supabase/functions/_shared/mailgun.ts` is the one place that knows how to send email (Mailgun HTTP API) — `notify-signup-request` and `admin-users` both import `sendMail`/`escapeHtml` from it rather than duplicating the fetch call. Add new transactional email through this shared module, not a new one-off implementation.

### `.claude/skills/`

Project-scoped skills (installed manually here since `/plugin` isn't supported in this environment): `enrichme-locale` (locale/style rules above), `design-taste-frontend`, `ui-ux-pro-max` (design-system search tooling, runnable via its `scripts/search.py`). Load the relevant skill before frontend work rather than re-deriving these conventions from scratch.
