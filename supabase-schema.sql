-- EnrichMe database schema
-- Run this once in the Supabase SQL Editor (Project → SQL Editor → New query).
-- Every table is scoped to auth.uid() via Row Level Security, so each user
-- only ever sees and modifies their own rows.

-- ── Net Worth: accounts (bank/cash, investments, liabilities) ──
create table if not exists accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null,
  type text not null check (type in ('asset', 'investment', 'liability')),
  balance numeric not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table accounts enable row level security;

create policy "accounts_select_own" on accounts for select using (auth.uid() = user_id);
create policy "accounts_insert_own" on accounts for insert with check (auth.uid() = user_id);
create policy "accounts_update_own" on accounts for update using (auth.uid() = user_id);
create policy "accounts_delete_own" on accounts for delete using (auth.uid() = user_id);

-- net-worth.html now calculates real investments live from Stocks/MF, Gold +
-- Commodities, Government Scheme and Properties, so the manual "investment"
-- account type here is folded into "asset" — this table is just a catch-all
-- for anything not covered by a dedicated section (cash in hand, a vehicle,
-- a personal loan with a bank, etc).
update accounts set type = 'asset' where type = 'investment';
alter table accounts drop constraint if exists accounts_type_check;
alter table accounts add constraint accounts_type_check check (type in ('asset', 'liability'));

-- ── Net Worth: monthly snapshots, powers the trend chart ──
create table if not exists networth_snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  month text not null, -- 'YYYY-MM'
  total numeric not null,
  created_at timestamptz not null default now(),
  unique (user_id, month)
);

alter table networth_snapshots enable row level security;

create policy "networth_snapshots_select_own" on networth_snapshots for select using (auth.uid() = user_id);
create policy "networth_snapshots_insert_own" on networth_snapshots for insert with check (auth.uid() = user_id);
create policy "networth_snapshots_update_own" on networth_snapshots for update using (auth.uid() = user_id);
create policy "networth_snapshots_delete_own" on networth_snapshots for delete using (auth.uid() = user_id);

-- ── Budgeting: transactions ──
create table if not exists transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  date date not null,
  description text not null,
  merchant text,
  category text not null,
  account text not null,
  type text not null check (type in ('income', 'expense')),
  amount numeric not null,
  created_at timestamptz not null default now()
);

alter table transactions enable row level security;

create policy "transactions_select_own" on transactions for select using (auth.uid() = user_id);
create policy "transactions_insert_own" on transactions for insert with check (auth.uid() = user_id);
create policy "transactions_update_own" on transactions for update using (auth.uid() = user_id);
create policy "transactions_delete_own" on transactions for delete using (auth.uid() = user_id);

-- Daily Expense Capture (expense-quick-add.html, expense-daily-view.html):
-- this table already existed but was unused by any page — this feature is
-- its first real reader/writer. "owner" is the same plain text tag used on
-- goals (self/spouse/joint/child/other), not a foreign key, since EnrichMe
-- has no household-members entity outside FinSplit's separate multi-user
-- model. "account" doubles as payment method (e.g. "HDFC Credit Card",
-- "Cash") — free text, autocompleted client-side from recent entries
-- rather than a fixed list. "category" gets a fixed list here since
-- money-required.html's categories are free-text group names the user
-- defines themselves, not an app-wide enum to reuse.
alter table transactions add column if not exists owner text not null default 'self' check (owner in ('self','spouse','joint','child','other'));

alter table transactions drop constraint if exists transactions_category_check;
alter table transactions add constraint transactions_category_check
  check (category in ('food','groceries','transport','utilities','rent','shopping','entertainment','health','bills','travel','education','other'));

-- ── Budgeting: monthly budget per category ──
create table if not exists budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  category text not null,
  amount numeric not null default 0,
  updated_at timestamptz not null default now(),
  unique (user_id, category)
);

alter table budgets enable row level security;

create policy "budgets_select_own" on budgets for select using (auth.uid() = user_id);
create policy "budgets_insert_own" on budgets for insert with check (auth.uid() = user_id);
create policy "budgets_update_own" on budgets for update using (auth.uid() = user_id);
create policy "budgets_delete_own" on budgets for delete using (auth.uid() = user_id);

-- ── Budgeting grid: grouped categories, each with editable named line  ──
-- ── items, each with amounts per month, spreadsheet-style. One shared  ──
-- ── set of tables powers four pages via the "section" column:          ──
-- ──   expenses.html → section 'expenses'                               ──
-- ──   income.html   → section 'income'                                 ──
-- ──   loans.html    → section 'loans'  (Loan / EMI)                    ──
-- ──   bank-balances.html → section 'bank'                              ──
-- ── Supersedes the earlier flat expense_grid(category, month) shape —  ──
-- ── if you already ran that version, drop it first (next line) so the ──
-- ── new item-based expense_grid can be created cleanly. This deletes  ──
-- ── anything you'd already entered on the old Expenses page.          ──
drop table if exists expense_grid;

create table if not exists expense_groups (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  section text not null default 'expenses' check (section in ('expenses', 'income', 'loans', 'bank')),
  name text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

-- If you already ran an earlier version of this file (before the "section"
-- column existed), this backfills it harmlessly on every table that's
-- missing it — safe to re-run.
alter table expense_groups add column if not exists section text not null default 'expenses';

alter table expense_groups enable row level security;

create policy "expense_groups_select_own" on expense_groups for select using (auth.uid() = user_id);
create policy "expense_groups_insert_own" on expense_groups for insert with check (auth.uid() = user_id);
create policy "expense_groups_update_own" on expense_groups for update using (auth.uid() = user_id);
create policy "expense_groups_delete_own" on expense_groups for delete using (auth.uid() = user_id);

create table if not exists expense_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  group_id uuid not null references expense_groups (id) on delete cascade,
  name text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

alter table expense_items enable row level security;

create policy "expense_items_select_own" on expense_items for select using (auth.uid() = user_id);
create policy "expense_items_insert_own" on expense_items for insert with check (auth.uid() = user_id);
create policy "expense_items_update_own" on expense_items for update using (auth.uid() = user_id);
create policy "expense_items_delete_own" on expense_items for delete using (auth.uid() = user_id);

create table if not exists expense_grid (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  item_id uuid not null references expense_items (id) on delete cascade,
  month text not null, -- 'YYYY-MM'
  amount numeric not null default 0,
  updated_at timestamptz not null default now(),
  unique (user_id, item_id, month)
);

alter table expense_grid enable row level security;

create policy "expense_grid_select_own" on expense_grid for select using (auth.uid() = user_id);
create policy "expense_grid_insert_own" on expense_grid for insert with check (auth.uid() = user_id);
create policy "expense_grid_update_own" on expense_grid for update using (auth.uid() = user_id);
create policy "expense_grid_delete_own" on expense_grid for delete using (auth.uid() = user_id);

-- ── Loan / EMI: the calculator inputs behind each loan line item (principal, ──
-- ── rate, tenure) — expense_grid only stores the resulting monthly amount,   ──
-- ── this is what powers the "Loan Details" summary table on loans.html.      ──
create table if not exists loan_details (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  item_id uuid not null references expense_items (id) on delete cascade,
  principal numeric not null,
  rate_pct numeric not null,
  tenure_years numeric not null,
  monthly_emi numeric not null,
  created_at timestamptz not null default now(),
  unique (user_id, item_id)
);

alter table loan_details enable row level security;

create policy "loan_details_select_own" on loan_details for select using (auth.uid() = user_id);
create policy "loan_details_insert_own" on loan_details for insert with check (auth.uid() = user_id);
create policy "loan_details_update_own" on loan_details for update using (auth.uid() = user_id);
create policy "loan_details_delete_own" on loan_details for delete using (auth.uid() = user_id);

-- ── Investments: split out of Bank Balances into its own section ('investments') ──
-- ── — Stocks/MF/Gold move separately from cash accounts, powers investments.html ──
alter table expense_groups drop constraint if exists expense_groups_section_check;
alter table expense_groups add constraint expense_groups_section_check
  check (section in ('expenses', 'income', 'loans', 'bank', 'investments'));

-- Moves the old "Investment & Other Accounts" group (previously seeded under
-- Bank Balances) over to the new Investments page, keeping its data intact.
update expense_groups set section = 'investments'
  where section = 'bank' and name = 'Investment & Other Accounts';

-- Investments tracks two numbers per cell (invested vs current value, with %
-- computed from the two) instead of one — this adds the second number
-- alongside the existing "amount" column (used as "invested" on this page).
alter table expense_grid add column if not exists current_value numeric not null default 0;

-- Distinguishes starter/sample rows written by each page's one-time
-- ensureDefaults() seeding from amounts an actual user typed in. Needed
-- because "a row exists" or even "amount > 0" is not a reliable signal that
-- someone has entered real data - every one of expenses/income/loans/bank/
-- portfolio auto-seeds nonzero sample rows the first time its page is
-- visited. Powers the FIRE Readiness checklist (js/fire-readiness.js): a
-- section only counts as "complete" once it has at least one non-seed cell.
-- Every write path that represents a genuine user action (manual cell edit,
-- copy month forward, clear month, loan-detail edits) explicitly sets this
-- to false, "graduating" that cell even if it started out seeded.
alter table expense_grid add column if not exists is_seed boolean not null default false;

-- ── Loan / EMI: lump-sum prepayments (partial closures) against a loan.     ──
-- ── Each one reduces that loan's outstanding principal directly, on top of ──
-- ── whatever's already been paid via the normal monthly EMI grid — powers  ──
-- ── the "Paid So Far / Outstanding / Months Remaining" columns on          ──
-- ── loans.html's Loan Details table.                                       ──
create table if not exists loan_prepayments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  item_id uuid not null references expense_items (id) on delete cascade,
  amount numeric not null,
  paid_on date not null default current_date,
  created_at timestamptz not null default now()
);

alter table loan_prepayments enable row level security;

create policy "loan_prepayments_select_own" on loan_prepayments for select using (auth.uid() = user_id);
create policy "loan_prepayments_insert_own" on loan_prepayments for insert with check (auth.uid() = user_id);
create policy "loan_prepayments_update_own" on loan_prepayments for update using (auth.uid() = user_id);
create policy "loan_prepayments_delete_own" on loan_prepayments for delete using (auth.uid() = user_id);

