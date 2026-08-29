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

## Writing style: no em dashes

EnrichMe copy does not use em dashes (—). Use a hyphen with spaces
(" - ") instead, or restructure the sentence with a comma, colon, or
period if a hyphen reads awkwardly. All 383 existing instances across
every page were swept and replaced on 2026-08-19.

- Applies to all user-facing text: page copy, calculator labels,
  button/tooltip text, and any string built in JS that renders in the
  UI, not just literal HTML content.
- Code comments (JS/CSS) are not in scope for this rule - it targets
  product copy, not internal documentation.
- When adapting or porting text from an external reference site, strip
  em dashes during the rewrite rather than carrying them over.

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

EnrichMe uses a **Rocket Money-inspired light theme**: white/warm-gray
backgrounds, near-black ink text, and a single red accent used
sparingly — not the earlier cyan-to-emerald gradient theme (that
palette is retired; don't reintroduce it in new or edited pages).

- **Palette tokens** (defined as CSS custom properties in
  `index.html`'s `:root`; replicate the same values — cyan/emerald
  hexes have no more design intent here):
  - `--bg: #ffffff` (page background)
  - `--bg-alt: #f5f4f1` (warm light-gray section/panel background —
    e.g. the hero panel, hover states, alternating sections)
  - `--ink: #16130f` (primary text, near-black, warm — not pure
    `#000` or the old `#0f172a` slate)
  - `--ink-soft: #5c584f` (body/secondary text)
  - `--ink-faint: #8a857a` (placeholder/faint text)
  - `--border: #e7e3dc` (warm light border, replaces `#e2e8f0`)
  - `--accent: #de3341` (the one brand red — used sparingly: eyebrows,
    links on hover, checkmarks, one hero headline word, a diagram's
    center/focal element — never as a full-page wash)
  - `--accent-dark: #a3202b` (accent hover/active state)
  - `--accent-tint: #fdeceb` (light red tint background, e.g. info
    chips, callout cards)
  - `--black` / `--black-hover`: `#16130f` / `#322d26` (solid fill for
    primary buttons)
- **Buttons**: primary CTAs are solid-black, fully-rounded pills
  (`border-radius: 999px`, `background: var(--black)`, white text,
  hover `var(--black-hover)`); secondary buttons are the same pill
  shape with a `1.5px solid var(--ink)` outline, inverting to filled
  black on hover. No more gradient buttons.
- **Icon badges** (feature icons, mega-menu icons, path-timeline
  step icons): solid `var(--ink)` background, not gradients. Reserve
  `var(--accent)` for the one focal/final element in a sequence (e.g.
  the last step of a journey, a diagram's center node) so the red
  stays a deliberate highlight, not a repeated pattern.
- **This theme applies site-wide, not just `index.html`.** It was
  first rolled out on the landing page; when creating or materially
  editing any other page (dashboard, calculators, vault, will
  planner, split expenses, etc.), bring its colors in line with these
  tokens rather than leaving the old cyan/emerald palette in place.
  Don't do a drive-by repaint of a page you're not otherwise touching,
  but any page you do touch should end up on this palette, and any
  brand-new page must start on it. Check `index.html`'s `<style>`
  block for the current token values and component patterns (button
  shapes, card borders, hover states) before improvising new ones.

## Icon system

EnrichMe uses **Tabler Icons** (outline variant, MIT licensed) as the
one icon library, site-wide — emoji icons are retired. This applies
to the landing page's feature cards and nav mega-menu, and to every
app page's sidebar nav (`.nav-icon`).

- **Format**: each icon is inlined as a raw `<svg>` — no icon font, no
  CDN script dependency at runtime, no build step (this is a static
  site). Fetch the source SVG from
  `https://unpkg.com/@tabler/icons@latest/icons/outline/{name}.svg`,
  strip the `xmlns`/`width`/`height`/`class` attributes and the
  invisible `stroke="none" d="M0 0h24v24H0z"` bounding-box path, and
  keep only the real `<path>` elements. Wrap them in:
  ```html
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
       stroke-linecap="round" stroke-linejoin="round" class="tabler-icon">
    <path d="..." /><path d="..." />
  </svg>
  ```
  Never hand-draw icon paths — always pull the real path data from
  Tabler so the linework stays consistent with the rest of the set.
- **Color**: sidebar nav icons use `stroke="currentColor"` so they
  inherit the link's text color automatically (ink when idle, white
  when the parent `<a>` is `.active` with a dark background) — don't
  hardcode a stroke color there. Icon badges with a fixed dark
  background (`.feature-icon`, `.mega-menu-icon`) instead hardcode
  `stroke="#ffffff"`, since the badge background never changes to
  something white needing dark strokes.
- **Sizing**: the icon inherits its box from a wrapper, not from its
  own `width`/`height` attributes (which are stripped). Size it via
  CSS on `.tabler-icon` scoped to its container, e.g.
  `.sidebar-nav .nav-icon .tabler-icon { width: 18px; height: 18px; }`
  or `.feature-icon .tabler-icon { width: 22px; height: 22px; }`.
- **One icon per concept, reused across pages.** The mapping below is
  the source of truth — reuse it rather than picking a new icon for
  a label that already has one, and extend it (documenting the new
  label → icon name here) when a genuinely new nav item or feature is
  added. Within any single sidebar list, no two visible items should
  share the same icon (differentiate with a plain vs. "-check"/"-2"
  variant if the closest concept is already taken, as done below with
  `shield-check` vs `shield`).

  | Label | Icon (outline) |
  |---|---|
  | Dashboard | `home` |
  | FIRE Plan / FIRE Planning & Goals | `compass` |
  | Goal Based Savings | `target` |
  | Networth / Net Worth Tracking | `trending-up` |
  | Stocks/MF | `chart-candle` |
  | Gold + Commodities | `coin` |
  | Government Scheme | `building-government` (maps to Tabler's `building-monument`) |
  | Properties / Property Documents | `building` |
  | Personal Debt & Receivable | `arrows-left-right` |
  | Loan / EMI | `trending-down` |
  | Bank Balances | `building-bank` |
  | Monthly CashFlow | `chart-bar` |
  | Income | `cash` |
  | Tax Planning | `receipt-2` |
  | Insurance Tracker | `shield-check` |
  | My Policies / Insurance Documents | `shield` |
  | Coverage Calculator / Monthly Expenses | `calculator` |
  | Reminders | `bell` |
  | Document Vault | `lock` |
  | Bank Locker | `key` |
  | Bond Documents | `file-certificate` |
  | Government Documents | `certificate` |
  | Vehicle Documents | `car` |
  | Education Certificates | `school` |
  | Legal & Estate Documents | `gavel` |
  | Health(is wealth) / Health & Longevity | `heart` |
  | Life Expectancy | `hourglass` |
  | Medicine Tracker | `pill` |
  | Checkup Reports | `stethoscope` |
  | Body Fat Calculator | `scale` |
  | SplitExpenses(SplitWise) | `users` |
  | Will Planner | `file-text` |
  | Will Document | `file-description` |
  | Spiritual / Vedic Astrology | `moon-stars` |
  | Settings | `settings` |
  | Expenses tracker(Daily Log) / Daily Expense Capture | `bolt` |
  | Expenses Calculator | `adjustments-horizontal` |
  | Monthly Budgeting | `table` |
  | Financial Calculators | `calculator` |

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
