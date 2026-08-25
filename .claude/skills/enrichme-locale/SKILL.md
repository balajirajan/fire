---
name: enrichme-locale
description: Use whenever building, editing, or reviewing any EnrichMe page, calculator, form, or copy in this repo — defines the current target market (India, INR) and what to defer (US and other countries) so new work doesn't silently drift toward US defaults.
---

# EnrichMe locale targeting

## Current scope: India only

EnrichMe's initial target market is **India**. All currency, financial
instruments, and defaults should assume an Indian user unless the user
explicitly asks for another country.

- **Currency**: Indian Rupee — symbol `₹`, code `INR`. Use `₹` in all
  UI copy, calculator outputs, and placeholder values (e.g. hero demo
  numbers, sample net worth figures).
- **Number formatting**: Indian numbering (lakh/crore grouping, e.g.
  `₹12,34,567`) is the eventual target, but don't retrofit every
  existing number silently — when adding *new* numeric displays, ask
  if the user wants Indian grouping or plain thousands separators
  before picking one, since it's a visible design decision.
- **Financial instruments**: when a calculator or content section
  needs domain-specific instruments (retirement accounts, tax-saving
  vehicles, etc.), default to Indian equivalents — EPF, PPF, NPS,
  ELSS, Section 80C — not US instruments like 401(k), IRA, or Roth
  IRA. Don't invent instrument-specific calculators speculatively;
  only build what's asked.
- **Regulatory/tax framing**: avoid US-specific claims (IRS rules,
  federal tax brackets, Social Security) in any new copy. If a
  calculator needs a safe withdrawal rate, inflation assumption, or
  return benchmark, prefer commonly-cited Indian figures when known,
  otherwise leave it as an adjustable input rather than guessing a US
  number.

## Deferred: US and other countries

Multi-country support (currency switcher beyond decoration, US
instruments, other locales) is an explicitly **future phase** — not
in scope now.

- Don't build a working currency/country switcher. The existing
  `🌐 English` language-selector in the nav is decorative placeholder
  UI; leave it as-is unless asked to wire it up.
- Don't add US-market content (tools, blog copy, comparison tables)
  proactively "for completeness." Keep new work scoped to what an
  Indian user would see.
- If a request is ambiguous about which market it targets, assume
  India — that's the default, not an edge case to ask about every
  time.

## How to apply this

- New landing sections, tool cards, or calculators: write copy and
  sample numbers in ₹/INR terms.
- Existing content already in USD (e.g. any leftover `$` figures from
  early scaffolding) can be left alone unless the user is actively
  touching that section — don't do a drive-by currency sweep unless
  asked.
- When in doubt about an India-specific number (interest rates,
  typical salary figures, tax slabs), ask rather than guessing — these
  change often and get cited in calculator output.

## Visual theme

EnrichMe uses a **light theme** (white/soft cyan-to-emerald gradient
background, `#0f172a` near-black text, `#10b981` emerald as the
primary accent, `#0ea5e9` cyan as the secondary accent in gradients).
This replaced an earlier dark-navy theme. When adding new pages or
sections, match this palette rather than reintroducing dark
backgrounds — check `index.html`'s `<style>` block for the current
token values before improvising new colors.

## Tools taxonomy

`calculator/free-calculators.html` organizes calculators into five
filterable categories (search box + pills, JS-driven, no backend):
**Financial Health**, **Plan Your Goals** (includes FIRE variants and
retirement/NPS/goal-based tools), **Invest & Grow**, **Loans & Debt**,
**Tax Planning**. The tool list intentionally blends general
FIRE/investing calculators with India-specific ones (SIP, Step-Up SIP,
EMI, XIRR, CAGR, HRA, Income Tax, Capital Gains, NPS, Child Education,
SWP). When adding a new calculator card, place it under the closest
existing category and give it a `data-category` + `data-name`
attribute so it's included in search/filtering — don't invent a new
category pill without a reason.

- **"Most Useful" row** (was "Most Popular" — renamed): a 4-card
  highlight row above the category grids on
  `calculator/free-calculators.html` (currently Financial Fitness
  Score, FIRE Calculator, Income Tax Calculator, Monthly Expense
  Calculator). Every card in this row also has a matching entry in its
  category grid below, so it stays reachable via search/filter — don't
  add a highlight card without a matching grid card.