-- ── Investments: Gold, Property and Government Schemes — a flat table, not ──
-- ── a monthly grid, since these assets are bought once and revalued rarely ──
-- ── (unlike Stocks/MF/Crypto which stay on the monthly grid). Powers the    ──
-- ── "Other Investments" table on investments.html.                         ──
create table if not exists other_investments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  category text not null check (category in ('Gold', 'Property', 'Government Scheme')),
  name text not null,
  invested numeric not null default 0,
  current_value numeric not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table other_investments enable row level security;

create policy "other_investments_select_own" on other_investments for select using (auth.uid() = user_id);
create policy "other_investments_insert_own" on other_investments for insert with check (auth.uid() = user_id);
create policy "other_investments_update_own" on other_investments for update using (auth.uid() = user_id);
create policy "other_investments_delete_own" on other_investments for delete using (auth.uid() = user_id);

-- ── Net Worth split into dedicated pages: Portfolio, Crypto, Bonds,        ──
-- ── Commodities, Pensions & Funds, Properties, Personal Debt — replaces   ──
-- ── the single investments.html page. Portfolio/Crypto stay on the       ──
-- ── monthly grid (expense_groups/items/grid, new "section" values);      ──
-- ── Bonds/Commodities/Pensions & Funds/Properties reuse other_investments ──
-- ── as a flat snapshot table, just with a broader set of categories.     ──
alter table expense_groups drop constraint if exists expense_groups_section_check;
alter table expense_groups add constraint expense_groups_section_check
  check (section in ('expenses', 'income', 'loans', 'bank', 'investments', 'portfolio', 'crypto'));

alter table other_investments drop constraint if exists other_investments_category_check;
alter table other_investments add constraint other_investments_category_check
  check (category in ('Bonds', 'Investment in Government', 'Commodities', 'Pensions & Funds', 'Properties', 'Gold', 'Property', 'Government Scheme'));

-- Renames the old category values (from when this table only covered Gold /
-- Property / Government Scheme) to their new dedicated-page equivalents.
update other_investments set category = 'Commodities' where category = 'Gold';
update other_investments set category = 'Properties' where category = 'Property';

-- bonds.html has since been renamed twice: Bonds -> Investment in Government
-- -> Government Scheme (its current, live category). Moves any existing
-- entries over each time. The Pensions & Funds page/section was removed
-- outright (no replacement page), so its rows are intentionally left as-is,
-- untouched — this is also why the old "Government Scheme -> Pensions &
-- Funds" migration that used to live here has been removed: bonds.html now
-- writes fresh rows as 'Government Scheme', and re-running that migration
-- would have silently orphaned them on every future run of this script.
update other_investments set category = 'Government Scheme' where category in ('Bonds', 'Investment in Government');

-- ── Personal Debt & Receivable: merged — one table for both directions.   ──
-- ── "category" holds a debt_type value when direction='i_owe', or a       ──
-- ── receivable_type value when direction='owed_to_me'; validated in the   ──
-- ── app (the two sets overlap on 'family_friends'/'other') rather than a  ──
-- ── DB check, since the valid set depends on direction. Powers            ──
-- ── personal-debt.html. Replaces the earlier separate debts/receivables   ──
-- ── tables (and, before those, the original bidirectional personal_debts  ──
-- ── table) — full circle back to one table, this time with both an       ──
-- ── explicit direction and per-direction categories.                     ──
drop table if exists personal_debts;

create table if not exists personal_ious (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null,
  direction text not null check (direction in ('i_owe', 'owed_to_me')),
  category text not null default 'other',
  entry_date date,
  balance numeric not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table personal_ious enable row level security;

create policy "personal_ious_select_own" on personal_ious for select using (auth.uid() = user_id);
create policy "personal_ious_insert_own" on personal_ious for insert with check (auth.uid() = user_id);
create policy "personal_ious_update_own" on personal_ious for update using (auth.uid() = user_id);
create policy "personal_ious_delete_own" on personal_ious for delete using (auth.uid() = user_id);

-- One-time data migration from the old debts/receivables tables, guarded so
-- it only runs while those tables still exist (safe to re-run — after the
-- first run they're dropped below, so the IF EXISTS checks skip it).
do $$
begin
  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'debts') then
    insert into personal_ious (user_id, name, direction, category, entry_date, balance, created_at, updated_at)
    select user_id, name, 'i_owe', debt_type, borrowed_on, balance, created_at, updated_at from debts;
  end if;

  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'receivables') then
    insert into personal_ious (user_id, name, direction, category, entry_date, balance, created_at, updated_at)
    select user_id, name, 'owed_to_me', receivable_type, lent_on, balance, created_at, updated_at from receivables;
  end if;
end $$;

drop table if exists debts;
drop table if exists receivables;

-- ── Properties: full real-estate tracking — property type, mortgage,      ──
-- ── rental income and monthly expenses, superseding the flat "Properties" ──
-- ── category on other_investments (which only had name/invested/current). ──
create table if not exists properties (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null,
  property_type text not null default 'other' check (property_type in ('apartment', 'house', 'land', 'commercial', 'garage_parking', 'other')),
  current_value numeric not null default 0,
  is_primary boolean not null default false,
  has_mortgage boolean not null default false,
  mortgage_balance numeric not null default 0,
  mortgage_emi numeric not null default 0,
  monthly_rental_income numeric not null default 0,
  monthly_expenses numeric not null default 0,
  registered_name text,
  city text,
  purchase_month text, -- 'YYYY-MM', month/year only — no day
  purchase_price numeric not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Backfills the fields above onto any properties table created before this
-- addition — safe to re-run. purchase_date (day-precision) is dropped in
-- favor of purchase_month (month/year only, matches the "Purchase Date"
-- field which is now a month picker).
alter table properties add column if not exists registered_name text;
alter table properties add column if not exists city text;
alter table properties drop column if exists purchase_date;
alter table properties add column if not exists purchase_month text;
alter table properties add column if not exists purchase_price numeric not null default 0;

alter table properties enable row level security;

create policy "properties_select_own" on properties for select using (auth.uid() = user_id);
create policy "properties_insert_own" on properties for insert with check (auth.uid() = user_id);
create policy "properties_update_own" on properties for update using (auth.uid() = user_id);
create policy "properties_delete_own" on properties for delete using (auth.uid() = user_id);

-- "Record Value" was removed from properties.html, so the per-property
-- valuation log it powered is no longer needed.
drop table if exists property_valuations;

-- ── Gold + Commodities: tracked by weight, not just rupees — grams ×      ──
-- ── today's rate/gram gives the current value, compared against what was ──
-- ── actually paid to show gain/loss. Absorbed the standalone Commodities ──
-- ── page (removed) as silver/platinum types below. Powers gold.html.     ──
create table if not exists gold_holdings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null,
  gold_type text not null default 'other' check (gold_type in ('jewellery', 'coins', 'bars', 'digital_gold', 'sgb', 'silver', 'platinum', 'other')),
  purity text not null default 'other' check (purity in ('24k', '22k', '18k', 'other')),
  grams numeric not null default 0,
  purchase_price numeric not null default 0,
  current_rate_per_gram numeric,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Backfills the widened gold_type constraint onto any gold_holdings table
-- created before this change — safe to re-run.
alter table gold_holdings drop constraint if exists gold_holdings_gold_type_check;
alter table gold_holdings add constraint gold_holdings_gold_type_check
  check (gold_type in ('jewellery', 'coins', 'bars', 'digital_gold', 'sgb', 'silver', 'platinum', 'other'));

alter table gold_holdings enable row level security;

create policy "gold_holdings_select_own" on gold_holdings for select using (auth.uid() = user_id);
create policy "gold_holdings_insert_own" on gold_holdings for insert with check (auth.uid() = user_id);
create policy "gold_holdings_update_own" on gold_holdings for update using (auth.uid() = user_id);
create policy "gold_holdings_delete_own" on gold_holdings for delete using (auth.uid() = user_id);

-- ── FIRE Plan: the calculator's slider inputs (age, target FIRE age, life ──
-- ── expectancy, inflation, corpus, monthly investment, return rates) —   ──
-- ── one row per user, so they persist across visits instead of resetting ──
-- ── to hardcoded defaults every time the page loads. Powers fire-plan.html. ──
create table if not exists fire_plan_inputs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade unique,
  monthly_expenses numeric not null default 100000,
  age numeric not null default 30,
  fire_age numeric not null default 50,
  life_expectancy numeric not null default 85,
  inflation_pct numeric not null default 7,
  corpus numeric not null default 500000,
  monthly_saving numeric not null default 25000,
  roi_pct numeric not null default 12,
  post_roi_pct numeric not null default 8,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table fire_plan_inputs enable row level security;

create policy "fire_plan_inputs_select_own" on fire_plan_inputs for select using (auth.uid() = user_id);
create policy "fire_plan_inputs_insert_own" on fire_plan_inputs for insert with check (auth.uid() = user_id);
create policy "fire_plan_inputs_update_own" on fire_plan_inputs for update using (auth.uid() = user_id);
create policy "fire_plan_inputs_delete_own" on fire_plan_inputs for delete using (auth.uid() = user_id);