- **Fitness Score is not a top-level nav item.** It's reached via
  `Tools → Most Useful` (or the Financial Health category), not a nav
  link. Don't re-add it to `nav-links` without being asked — the nav
  was deliberately trimmed to Tools / Learn / Services / Menu.
- **Cross-calculator data flow (public tools only)**:
  `calculator/monthly-expense-calculator.html` writes its live monthly
  total to `localStorage['enrichme_monthly_expense']` on every recalc.
  `calculator/fire-calculator.html` reads that key on load to prefill
  its expenses input (clamped/snapped to its slider range), with a
  manual re-sync link and a status note. This `localStorage` pattern is
  specific to the public, no-login `calculator/` tools — the logged-in
  app pages (Net Worth, Transactions, Planner) moved to Supabase; see
  "Backend: Supabase" below. Don't mix the two — public tools stay
  `localStorage`-only and backend-free, app pages go through Supabase.

## Site structure

- **Calculator pages live under `calculator/`.** Any new calculator or
  tool page belongs in `/calculator/`, alongside
  `calculator/free-calculators.html` (the tools hub). Pages inside
  that folder link back to the landing page with `../index.html`, not
  `index.html`.
- **The nav's tools link is labeled "Tools"** (not "Our Free Tools")
  and points to `calculator/free-calculators.html`.
- **Header and footer must stay the same across all pages.** Every
  page in the site (`index.html`, `services.html`, `pricing.html`,
  `resources.html`, and everything under `calculator/`:
  `free-calculators.html`, `fitness-score.html`, `fire-calculator.html`,
  `monthly-expense-calculator.html`) uses the identical nav and footer.
  Current nav order: **Features → Tools → Pricing → Learn → Services →
  Menu (Log In / Sign Up, native `<details>` dropdown) → 🌐 English**.
  Footer is always
  `© 2026 EnrichMe. All rights reserved.` When adding a new page, copy
  the header/footer from an existing page rather than inventing a new
  one. When changing the header or footer, apply the change to every
  page, not just the one being edited — this list is the source of
  truth for "every page," keep it updated when a new page is added.
  - Each page is self-contained, so the nav/footer CSS is duplicated
    per page's own `<style>` block rather than shared via an include —
    keep the duplicated CSS in sync when editing either. The FAQ
    `details`/`summary` CSS (where present) must stay scoped to
    `.faq-wrap details` etc., not bare tag selectors — otherwise it
    leaks onto the nav's `<details class="nav-menu">` dropdown.
  - Non-home pages link the logo back to the home page (`../index.html`
    from one level deep) and point the `Tools` link at
    `free-calculators.html` (itself, when already on that page).
    `Pricing` links to the real `pricing.html` page (three tiers:
    Basic, Family, HNI). `Learn` links to the real `resources.html`
    page (a resource hub: Blog, Help Center, Discord Community, 1-on-1
    Session, Financial Terms, Advisor Directory — items without a real
    destination yet carry a `🔜 Coming Soon` badge rather than pointing
    nowhere). `Services` links to the real `services.html` page
    (root-level, alongside `index.html` — not under `calculator/`,
    since it isn't a calculator). `Log In` / `Sign Up` both point at
    `../index.html#login`, the id on the login box. `pricing.html` and
    `resources.html` are root-level pages (like `services.html`), so
    their own internal links use bare paths (`index.html`,
    `services.html`), not the `../` prefix used inside `calculator/`.

## No fabricated regulatory/licensing claims

`services.html` is a **"Coming Soon" advisory page** inspired by a
real fee-only advisory firm's marketing site, but EnrichMe is not a
SEBI-registered Investment Adviser and holds no such licensing — so
none of that firm's regulatory language was carried over.

- Never add SEBI/RIA registration numbers, "fiduciary," "fee-only,"
  "zero commissions," or any other licensing/compliance claim to
  EnrichMe copy. These are specific, regulated claims that would be
  false if attached to a product that isn't actually registered.
- Don't fabricate real ₹ pricing for services that don't exist yet
  (see `services.html`'s "🔜 Coming Soon" badges instead of price
  tags). If a reference site has a pricing table for a service EnrichMe
  doesn't actually offer, drop the numbers, don't adapt them.
- When adapting content from an external advisory/fintech reference
  site, treat licensing claims, pricing, and "free consultation"-style
  CTAs as the parts to rewrite or cut — not just currency/wording to
  localize. The structure/UX (tabs, FAQ, process steps) is fine to
  reuse; the regulatory claims are not.