-- ── Health: Life Expectancy Calculator answers — one row per user, so     ──
-- ── they persist across visits instead of resetting to defaults every    ──
-- ── time the page loads. Powers life-expectancy.html.                    ──
create table if not exists health_inputs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade unique,
  sex text not null default 'male' check (sex in ('male','female')),
  age numeric not null default 30,
  smoking_status text not null default 'never' check (smoking_status in ('never','former','current')),
  cigarettes_per_day numeric not null default 10,
  years_smoked numeric not null default 5,
  years_quit numeric not null default 5,
  alcohol text not null default 'occasional' check (alcohol in ('never','occasional','regular','heavy')),
  fruit_veg_servings text not null default '1-2' check (fruit_veg_servings in ('0','1-2','3-4','5+')),
  junk_food text not null default 'few_times' check (junk_food in ('rarely','few_times','daily')),
  exercise_days text not null default '1-2' check (exercise_days in ('0','1-2','3-4','5-7')),
  activity_level text not null default 'light' check (activity_level in ('sedentary','light','moderate','vigorous')),
  height_cm numeric not null default 170,
  weight_kg numeric not null default 70,
  sleep_hours text not null default '7-8' check (sleep_hours in ('lt5','5-6','7-8','9plus')),
  stress_level text not null default 'moderate' check (stress_level in ('low','moderate','high')),
  social_connection text not null default 'moderate' check (social_connection in ('strong','moderate','isolated','lonely')),
  conditions text[] not null default '{}',
  checkup_frequency text not null default 'occasionally' check (checkup_frequency in ('yearly','occasionally','rarely')),
  seatbelt_habit text not null default 'always' check (seatbelt_habit in ('always','sometimes','rarely')),
  living_area text not null default 'city' check (living_area in ('metro','city','town','village')),
  air_quality text not null default 'moderate' check (air_quality in ('good','moderate','poor','very_poor')),
  water_quality text not null default 'municipal' check (water_quality in ('purified','municipal','borewell','poor')),
  healthcare_access text not null default 'good' check (healthcare_access in ('excellent','good','limited','very_limited')),
  relationship_status text not null default 'married' check (relationship_status in ('married','single','divorced','widowed')),
  partner_support text not null default 'somewhat' check (partner_support in ('very','somewhat','not_very','conflict')),
  family_time text not null default 'weekly' check (family_time in ('daily','weekly','rarely')),
  intimacy_frequency text not null default 'skip' check (intimacy_frequency in ('rare','1-2','3-4','5plus','skip')),
  life_expectancy numeric,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Backfills the Environment and Family & Relationships columns above onto any
-- health_inputs table created before this addition — safe to re-run.
alter table health_inputs add column if not exists living_area text not null default 'city' check (living_area in ('metro','city','town','village'));
alter table health_inputs add column if not exists air_quality text not null default 'moderate' check (air_quality in ('good','moderate','poor','very_poor'));
alter table health_inputs add column if not exists water_quality text not null default 'municipal' check (water_quality in ('purified','municipal','borewell','poor'));
alter table health_inputs add column if not exists healthcare_access text not null default 'good' check (healthcare_access in ('excellent','good','limited','very_limited'));
alter table health_inputs add column if not exists relationship_status text not null default 'married' check (relationship_status in ('married','single','divorced','widowed'));
alter table health_inputs add column if not exists partner_support text not null default 'somewhat' check (partner_support in ('very','somewhat','not_very','conflict'));
alter table health_inputs add column if not exists family_time text not null default 'weekly' check (family_time in ('daily','weekly','rarely'));
alter table health_inputs add column if not exists intimacy_frequency text not null default 'skip' check (intimacy_frequency in ('rare','1-2','3-4','5plus','skip'));
-- Stores the calculator's computed result (not a raw answer), so other pages —
-- e.g. FIRE Plan's Life Expectancy field — can read a real number instead of
-- a guess. Backfills onto any health_inputs table created before this addition.
alter table health_inputs add column if not exists life_expectancy numeric;

-- Distinguishes a row the user actually filled in from the silent
-- defaults-only row life-expectancy.html's init() writes on a brand-new
-- account (every column here has a hardcoded default identical to the
-- page's initial JS state, so row existence and life_expectancy IS NOT NULL
-- are both true even when nobody has answered a single question). Only set
-- true by a genuine save from an actual answer change; the backfill save
-- deliberately leaves it at its default. Powers the FIRE Readiness
-- checklist (js/fire-readiness.js).
alter table health_inputs add column if not exists is_complete boolean not null default false;

-- Backfill: is_complete defaults to false for every row that already
-- existed when the column above was added - including genuine completions
-- from before this feature shipped, since there was no way to tell those
-- apart from the silent-defaults row until now. A row that was really
-- filled in differs from the hardcoded default tuple in at least one
-- field (a truly untouched row matches all of them, since that tuple is
-- exactly what life-expectancy.html's initial state - and its silent
-- backfill save - writes). Safe to re-run: only touches rows still false.
update health_inputs set is_complete = true
where is_complete = false
  and (
    sex <> 'male' or age <> 30
    or smoking_status <> 'never' or cigarettes_per_day <> 10 or years_smoked <> 5 or years_quit <> 5
    or alcohol <> 'occasional'
    or fruit_veg_servings <> '1-2' or junk_food <> 'few_times'
    or exercise_days <> '1-2' or activity_level <> 'light'
    or height_cm <> 170 or weight_kg <> 70
    or sleep_hours <> '7-8'
    or stress_level <> 'moderate' or social_connection <> 'moderate'
    or conditions <> '{}'
    or checkup_frequency <> 'occasionally' or seatbelt_habit <> 'always'
    or living_area <> 'city' or air_quality <> 'moderate' or water_quality <> 'municipal' or healthcare_access <> 'good'
    or relationship_status <> 'married' or partner_support <> 'somewhat' or family_time <> 'weekly' or intimacy_frequency <> 'skip'
  );

-- Belt-and-suspenders for the account holder specifically, in case any
-- answer genuinely happened to match every single default above. Safe to
-- re-run.
update health_inputs set is_complete = true
where user_id in (select id from profiles where email = 'str.balaji@gmail.com');

-- is_complete/the default-diff heuristic above answer "has this account
-- touched the questionnaire at all," which is fine for a yes/no gate but
-- breaks down as a *percentage*: it can't tell "genuinely selected the
-- default answer" (e.g. really is 30, really picked "moderate" stress)
-- apart from "never touched this question," so a user who legitimately
-- matches several defaults reads as incomplete forever. answered_cards
-- fixes that by recording which of the 12 question cards on
-- life-expectancy.html were actually interacted with (see
-- markCardAnswered() there) - a real, unambiguous signal instead of a
-- guess. Powers both the FIRE Readiness checklist and that page's own
-- per-category checklist.
alter table health_inputs add column if not exists answered_cards text[] not null default '{}';

-- One-time backfill for rows that predate this column: maps the same
-- default-diff heuristic onto specific cards instead of raw field count,
-- so old accounts start with a reasonable per-card list instead of an
-- empty one. "Existing Health Conditions" keeps the old ambiguity (an
-- empty list is a legitimate "no conditions" answer, not a sign of
-- skipping) - a much smaller blast radius than before, now that it's
-- one card out of twelve instead of one field out of twenty-five. Only
-- touches rows with no answered_cards yet; safe to re-run.
update health_inputs
set answered_cards = array_remove(ARRAY[
  case when (sex <> 'male' or age <> 30) then 'about_you' end,
  case when (smoking_status <> 'never' or cigarettes_per_day <> 10 or years_smoked <> 5 or years_quit <> 5) then 'smoking' end,
  case when alcohol <> 'occasional' then 'alcohol' end,
  case when (fruit_veg_servings <> '1-2' or junk_food <> 'few_times') then 'diet' end,
  case when (exercise_days <> '1-2' or activity_level <> 'light') then 'activity' end,
  case when (height_cm <> 170 or weight_kg <> 70) then 'weight' end,
  case when sleep_hours <> '7-8' then 'sleep' end,
  case when (stress_level <> 'moderate' or social_connection <> 'moderate') then 'mental' end,
  case when (relationship_status <> 'married' or partner_support <> 'somewhat' or family_time <> 'weekly' or intimacy_frequency <> 'skip') then 'family' end,
  case when coalesce(array_length(conditions, 1), 0) > 0 then 'conditions' end,
  case when (checkup_frequency <> 'occasionally' or seatbelt_habit <> 'always') then 'preventive' end,
  case when (living_area <> 'city' or air_quality <> 'moderate' or water_quality <> 'municipal' or healthcare_access <> 'good') then 'environment' end
], NULL)
where coalesce(array_length(answered_cards, 1), 0) = 0;

alter table health_inputs enable row level security;

drop policy if exists "health_inputs_select_own" on health_inputs;
drop policy if exists "health_inputs_insert_own" on health_inputs;
drop policy if exists "health_inputs_update_own" on health_inputs;
drop policy if exists "health_inputs_delete_own" on health_inputs;

create policy "health_inputs_select_own" on health_inputs for select using (auth.uid() = user_id);
create policy "health_inputs_insert_own" on health_inputs for insert with check (auth.uid() = user_id);
create policy "health_inputs_update_own" on health_inputs for update using (auth.uid() = user_id);
create policy "health_inputs_delete_own" on health_inputs for delete using (auth.uid() = user_id);

-- ── Health: Body Fat Calculator inputs — its own table (separate from      ──
-- ── health_inputs), so measurements and the weight-loss plan persist      ──
-- ── across visits instead of resetting to defaults every time the page    ──
-- ── loads. Powers body-fat-calculator.html.                               ──
create table if not exists body_fat_inputs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade unique,
  sex text not null default 'male' check (sex in ('male','female')),
  age numeric not null default 30,
  height_cm numeric not null default 170,
  weight_kg numeric not null default 70,
  neck_cm numeric not null default 38,
  waist_cm numeric not null default 85,
  hip_cm numeric not null default 95,
  target_weight_kg numeric not null default 65,
  activity_level text not null default 'light' check (activity_level in ('sedentary','light','moderate','vigorous')),
  daily_deficit_kcal numeric not null default 500,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table body_fat_inputs enable row level security;

drop policy if exists "body_fat_inputs_select_own" on body_fat_inputs;
drop policy if exists "body_fat_inputs_insert_own" on body_fat_inputs;
drop policy if exists "body_fat_inputs_update_own" on body_fat_inputs;
drop policy if exists "body_fat_inputs_delete_own" on body_fat_inputs;

create policy "body_fat_inputs_select_own" on body_fat_inputs for select using (auth.uid() = user_id);
create policy "body_fat_inputs_insert_own" on body_fat_inputs for insert with check (auth.uid() = user_id);
create policy "body_fat_inputs_update_own" on body_fat_inputs for update using (auth.uid() = user_id);
create policy "body_fat_inputs_delete_own" on body_fat_inputs for delete using (auth.uid() = user_id);

-- ── Astrology: Rashi/Nakshatra/Lagna Finder inputs — one row per user, so ──
-- ── birth details persist across visits. Purely for the tradition/        ──
-- ── entertainment feature on astrology.html; not used anywhere else.      ──
create table if not exists astrology_inputs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade unique,
  dob date,
  birth_time time,
  birth_city text,
  birth_lat numeric,
  birth_lon numeric,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table astrology_inputs enable row level security;

drop policy if exists "astrology_inputs_select_own" on astrology_inputs;
drop policy if exists "astrology_inputs_insert_own" on astrology_inputs;
drop policy if exists "astrology_inputs_update_own" on astrology_inputs;
drop policy if exists "astrology_inputs_delete_own" on astrology_inputs;

create policy "astrology_inputs_select_own" on astrology_inputs for select using (auth.uid() = user_id);
create policy "astrology_inputs_insert_own" on astrology_inputs for insert with check (auth.uid() = user_id);
create policy "astrology_inputs_update_own" on astrology_inputs for update using (auth.uid() = user_id);
create policy "astrology_inputs_delete_own" on astrology_inputs for delete using (auth.uid() = user_id);

-- ── FinSplit: group expense splitting (split/dashboard.html, split/group.html) ──
-- ── This is the one part of the schema that is genuinely multi-user —      ──
-- ── unlike every other table here (one row per auth.uid()), a group's      ──
-- ── rows must be visible to every member of that group, not just its       ──
-- ── creator. "Members" can be shadow entries with no account yet (just a   ──
-- ── name/email) — when someone signs up or logs in with a matching email,  ──
-- ── claimShadowMemberships() in split/dashboard.html links their user_id.  ──
-- group_type = who the group is (left rail in the "+ New Group" picker);
-- activity = what it's for (right-side chip, optional). Mirrors the
-- category-rail pattern used by goals/reminders add-forms.
create table if not exists split_groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_by uuid not null default auth.uid() references auth.users (id) on delete cascade,
  group_type text not null default 'friends' check (group_type in ('family', 'friends', 'colleagues', 'custom')),
  activity text check (activity is null or activity in ('trip', 'vacation', 'food', 'cafe', 'party', 'other')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists split_group_members (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references split_groups (id) on delete cascade,
  user_id uuid references auth.users (id) on delete set null,
  display_name text not null,
  email text,
  is_shadow boolean not null default true,
  added_by uuid not null default auth.uid() references auth.users (id),
  created_at timestamptz not null default now()
);

create table if not exists split_expenses (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references split_groups (id) on delete cascade,
  description text not null,
  amount numeric not null,
  category text not null default 'other' check (category in ('food','groceries','travel','utilities','rent','entertainment','shopping','other')),
  paid_by_member_id uuid not null references split_group_members (id),
  split_type text not null default 'equal' check (split_type in ('equal','exact')),
  expense_date date not null default current_date,
  created_by uuid not null default auth.uid() references auth.users (id),
  created_at timestamptz not null default now()
);

create table if not exists split_expense_shares (
  id uuid primary key default gen_random_uuid(),
  expense_id uuid not null references split_expenses (id) on delete cascade,
  member_id uuid not null references split_group_members (id),
  share_amount numeric not null
);

create table if not exists split_settlements (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references split_groups (id) on delete cascade,
  from_member_id uuid not null references split_group_members (id),
  to_member_id uuid not null references split_group_members (id),
  amount numeric not null,
  settled_date date not null default current_date,
  note text,
  created_by uuid not null default auth.uid() references auth.users (id),
  created_at timestamptz not null default now()
);

-- security definer + owned by the table owner so it bypasses RLS internally —
-- avoids a self-referencing RLS policy on split_group_members (which risks
-- recursive-looking policy definitions) by centralizing the membership check
-- in one trusted function instead.
create or replace function is_split_group_member(check_group_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from split_group_members
    where group_id = check_group_id and user_id = auth.uid()
  )
  or exists (
    select 1 from split_groups
    where id = check_group_id and created_by = auth.uid()
  );
$$;

alter table split_groups enable row level security;
alter table split_group_members enable row level security;
alter table split_expenses enable row level security;
alter table split_expense_shares enable row level security;
alter table split_settlements enable row level security;

drop policy if exists "split_groups_select_member" on split_groups;
drop policy if exists "split_groups_insert_own" on split_groups;
drop policy if exists "split_groups_update_member" on split_groups;
drop policy if exists "split_groups_delete_creator" on split_groups;
drop policy if exists "split_groups_select_own_created" on split_groups;

-- Two SELECT policies on purpose (permissive policies are OR'd together).
-- split_groups_select_member (via is_split_group_member) covers "I'm a
-- member of this group" and is fine for ordinary reads. But right after
-- INSERT ... RETURNING *, Postgres evaluates the SELECT policy against the
-- row this very statement just created — and is_split_group_member's
-- self-referencing subquery back into split_groups (from inside a `stable`
-- security-definer function) doesn't reliably see that brand-new row within
-- the same command, so `.insert().select()` intermittently failed with
-- "new row violates row-level security policy" even though the INSERT
-- itself was succeeding. split_groups_select_own_created is a plain,
-- non-subquery column comparison with no such self-reference, so it covers
-- "I created this group" without hitting that visibility-timing issue.
create policy "split_groups_select_member" on split_groups for select using (is_split_group_member(id));
create policy "split_groups_select_own_created" on split_groups for select using (auth.uid() = created_by);
create policy "split_groups_insert_own" on split_groups for insert with check (created_by = auth.uid());
create policy "split_groups_update_member" on split_groups for update using (is_split_group_member(id));
create policy "split_groups_delete_creator" on split_groups for delete using (created_by = auth.uid());

drop policy if exists "split_group_members_select_member" on split_group_members;
drop policy if exists "split_group_members_insert_member" on split_group_members;
drop policy if exists "split_group_members_update_member" on split_group_members;
drop policy if exists "split_group_members_claim_own_email" on split_group_members;
drop policy if exists "split_group_members_delete_member" on split_group_members;

create policy "split_group_members_select_member" on split_group_members for select using (is_split_group_member(group_id));
create policy "split_group_members_insert_member" on split_group_members for insert with check (is_split_group_member(group_id));
create policy "split_group_members_update_member" on split_group_members for update using (is_split_group_member(group_id));
-- Lets a user link a shadow (no-account) member row to their own account by
-- matching their verified login email — this is how claimShadowMemberships()
-- works. `with check` forces user_id to become their own, nothing else.
create policy "split_group_members_claim_own_email" on split_group_members for update
  using (email = (auth.jwt() ->> 'email') and user_id is null)
  with check (user_id = auth.uid());
create policy "split_group_members_delete_member" on split_group_members for delete using (is_split_group_member(group_id));

drop policy if exists "split_expenses_select_member" on split_expenses;
drop policy if exists "split_expenses_insert_member" on split_expenses;
drop policy if exists "split_expenses_update_member" on split_expenses;
drop policy if exists "split_expenses_delete_member" on split_expenses;

create policy "split_expenses_select_member" on split_expenses for select using (is_split_group_member(group_id));
create policy "split_expenses_insert_member" on split_expenses for insert with check (is_split_group_member(group_id));
create policy "split_expenses_update_member" on split_expenses for update using (is_split_group_member(group_id));
create policy "split_expenses_delete_member" on split_expenses for delete using (is_split_group_member(group_id));

drop policy if exists "split_expense_shares_select_member" on split_expense_shares;
drop policy if exists "split_expense_shares_insert_member" on split_expense_shares;
drop policy if exists "split_expense_shares_update_member" on split_expense_shares;
drop policy if exists "split_expense_shares_delete_member" on split_expense_shares;

create policy "split_expense_shares_select_member" on split_expense_shares for select using (
  exists (select 1 from split_expenses e where e.id = split_expense_shares.expense_id and is_split_group_member(e.group_id))
);
create policy "split_expense_shares_insert_member" on split_expense_shares for insert with check (
  exists (select 1 from split_expenses e where e.id = split_expense_shares.expense_id and is_split_group_member(e.group_id))
);
create policy "split_expense_shares_update_member" on split_expense_shares for update using (
  exists (select 1 from split_expenses e where e.id = split_expense_shares.expense_id and is_split_group_member(e.group_id))
);
create policy "split_expense_shares_delete_member" on split_expense_shares for delete using (
  exists (select 1 from split_expenses e where e.id = split_expense_shares.expense_id and is_split_group_member(e.group_id))
);

drop policy if exists "split_settlements_select_member" on split_settlements;
drop policy if exists "split_settlements_insert_member" on split_settlements;
drop policy if exists "split_settlements_update_member" on split_settlements;
drop policy if exists "split_settlements_delete_member" on split_settlements;

create policy "split_settlements_select_member" on split_settlements for select using (is_split_group_member(group_id));
create policy "split_settlements_insert_member" on split_settlements for insert with check (is_split_group_member(group_id));
create policy "split_settlements_update_member" on split_settlements for update using (is_split_group_member(group_id));
create policy "split_settlements_delete_member" on split_settlements for delete using (is_split_group_member(group_id));

-- Invite links (split/join.html): "Share Invite Link" on a group hands out
-- a URL containing nothing but the group's own uuid - there's no separate
-- invite-code table, the uuid itself (122 bits, practically unguessable)
-- is the secret, the same trust model any "anyone with the link can join"
-- feature uses. Two things a non-member needs that no existing policy
-- allows:
--
-- 1. A permissive INSERT policy letting a signed-in user add *themselves*
--    (not anyone else) to any group, regardless of prior membership -
--    RLS policies for the same command are OR'd together, so this simply
--    adds a second way in alongside split_group_members_insert_member's
--    "existing members can add others" rule, it doesn't loosen it.
drop policy if exists "split_group_members_self_join" on split_group_members;
create policy "split_group_members_self_join" on split_group_members for insert
  with check (user_id = auth.uid());

-- Belt-and-suspenders: without this, a double-click or revisiting an old
-- invite link race-inserts a second membership row for the same person,
-- double-counting them in every balance. NULL user_id (shadow members)
-- never conflicts with itself or anything else under a unique index.
create unique index if not exists split_group_members_group_user_uq
  on split_group_members (group_id, user_id) where user_id is not null;

-- 2. A way to preview *just* the group's name and member count before
--    joining ("You've been invited to join 'Goa Trip 2026' - 3 members"),
--    without a blanket "select any group" policy that would let every
--    signed-in user browse every group in the database (split_groups has
--    no such policy on purpose). security definer + a narrow return type
--    keeps this to "one named group, its name and a count" only - same
--    pattern as is_split_group_member() below it.
create or replace function get_group_preview_for_join(check_group_id uuid)
returns table(name text, member_count bigint)
language sql
security definer
set search_path = public
stable
as $$
  select g.name, (select count(*) from split_group_members m where m.group_id = g.id)
  from split_groups g
  where g.id = check_group_id;
$$;

-- ── MoneyOS: Tax Planning, Insurance Tracker, Goals Planner, Document       ──
-- ── Vault — four single-user features under one sidebar section. Powers    ──
-- ── moneyos-tax.html, moneyos-insurance.html, moneyos-goals.html and       ──
-- ── moneyos-vault.html.                                                    ──

-- Tax Planning: one row per user, same save/load pattern as fire_plan_inputs.
create table if not exists tax_planning_inputs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade unique,
  gross_income numeric not null default 1200000,
  deduction_80c numeric not null default 0,
  deduction_80d numeric not null default 0,
  deduction_nps numeric not null default 0,
  home_loan_interest numeric not null default 0,
  hra_exemption numeric not null default 0,
  other_deductions numeric not null default 0,
  senior_citizen_parents boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Rebuilt as a 3-step wizard (Basic details / Income details / Deduction) —
-- these carry the new per-head income and deduction fields. gross_income
-- and hra_exemption stay for backward compatibility but are no longer
-- written to; home_loan_interest and other_deductions are reused as-is.
alter table tax_planning_inputs add column if not exists age_group text not null default '0-60' check (age_group in ('0-60','60-80','80+'));
alter table tax_planning_inputs add column if not exists income_salary numeric not null default 0;
alter table tax_planning_inputs add column if not exists exempt_allowances numeric not null default 0;
alter table tax_planning_inputs add column if not exists income_interest numeric not null default 0;
alter table tax_planning_inputs add column if not exists rental_income numeric not null default 0;
alter table tax_planning_inputs add column if not exists home_loan_interest_letout numeric not null default 0;
alter table tax_planning_inputs add column if not exists income_digital_assets numeric not null default 0;
alter table tax_planning_inputs add column if not exists other_income numeric not null default 0;
alter table tax_planning_inputs add column if not exists deduction_80tta numeric not null default 0;
alter table tax_planning_inputs add column if not exists deduction_80g numeric not null default 0;
alter table tax_planning_inputs add column if not exists deduction_80eea numeric not null default 0;
alter table tax_planning_inputs add column if not exists deduction_80ccd2 numeric not null default 0;
alter table tax_planning_inputs add column if not exists deduction_80e numeric not null default 0;
alter table tax_planning_inputs add column if not exists hra_basic_salary numeric not null default 0;
alter table tax_planning_inputs add column if not exists hra_da numeric not null default 0;
alter table tax_planning_inputs add column if not exists hra_received numeric not null default 0;
alter table tax_planning_inputs add column if not exists hra_rent_paid numeric not null default 0;
alter table tax_planning_inputs add column if not exists hra_metro boolean not null default true;

alter table tax_planning_inputs enable row level security;

drop policy if exists "tax_planning_inputs_select_own" on tax_planning_inputs;
drop policy if exists "tax_planning_inputs_insert_own" on tax_planning_inputs;
drop policy if exists "tax_planning_inputs_update_own" on tax_planning_inputs;
drop policy if exists "tax_planning_inputs_delete_own" on tax_planning_inputs;

create policy "tax_planning_inputs_select_own" on tax_planning_inputs for select using (auth.uid() = user_id);
create policy "tax_planning_inputs_insert_own" on tax_planning_inputs for insert with check (auth.uid() = user_id);
create policy "tax_planning_inputs_update_own" on tax_planning_inputs for update using (auth.uid() = user_id);
create policy "tax_planning_inputs_delete_own" on tax_planning_inputs for delete using (auth.uid() = user_id);

-- Insurance Tracker: one row per policy.
create table if not exists insurance_policies (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  policy_type text not null check (policy_type in ('term','life','health','vehicle','home','other')),
  insurer text,
  policy_number text,
  sum_assured numeric not null default 0,
  premium_amount numeric not null default 0,
  premium_frequency text not null default 'yearly' check (premium_frequency in ('monthly','quarterly','half_yearly','yearly')),
  start_date date,
  renewal_date date,
  nominee_name text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table insurance_policies enable row level security;

drop policy if exists "insurance_policies_select_own" on insurance_policies;
drop policy if exists "insurance_policies_insert_own" on insurance_policies;
drop policy if exists "insurance_policies_update_own" on insurance_policies;
drop policy if exists "insurance_policies_delete_own" on insurance_policies;

create policy "insurance_policies_select_own" on insurance_policies for select using (auth.uid() = user_id);
create policy "insurance_policies_insert_own" on insurance_policies for insert with check (auth.uid() = user_id);
create policy "insurance_policies_update_own" on insurance_policies for update using (auth.uid() = user_id);
create policy "insurance_policies_delete_own" on insurance_policies for delete using (auth.uid() = user_id);

-- Coverage Calculator inputs (annual income, outstanding liabilities, liquid
-- assets) — one row per user, so they persist across visits instead of
-- resetting every time the page loads. Powers insurance-coverage-calculator.html.
create table if not exists insurance_calculator_inputs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade unique,
  annual_income numeric not null default 1000000,
  liabilities numeric not null default 0,
  liquid_assets numeric not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table insurance_calculator_inputs enable row level security;

drop policy if exists "insurance_calculator_inputs_select_own" on insurance_calculator_inputs;
drop policy if exists "insurance_calculator_inputs_insert_own" on insurance_calculator_inputs;
drop policy if exists "insurance_calculator_inputs_update_own" on insurance_calculator_inputs;
drop policy if exists "insurance_calculator_inputs_delete_own" on insurance_calculator_inputs;

create policy "insurance_calculator_inputs_select_own" on insurance_calculator_inputs for select using (auth.uid() = user_id);
create policy "insurance_calculator_inputs_insert_own" on insurance_calculator_inputs for insert with check (auth.uid() = user_id);
create policy "insurance_calculator_inputs_update_own" on insurance_calculator_inputs for update using (auth.uid() = user_id);
create policy "insurance_calculator_inputs_delete_own" on insurance_calculator_inputs for delete using (auth.uid() = user_id);

-- Goals Planner: one row per goal.
create table if not exists savings_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null,
  target_amount numeric not null,
  target_date date not null,
  current_saved numeric not null default 0,
  expected_return_pct numeric not null default 10,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table savings_goals enable row level security;

drop policy if exists "savings_goals_select_own" on savings_goals;
drop policy if exists "savings_goals_insert_own" on savings_goals;
drop policy if exists "savings_goals_update_own" on savings_goals;
drop policy if exists "savings_goals_delete_own" on savings_goals;

create policy "savings_goals_select_own" on savings_goals for select using (auth.uid() = user_id);
create policy "savings_goals_insert_own" on savings_goals for insert with check (auth.uid() = user_id);
create policy "savings_goals_update_own" on savings_goals for update using (auth.uid() = user_id);
create policy "savings_goals_delete_own" on savings_goals for delete using (auth.uid() = user_id);

-- Goal Based Savings v2 (fire-goals.html): supersedes the plain savings_goals
-- table above with the full product spec — category, owner, priority,
-- goal-specific inflation rate, and a contribution history log for
-- pace-based projections. "owner" is a plain text tag (self/spouse/joint/
-- child/other), not a foreign key to a real household-members table, since
-- EnrichMe has no Members entity outside FinSplit's separate multi-user
-- model. manual_current_value stands in for a linked-account value until
-- account linking (a future phase) connects goals to the real net-worth
-- tables (accounts, other_investments, expense_grid, gold_holdings,
-- properties) — those are five separate tables today, not one, so linking
-- needs its own design pass rather than being guessed at here.
create table if not exists goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null,
  category text not null default 'other' check (category in ('education','house','travel','car','wedding','emergency_fund','other')),
  owner text not null default 'self' check (owner in ('self','spouse','joint','child','other')),
  target_amount numeric not null,
  target_date date not null,
  priority text not null default 'medium' check (priority in ('high','medium','low')),
  expected_annual_return numeric not null default 10,
  goal_inflation_rate numeric not null default 6,
  manual_current_value numeric not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table goals enable row level security;

drop policy if exists "goals_select_own" on goals;
drop policy if exists "goals_insert_own" on goals;
drop policy if exists "goals_update_own" on goals;
drop policy if exists "goals_delete_own" on goals;

create policy "goals_select_own" on goals for select using (auth.uid() = user_id);
create policy "goals_insert_own" on goals for insert with check (auth.uid() = user_id);
create policy "goals_update_own" on goals for update using (auth.uid() = user_id);
create policy "goals_delete_own" on goals for delete using (auth.uid() = user_id);

-- One-time migration of any existing rows from the old savings_goals table.
-- Matched on (user_id, name, target_date) so this stays safe to re-run.
insert into goals (user_id, name, category, owner, target_amount, target_date, priority, expected_annual_return, goal_inflation_rate, manual_current_value, created_at, updated_at)
select sg.user_id, sg.name, 'other', 'self', sg.target_amount, sg.target_date, 'medium', sg.expected_return_pct, 6, sg.current_saved, sg.created_at, sg.updated_at
from savings_goals sg
where not exists (
  select 1 from goals g where g.user_id = sg.user_id and g.name = sg.name and g.target_date = sg.target_date
);

-- Contribution history log, used only to derive a pace-of-saving for
-- projected completion dates — it is not the source of truth for a goal's
-- current value (manual_current_value / future linked-account value is).
create table if not exists goal_contributions (
  id uuid primary key default gen_random_uuid(),
  goal_id uuid not null references goals (id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  amount numeric not null,
  contributed_at date not null default current_date,
  note text,
  created_at timestamptz not null default now()
);

alter table goal_contributions enable row level security;

drop policy if exists "goal_contributions_select_own" on goal_contributions;
drop policy if exists "goal_contributions_insert_own" on goal_contributions;
drop policy if exists "goal_contributions_update_own" on goal_contributions;
drop policy if exists "goal_contributions_delete_own" on goal_contributions;

create policy "goal_contributions_select_own" on goal_contributions for select using (auth.uid() = user_id);
create policy "goal_contributions_insert_own" on goal_contributions for insert with check (auth.uid() = user_id);
create policy "goal_contributions_update_own" on goal_contributions for update using (auth.uid() = user_id);
create policy "goal_contributions_delete_own" on goal_contributions for delete using (auth.uid() = user_id);

-- Goal account linking (Phase 3): EnrichMe has no single Accounts table, so
-- source_id is a polymorphic reference tagged by source_type rather than a
-- foreign key. The six source types cover every place an asset can live:
--   'account'          -> accounts (type = 'asset' only), value = balance
--   'other_investment' -> other_investments, value = current_value
--   'gold_holding'     -> gold_holdings, value = grams * current_rate_per_gram
--   'property'         -> properties, value = current_value (gross, pre-mortgage)
--   'portfolio_item'   -> expense_items in a group with section in
--                         ('portfolio','crypto'), value = latest month's
--                         current_value in expense_grid for that item
--   'bank_item'        -> expense_items in a group with section = 'bank',
--                         value = latest month's amount in expense_grid
--                         (bank-section grid rows don't use current_value)
-- The unique constraint enforces the v1 rule that an account can only be
-- linked to one goal at a time (see js/goal-links.js for the value lookups
-- and the account-picker filtering this depends on).
create table if not exists goal_links (
  id uuid primary key default gen_random_uuid(),
  goal_id uuid not null references goals (id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  source_type text not null check (source_type in ('account','other_investment','gold_holding','property','portfolio_item','bank_item')),
  source_id uuid not null,
  created_at timestamptz not null default now(),
  unique (source_type, source_id)
);

alter table goal_links enable row level security;

drop policy if exists "goal_links_select_own" on goal_links;
drop policy if exists "goal_links_insert_own" on goal_links;
drop policy if exists "goal_links_delete_own" on goal_links;

create policy "goal_links_select_own" on goal_links for select using (auth.uid() = user_id);
create policy "goal_links_insert_own" on goal_links for insert with check (auth.uid() = user_id);
create policy "goal_links_delete_own" on goal_links for delete using (auth.uid() = user_id);

-- Document Vault: files are encrypted client-side (AES-256-GCM) before
-- upload — this table only ever stores metadata (never file contents) and
-- a path into the private 'vault-documents' Storage bucket. Document Vault
-- was later pulled out from under MoneyOS into its own sidebar section with
-- 8 dedicated category pages (vault-bank-locker.html, vault-property.html,
-- vault-bonds.html, vault-government.html, vault-vehicle.html,
-- vault-education.html, vault-insurance.html, vault-legal.html) instead of
-- category tabs on one page — see the migration below for the category
-- rename this required.
create table if not exists vault_documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  category text not null check (category in ('bank_locker','property','bonds','government','vehicle','education','insurance','legal','other')),
  file_name text not null,
  storage_path text not null,
  expiry_date date,
  notes text,
  created_at timestamptz not null default now()
);

-- Migrates category values from the old single-page vault (pan/aadhaar/
-- insurance/property/will/other) to the new 8-category set — safe to
-- re-run, since rows already using the new values are left untouched.
update vault_documents set category = 'government' where category in ('pan', 'aadhaar');
update vault_documents set category = 'legal' where category = 'will';

alter table vault_documents drop constraint if exists vault_documents_category_check;
alter table vault_documents add constraint vault_documents_category_check
  check (category in ('bank_locker','property','bonds','government','vehicle','education','insurance','legal','other'));

alter table vault_documents enable row level security;

drop policy if exists "vault_documents_select_own" on vault_documents;
drop policy if exists "vault_documents_insert_own" on vault_documents;
drop policy if exists "vault_documents_update_own" on vault_documents;
drop policy if exists "vault_documents_delete_own" on vault_documents;

create policy "vault_documents_select_own" on vault_documents for select using (auth.uid() = user_id);
create policy "vault_documents_insert_own" on vault_documents for insert with check (auth.uid() = user_id);
create policy "vault_documents_update_own" on vault_documents for update using (auth.uid() = user_id);
create policy "vault_documents_delete_own" on vault_documents for delete using (auth.uid() = user_id);

-- Bank Locker registry — plain fields (bank/branch/nominee etc.), protected
-- by standard account-level RLS rather than client-side encryption; only
-- the optional attached files (category='bank_locker' in vault_documents
-- above) get full AES-256-GCM encryption. One row per locker.
create table if not exists bank_lockers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  bank_name text not null,
  branch text,
  locker_number text,
  annual_fee numeric not null default 0,
  nominee_name text,
  key_holder text,
  renewal_date date,
  access_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table bank_lockers enable row level security;

drop policy if exists "bank_lockers_select_own" on bank_lockers;
drop policy if exists "bank_lockers_insert_own" on bank_lockers;
drop policy if exists "bank_lockers_update_own" on bank_lockers;
drop policy if exists "bank_lockers_delete_own" on bank_lockers;

create policy "bank_lockers_select_own" on bank_lockers for select using (auth.uid() = user_id);
create policy "bank_lockers_insert_own" on bank_lockers for insert with check (auth.uid() = user_id);
create policy "bank_lockers_update_own" on bank_lockers for update using (auth.uid() = user_id);
create policy "bank_lockers_delete_own" on bank_lockers for delete using (auth.uid() = user_id);

-- Stores the PBKDF2 salt and an encrypted "known plaintext" verifier so the
-- app can confirm a re-entered vault passphrase is correct WITHOUT ever
-- storing the passphrase itself or the derived encryption key. One row per
-- user; if this row is lost, existing encrypted documents are unrecoverable
-- (by design — that's what real end-to-end encryption means).
create table if not exists vault_key_verifier (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade unique,
  salt text not null,
  verifier text not null,
  created_at timestamptz not null default now()
);

alter table vault_key_verifier enable row level security;

drop policy if exists "vault_key_verifier_select_own" on vault_key_verifier;
drop policy if exists "vault_key_verifier_insert_own" on vault_key_verifier;
drop policy if exists "vault_key_verifier_delete_own" on vault_key_verifier;

create policy "vault_key_verifier_select_own" on vault_key_verifier for select using (auth.uid() = user_id);
create policy "vault_key_verifier_insert_own" on vault_key_verifier for insert with check (auth.uid() = user_id);
create policy "vault_key_verifier_delete_own" on vault_key_verifier for delete using (auth.uid() = user_id);
-- Deliberately no update policy — the verifier is set once at vault setup.
-- Changing the passphrase would need a "delete verifier + re-encrypt every
-- existing document with a new key" flow, which isn't built yet; for now,
-- treat the vault passphrase as permanent.

-- Private Storage bucket for encrypted document blobs. Files are named
-- "{user_id}/{random-uuid}.enc" by the app, and RLS on storage.objects
-- restricts access to files under the current user's own folder.
insert into storage.buckets (id, name, public)
  values ('vault-documents', 'vault-documents', false)
  on conflict (id) do nothing;

drop policy if exists "vault_documents_storage_select_own" on storage.objects;
drop policy if exists "vault_documents_storage_insert_own" on storage.objects;
drop policy if exists "vault_documents_storage_delete_own" on storage.objects;

create policy "vault_documents_storage_select_own" on storage.objects for select using (
  bucket_id = 'vault-documents' and (storage.foldername(name))[1] = auth.uid()::text
);
create policy "vault_documents_storage_insert_own" on storage.objects for insert with check (
  bucket_id = 'vault-documents' and (storage.foldername(name))[1] = auth.uid()::text
);
create policy "vault_documents_storage_delete_own" on storage.objects for delete using (
  bucket_id = 'vault-documents' and (storage.foldername(name))[1] = auth.uid()::text
);

-- ── Obligations & Reminders (obligations.html, obligation-detail.html):    ──
-- ── shared due-date tracking infrastructure — insurance renewals, tax      ──
-- ── filing, vehicle service, subscriptions, warranties. "owner" is the     ──
-- ── same plain text tag used elsewhere (self/spouse/joint/child/other),    ──
-- ── not a Members foreign key. linked_source_type/linked_source_id is a    ──
-- ── polymorphic reference — the same six source types goal_links uses      ──
-- ── (account/other_investment/gold_holding/property/portfolio_item/        ──
-- ── bank_item), plus a seventh: 'insurance_policy', since insurance isn't  ──
-- ── a net-worth-bearing asset goals would ever link to, but obligations    ──
-- ── explicitly needs it (e.g. "car insurance renewal" linked to a policy). ──
-- ── Unlike goal_links, there is no uniqueness constraint — multiple        ──
-- ── obligations can legitimately point at the same asset (a car can have   ──
-- ── both an insurance renewal and a service obligation).                   ──
create table if not exists obligations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null,
  category text not null default 'other' check (category in ('insurance','tax','maintenance','warranty','document_renewal','subscription','medical','other')),
  owner text not null default 'self' check (owner in ('self','spouse','joint','child','other')),
  due_date date not null,
  recurrence text not null default 'none' check (recurrence in ('none','annual','custom_interval_days')),
  recurrence_interval_days integer,
  amount numeric,
  linked_source_type text check (linked_source_type in ('account','other_investment','gold_holding','property','portfolio_item','bank_item','insurance_policy')),
  linked_source_id uuid,
  last_completed_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint obligations_interval_required check (recurrence <> 'custom_interval_days' or recurrence_interval_days is not null)
);

-- Widens the category constraint for anyone who already ran the block
-- above before "medical" (e.g. checkups) was added as a first-class
-- category alongside insurance/tax/maintenance/etc — safe to re-run.
alter table obligations drop constraint if exists obligations_category_check;
alter table obligations add constraint obligations_category_check
  check (category in ('insurance','tax','maintenance','warranty','document_renewal','subscription','medical','other'));

alter table obligations enable row level security;

drop policy if exists "obligations_select_own" on obligations;
drop policy if exists "obligations_insert_own" on obligations;
drop policy if exists "obligations_update_own" on obligations;
drop policy if exists "obligations_delete_own" on obligations;

create policy "obligations_select_own" on obligations for select using (auth.uid() = user_id);
create policy "obligations_insert_own" on obligations for insert with check (auth.uid() = user_id);
create policy "obligations_update_own" on obligations for update using (auth.uid() = user_id);
create policy "obligations_delete_own" on obligations for delete using (auth.uid() = user_id);

-- Reminder windows: "notified" is bookkeeping only, flipped by a client-side
-- check on page load (this app has no server-side cron/scheduled-function
-- infrastructure) — it exists so a future push/email channel could consume
-- it without a schema change, but the live overdue/due_soon/upcoming status
-- shown in the UI never depends on it, only on due_date and days_before_due.
create table if not exists reminder_windows (
  id uuid primary key default gen_random_uuid(),
  obligation_id uuid not null references obligations (id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  days_before_due integer not null,
  notified boolean not null default false,
  created_at timestamptz not null default now()
);

alter table reminder_windows enable row level security;

drop policy if exists "reminder_windows_select_own" on reminder_windows;
drop policy if exists "reminder_windows_insert_own" on reminder_windows;
drop policy if exists "reminder_windows_update_own" on reminder_windows;
drop policy if exists "reminder_windows_delete_own" on reminder_windows;

create policy "reminder_windows_select_own" on reminder_windows for select using (auth.uid() = user_id);
create policy "reminder_windows_insert_own" on reminder_windows for insert with check (auth.uid() = user_id);
create policy "reminder_windows_update_own" on reminder_windows for update using (auth.uid() = user_id);
create policy "reminder_windows_delete_own" on reminder_windows for delete using (auth.uid() = user_id);

-- ── Family Medicine History & Vaccine Tracker (health-medicine-history.html,──
-- ── health-vaccine-tracker.html): a private recollection log of what        ──
-- ── medicine was used for which symptom, per family member, plus a          ──
-- ── separate child vaccination schedule. Deliberately isolated from every   ──
-- ── financial entity (transactions/accounts/obligations) — its own tables,  ──
-- ── its own pages, its own JS namespace (js/health-log/) — so a future      ──
-- ── per-member/per-user permission layer can gate this module without       ──
-- ── touching financial code. No effectiveness ratings, no cost/price        ──
-- ── fields, no pharmacy lookups — a family log, not a health platform.      ──

-- EnrichMe's existing "owner" tag elsewhere (self/spouse/joint/child/other,
-- see transactions/savings_goals/obligations) is a plain text tag, not a
-- real entity, and can't tell two children apart. This module needs to, so
-- it gets a real lightweight Member table instead of reusing that tag.
create table if not exists family_members (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null,
  relation text not null default 'child' check (relation in ('self','spouse','child','other')),
  created_at timestamptz not null default now()
);

alter table family_members enable row level security;

drop policy if exists "family_members_select_own" on family_members;
drop policy if exists "family_members_insert_own" on family_members;
drop policy if exists "family_members_update_own" on family_members;
drop policy if exists "family_members_delete_own" on family_members;

create policy "family_members_select_own" on family_members for select using (auth.uid() = user_id);
create policy "family_members_insert_own" on family_members for insert with check (auth.uid() = user_id);
create policy "family_members_update_own" on family_members for update using (auth.uid() = user_id);
create policy "family_members_delete_own" on family_members for delete using (auth.uid() = user_id);

-- One MedicalEvent per doctor visit / illness; can have multiple
-- PrescribedMedicine rows (a single visit often prescribes more than one).
create table if not exists medical_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  member_id uuid not null references family_members (id) on delete cascade,
  event_date date not null default current_date,
  symptom text not null,
  doctor_or_hospital text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table medical_events enable row level security;

drop policy if exists "medical_events_select_own" on medical_events;
drop policy if exists "medical_events_insert_own" on medical_events;
drop policy if exists "medical_events_update_own" on medical_events;
drop policy if exists "medical_events_delete_own" on medical_events;

create policy "medical_events_select_own" on medical_events for select using (auth.uid() = user_id);
create policy "medical_events_insert_own" on medical_events for insert with check (auth.uid() = user_id);
create policy "medical_events_update_own" on medical_events for update using (auth.uid() = user_id);
create policy "medical_events_delete_own" on medical_events for delete using (auth.uid() = user_id);

-- Child of medical_events, but carries its own user_id (denormalized,
-- default auth.uid()) rather than an RLS policy that joins through the
-- parent — same non-recursive pattern as loan_prepayments under
-- expense_items, kept simple on purpose.
create table if not exists prescribed_medicines (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  medical_event_id uuid not null references medical_events (id) on delete cascade,
  medicine_name text not null,
  dosage text,
  duration text,
  created_at timestamptz not null default now()
);

alter table prescribed_medicines enable row level security;

drop policy if exists "prescribed_medicines_select_own" on prescribed_medicines;
drop policy if exists "prescribed_medicines_insert_own" on prescribed_medicines;
drop policy if exists "prescribed_medicines_update_own" on prescribed_medicines;
drop policy if exists "prescribed_medicines_delete_own" on prescribed_medicines;

create policy "prescribed_medicines_select_own" on prescribed_medicines for select using (auth.uid() = user_id);
create policy "prescribed_medicines_insert_own" on prescribed_medicines for insert with check (auth.uid() = user_id);
create policy "prescribed_medicines_update_own" on prescribed_medicines for update using (auth.uid() = user_id);
create policy "prescribed_medicines_delete_own" on prescribed_medicines for delete using (auth.uid() = user_id);

-- Kept separate from medical_events since vaccines follow their own
-- schedule rather than being tied to an illness. member_id is expected to
-- typically be a child but isn't restricted to that.
create table if not exists vaccination_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  member_id uuid not null references family_members (id) on delete cascade,
  vaccine_name text not null,
  date_given date not null default current_date,
  next_due_date date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table vaccination_records enable row level security;

drop policy if exists "vaccination_records_select_own" on vaccination_records;
drop policy if exists "vaccination_records_insert_own" on vaccination_records;
drop policy if exists "vaccination_records_update_own" on vaccination_records;
drop policy if exists "vaccination_records_delete_own" on vaccination_records;

create policy "vaccination_records_select_own" on vaccination_records for select using (auth.uid() = user_id);
create policy "vaccination_records_insert_own" on vaccination_records for insert with check (auth.uid() = user_id);
create policy "vaccination_records_update_own" on vaccination_records for update using (auth.uid() = user_id);
create policy "vaccination_records_delete_own" on vaccination_records for delete using (auth.uid() = user_id);

-- Recurring daily plan behind the Medication Tracker / Pill Reminder /
-- Supplement Tracker tabs on health-medicine-tracker.html — one table, a
-- "category" column instead of three near-identical tables, since the three
-- tabs are the same shape (name, dosage, one or more times of day) and only
-- differ in what they're labeled. This is forward-looking ("what's due
-- today, and when") — unlike medical_events, which is a retrospective log
-- of past illnesses. start_date/end_date bound an ongoing schedule (end_date
-- null = no end); "today" is computed client-side against these.
create table if not exists medication_schedules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  member_id uuid not null references family_members (id) on delete cascade,
  category text not null check (category in ('medication','pill','supplement')),
  name text not null,
  dosage text,
  times time[] not null default '{}',
  start_date date not null default current_date,
  end_date date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Times of day are morning/noon/evening/night, not exact clock times — a
-- family log thinks in "with breakfast" / "at night", not HH:MM. Safe to
-- re-run: casting an already-text[] column to text[] is a no-op, and this
-- runs after the create table above within the same script, so the table
-- always exists by this point.
alter table medication_schedules alter column times type text[] using times::text[];

alter table medication_schedules enable row level security;

drop policy if exists "medication_schedules_select_own" on medication_schedules;
drop policy if exists "medication_schedules_insert_own" on medication_schedules;
drop policy if exists "medication_schedules_update_own" on medication_schedules;
drop policy if exists "medication_schedules_delete_own" on medication_schedules;

create policy "medication_schedules_select_own" on medication_schedules for select using (auth.uid() = user_id);
create policy "medication_schedules_insert_own" on medication_schedules for insert with check (auth.uid() = user_id);
create policy "medication_schedules_update_own" on medication_schedules for update using (auth.uid() = user_id);
create policy "medication_schedules_delete_own" on medication_schedules for delete using (auth.uid() = user_id);

-- ── Checkup Reports (health-checkup-reports.html): standalone section     ──
-- ── where a user uploads a full-body/medical checkup report per family    ──
-- ── member and gets a structured summary back. Common lab values are      ──
-- ── auto-detected from a PDF's text layer client-side via                 ──
-- ── js/health-log/report-extraction.js (regex pattern matching against a  ──
-- ── curated metric list) — NOT a true AI/LLM read. This app is a static   ──
-- ── site talking directly to Supabase with no server-side compute, so     ──
-- ── safely calling a real AI API (which needs a secret key held server-   ──
-- ── side) isn't buildable without adding a Supabase Edge Function; that's ──
-- ── a deliberate, documented gap, not an oversight. The user always       ──
-- ── reviews/edits detected values before saving either way. Deliberately  ──
-- ── standalone for now — not wired into life-expectancy.html's scoring.
create table if not exists medical_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  member_id uuid not null references family_members (id) on delete cascade,
  report_date date not null default current_date,
  report_label text not null default 'Checkup Report',
  file_name text not null,
  storage_path text not null,
  extraction_status text not null default 'manual' check (extraction_status in ('manual','parsed','failed')),
  overall_status text check (overall_status is null or overall_status in ('good','attention','concern')),
  overall_summary text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table medical_reports enable row level security;

drop policy if exists "medical_reports_select_own" on medical_reports;
drop policy if exists "medical_reports_insert_own" on medical_reports;
drop policy if exists "medical_reports_update_own" on medical_reports;
drop policy if exists "medical_reports_delete_own" on medical_reports;

create policy "medical_reports_select_own" on medical_reports for select using (auth.uid() = user_id);
create policy "medical_reports_insert_own" on medical_reports for insert with check (auth.uid() = user_id);
create policy "medical_reports_update_own" on medical_reports for update using (auth.uid() = user_id);
create policy "medical_reports_delete_own" on medical_reports for delete using (auth.uid() = user_id);

-- One row per lab value (key/value shape, not fixed columns) since checkup
-- panels vary hugely report to report — same reasoning as
-- prescribed_medicines being a child table of medical_events rather than
-- forcing every possible medicine into fixed columns. Denormalized user_id,
-- same non-recursive RLS pattern as prescribed_medicines/loan_prepayments.
create table if not exists medical_report_metrics (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  report_id uuid not null references medical_reports (id) on delete cascade,
  metric_key text not null,
  metric_label text not null,
  value numeric,
  value_text text,
  unit text,
  normal_low numeric,
  normal_high numeric,
  flag text check (flag is null or flag in ('normal','low','high')),
  created_at timestamptz not null default now()
);

alter table medical_report_metrics enable row level security;

drop policy if exists "medical_report_metrics_select_own" on medical_report_metrics;
drop policy if exists "medical_report_metrics_insert_own" on medical_report_metrics;
drop policy if exists "medical_report_metrics_update_own" on medical_report_metrics;
drop policy if exists "medical_report_metrics_delete_own" on medical_report_metrics;

create policy "medical_report_metrics_select_own" on medical_report_metrics for select using (auth.uid() = user_id);
create policy "medical_report_metrics_insert_own" on medical_report_metrics for insert with check (auth.uid() = user_id);
create policy "medical_report_metrics_update_own" on medical_report_metrics for update using (auth.uid() = user_id);
create policy "medical_report_metrics_delete_own" on medical_report_metrics for delete using (auth.uid() = user_id);

-- Private Storage bucket for the uploaded report files (PDF/image).
-- Unlike vault-documents, these are NOT client-side encrypted — the
-- extraction feature needs to read the file's contents, and Storage RLS
-- below already restricts access to the uploading user's own folder.
insert into storage.buckets (id, name, public)
  values ('medical-reports', 'medical-reports', false)
  on conflict (id) do nothing;

drop policy if exists "medical_reports_storage_select_own" on storage.objects;
drop policy if exists "medical_reports_storage_insert_own" on storage.objects;
drop policy if exists "medical_reports_storage_delete_own" on storage.objects;

create policy "medical_reports_storage_select_own" on storage.objects for select using (
  bucket_id = 'medical-reports' and (storage.foldername(name))[1] = auth.uid()::text
);
create policy "medical_reports_storage_insert_own" on storage.objects for insert with check (
  bucket_id = 'medical-reports' and (storage.foldername(name))[1] = auth.uid()::text
);
create policy "medical_reports_storage_delete_own" on storage.objects for delete using (
  bucket_id = 'medical-reports' and (storage.foldername(name))[1] = auth.uid()::text
);

-- ── Will Planner: estate split (as a free-form list of relationships the  ──
-- ── user can add/remove, not a fixed set) + draft will inputs — one row   ──
-- ── per user, so both persist across visits instead of resetting to      ──
-- ── defaults every time the page loads. Shared by will-planner.html      ──
-- ── (the split) and will-document.html (the drafted document). Not a     ──
-- ── substitute for a lawyer-executed Will.                               ──
create table if not exists will_drafts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade unique,
  heirs jsonb not null default '[{"label":"Spouse","pct":30},{"label":"Son","pct":25},{"label":"Daughter","pct":25},{"label":"Mother","pct":15},{"label":"Other / Charity","pct":5}]',
  testator_name text not null default '',
  testator_parent text not null default '',
  testator_address text not null default '',
  executor_name text not null default '',
  guardian_name text not null default '',
  bequests text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Migrates a will_drafts table created before the switch from fixed
-- spouse/son/daughter/mother/other columns to a free-form heirs list —
-- safe to re-run, and a no-op if the table was already created fresh above.
-- Wrapped in a DO block with dynamic SQL because a plain UPDATE referencing
-- spouse_pct etc. would fail to even parse on a fresh install where those
-- columns never existed, regardless of any WHERE-clause guard.
alter table will_drafts add column if not exists heirs jsonb not null default '[{"label":"Spouse","pct":30},{"label":"Son","pct":25},{"label":"Daughter","pct":25},{"label":"Mother","pct":15},{"label":"Other / Charity","pct":5}]';

do $$
begin
  if exists (select 1 from information_schema.columns where table_name = 'will_drafts' and column_name = 'spouse_pct') then
    execute $migrate$
      update will_drafts set heirs = jsonb_build_array(
        jsonb_build_object('label', 'Spouse', 'pct', spouse_pct),
        jsonb_build_object('label', 'Son', 'pct', son_pct),
        jsonb_build_object('label', 'Daughter', 'pct', daughter_pct),
        jsonb_build_object('label', 'Mother', 'pct', mother_pct),
        jsonb_build_object('label', 'Other / Charity', 'pct', other_pct)
      )
      where heirs = '[{"label":"Spouse","pct":30},{"label":"Son","pct":25},{"label":"Daughter","pct":25},{"label":"Mother","pct":15},{"label":"Other / Charity","pct":5}]'::jsonb
    $migrate$;
  end if;
end $$;

alter table will_drafts drop column if exists spouse_pct;
alter table will_drafts drop column if exists son_pct;
alter table will_drafts drop column if exists daughter_pct;
alter table will_drafts drop column if exists mother_pct;
alter table will_drafts drop column if exists other_pct;

alter table will_drafts enable row level security;

drop policy if exists "will_drafts_select_own" on will_drafts;
drop policy if exists "will_drafts_insert_own" on will_drafts;
drop policy if exists "will_drafts_update_own" on will_drafts;
drop policy if exists "will_drafts_delete_own" on will_drafts;

create policy "will_drafts_select_own" on will_drafts for select using (auth.uid() = user_id);
create policy "will_drafts_insert_own" on will_drafts for insert with check (auth.uid() = user_id);
create policy "will_drafts_update_own" on will_drafts for update using (auth.uid() = user_id);
create policy "will_drafts_delete_own" on will_drafts for delete using (auth.uid() = user_id);

-- ============================================================================
-- SaaS admin layer: one profiles row per auth.users row, an is_admin() check
-- usable in RLS policies, and triggers to keep it in sync automatically.
-- admin@enrichme.app is auto-flagged as admin the moment it signs up — no
-- manual SQL needed after that. Every other account (including the existing
-- str.balaji@gmail.com) only ever gets a profiles row added; nothing about
-- their auth.users row, password, or any of their existing data is touched.
-- ============================================================================

create table if not exists profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  full_name text,
  is_admin boolean not null default false,
  last_sign_in_at timestamptz,
  created_at timestamptz not null default now()
);

-- Signup approval gate: EnrichMe is free for its first 100 users, admitted
-- by hand. Every new signup lands in 'pending' and is invisible to the rest
-- of the app (see requireAuth() in js/supabase-client.js) until an admin
-- approves it from the Admin Dashboard's Signup Requests panel.
alter table profiles add column if not exists status text not null default 'pending';
alter table profiles drop constraint if exists profiles_status_check;
alter table profiles add constraint profiles_status_check check (status in ('pending', 'approved', 'rejected'));

-- Split name fields for settings.html. full_name is kept in sync (computed
-- as first + last on save) so existing displays that already read it -
-- dashboard.html's welcome text, the Admin Dashboard user table - keep
-- working without changes. Date/time of birth are deliberately NOT stored
-- here: astrology_inputs (dob, birth_time) already exists for the Vedic
-- Astrology feature, so settings.html reads/writes that table directly
-- instead of creating a second, driftable copy of the same two fields.
alter table profiles add column if not exists first_name text;
alter table profiles add column if not exists last_name text;

-- security definer, not a self-referencing RLS policy on profiles itself —
-- a profiles SELECT policy that queries profiles caused a real recursion
-- headache during the SplitWise build (see project memory); this sidesteps
-- that entirely since the function body runs with elevated rights and isn't
-- subject to the RLS policy it's used inside of.
create or replace function is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from profiles where id = auth.uid() and is_admin = true
  );
$$;

alter table profiles enable row level security;

drop policy if exists "profiles_select_own" on profiles;
drop policy if exists "profiles_select_admin" on profiles;
drop policy if exists "profiles_update_own" on profiles;

create policy "profiles_select_own" on profiles for select using (auth.uid() = id);
create policy "profiles_select_admin" on profiles for select using (is_admin());

-- Lets a signed-in user edit their own name from settings.html, without
-- opening the door to also self-editing is_admin or status (which would
-- let anyone bypass the signup-approval gate or grant themselves admin).
-- The row-level policy alone can't express that column-level distinction,
-- so it's paired with an explicit column grant narrower than the blanket
-- table-level grant Supabase's default setup gives `authenticated`.
create policy "profiles_update_own" on profiles for update using (auth.uid() = id) with check (auth.uid() = id);
revoke update on profiles from authenticated;
grant update (first_name, last_name, full_name) on profiles to authenticated;

-- Auto-create a profiles row for every new signup. admin@enrichme.app and
-- str.balaji@gmail.com (the account holder) are always pre-approved and
-- never sit in the Signup Requests queue, no matter when they sign up;
-- everyone else starts 'pending'.
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, is_admin, status)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data ->> 'full_name',
    new.email = 'admin@enrichme.app',
    case when new.email in ('admin@enrichme.app', 'str.balaji@gmail.com') then 'approved' else 'pending' end
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- Mirror last_sign_in_at so the admin dashboard can show real activity, not
-- just signup counts.
create or replace function sync_last_sign_in()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.profiles set last_sign_in_at = new.last_sign_in_at where id = new.id;
  return new;
end;
$$;

drop trigger if exists on_auth_user_sign_in on auth.users;
create trigger on_auth_user_sign_in
  after update of last_sign_in_at on auth.users
  for each row execute function sync_last_sign_in();

-- One-time backfill for accounts that already exist (str.balaji@gmail.com
-- and admin@enrichme.app if it signed up before this migration ran). Purely
-- additive — only inserts a profiles row, never touches auth.users.
insert into public.profiles (id, email, full_name, is_admin, status, last_sign_in_at, created_at)
select
  id, email, raw_user_meta_data ->> 'full_name',
  email = 'admin@enrichme.app',
  'approved',
  last_sign_in_at, created_at
from auth.users
on conflict (id) do nothing;

-- Grandfather in every account that existed before the signup-approval gate
-- shipped today (2026-08-29) — only signups from this date forward go
-- through admin review. Safe to re-run: only ever touches rows created
-- before the cutoff, so it never re-approves a genuine pending request.
update profiles set status = 'approved' where status = 'pending' and created_at < '2026-08-29';

-- Belt-and-suspenders: unconditionally keep these two accounts approved,
-- regardless of when their profiles row was created. Covers the case where
-- either re-signed up (a fresh auth.users row, dated today) after the gate
-- above already existed but before this email-based exception was added to
-- handle_new_user() — the date-cutoff grandfather clause alone can't catch
-- that. Safe to re-run.
update profiles set status = 'approved' where email in ('admin@enrichme.app', 'str.balaji@gmail.com');
