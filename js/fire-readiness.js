// FIRE Readiness checklist: how much real data the signed-in user has
// entered - across Net Worth, Monthly Cashflow, Income, and Health & Life
// Expectancy - for fire-plan.html's FIRE number to mean anything, plus a
// card UI showing a genuine sub-progress percentage per category (not just
// a yes/no) to nudge them toward finishing the pending ones.
//
// The tricky part is telling "real data" apart from each page's one-time
// sample-data seeding: expenses/income/loans/bank/portfolio all auto-insert
// nonzero starter rows on first visit (see ensureDefaults() in those pages),
// and life-expectancy.html silently persists its default answers on a
// brand-new account. "A row exists" or even "amount > 0" is not a reliable
// completion signal on its own - see expense_grid.is_seed in
// supabase-schema.sql, which this file relies on to filter that out.
//
// Each category's percentage is a genuine fraction of something concrete,
// not a re-labeled boolean:
//   - Net Worth: how many of 8 distinct asset/liability sources have any
//     real data (Accounts, Gold, Government Schemes, Properties, Personal
//     Debt, Stocks/MF, Bank Balances, Loans).
//   - Monthly Cashflow / Income: how many of the user's own tracked line
//     items have a real (non-seed) amount entered in any month.
//   - Health: how many of the ~25 questionnaire fields differ from their
//     default answer (health_inputs.conditions is excluded - an empty list
//     there is a legitimate "no conditions" answer, not a sign of skipping,
//     so it can't be used as a completion signal).
// A category only counts as done at a literal 100%.
(function (root) {
  'use strict';

  var ITEMS = [
    { key: 'networth', label: 'Net Worth', icon: '📈', href: 'net-worth.html', hint: 'Add an account, investment, property, or balance.' },
    { key: 'cashflow', label: 'Monthly Cashflow', icon: '🧮', href: 'expenses.html', hint: 'Enter a real amount for every expense you track.' },
    { key: 'income', label: 'Income', icon: '💵', href: 'income.html', hint: 'Enter a real amount for every income source you track.' },
    { key: 'health', label: 'Health & Life Expectancy', icon: '❤️', href: 'life-expectancy.html', hint: 'Finish answering the life expectancy questionnaire.' }
  ];

  async function hasAnyRow(table, filters) {
    var q = supabaseClient.from(table).select('id').limit(1);
    Object.keys(filters || {}).forEach(function (k) { q = q.eq(k, filters[k]); });
    var { data } = await q;
    return !!(data && data.length);
  }

  async function hasRealGridAmount(section) {
    var { data: groups } = await supabaseClient.from('expense_groups').select('id').eq('section', section);
    if (!groups || !groups.length) return false;
    var groupIds = groups.map(function (g) { return g.id; });

    var { data: items } = await supabaseClient.from('expense_items').select('id').in('group_id', groupIds);
    if (!items || !items.length) return false;
    var itemIds = items.map(function (i) { return i.id; });

    var { data: rows } = await supabaseClient
      .from('expense_grid')
      .select('id')
      .in('item_id', itemIds)
      .eq('is_seed', false)
      .gt('amount', 0)
      .limit(1);
    return !!(rows && rows.length);
  }

  // Fraction of this section's own CATEGORIES (expense_groups - e.g.
  // "Everyday spending", "Utility bills") that have at least one real
  // (non-seed, nonzero) amount entered anywhere inside them, in any month.
  // Deliberately category-level, not line-item-level: expenses.html alone
  // seeds ~34 individual items across 4 categories, and almost nobody
  // genuinely spends against every single one of them every month (Jewellery,
  // Gifts, etc. can be a real, honest zero for a given household). Requiring
  // every item individually made 100% effectively unreachable and read as a
  // sync bug ("I added my numbers, why is it still 80%?") when it was really
  // just measuring the wrong thing. A category counts as covered once any
  // one of its items has real data - matching how a user actually thinks
  // about "have I filled in my utility bills," not "have I filled in every
  // conceivable utility."
  async function gridSectionProgress(section) {
    var { data: groups } = await supabaseClient.from('expense_groups').select('id').eq('section', section);
    if (!groups || !groups.length) return 0;
    var groupIds = groups.map(function (g) { return g.id; });

    var { data: items } = await supabaseClient.from('expense_items').select('id, group_id').in('group_id', groupIds);
    if (!items || !items.length) return 0;
    var itemIds = items.map(function (i) { return i.id; });
    var groupByItem = {};
    items.forEach(function (i) { groupByItem[i.id] = i.group_id; });

    var { data: rows } = await supabaseClient
      .from('expense_grid')
      .select('item_id')
      .in('item_id', itemIds)
      .eq('is_seed', false)
      .gt('amount', 0);

    var groupsWithRealData = {};
    (rows || []).forEach(function (r) {
      var groupId = groupByItem[r.item_id];
      if (groupId) groupsWithRealData[groupId] = true;
    });
    return Math.round(Object.keys(groupsWithRealData).length / groupIds.length * 100);
  }

  async function netWorthProgress() {
    var checks = await Promise.all([
      hasAnyRow('accounts'),
      hasAnyRow('gold_holdings'),
      hasAnyRow('other_investments', { category: 'Government Scheme' }),
      hasAnyRow('properties'),
      hasAnyRow('personal_ious'),
      hasRealGridAmount('portfolio'),
      hasRealGridAmount('bank'),
      hasRealGridAmount('loans')
    ]);
    var doneCount = checks.filter(Boolean).length;
    return Math.round(doneCount / checks.length * 100);
  }

  // Same default tuple life-expectancy.html's init() writes on a brand-new
  // account (and the same one supabase-schema.sql's is_complete backfill
  // compares against) - a field counts as "answered" once it differs from
  // this.
  var HEALTH_DEFAULTS = {
    sex: 'male', age: 30,
    smoking_status: 'never', cigarettes_per_day: 10, years_smoked: 5, years_quit: 5,
    alcohol: 'occasional',
    fruit_veg_servings: '1-2', junk_food: 'few_times',
    exercise_days: '1-2', activity_level: 'light',
    height_cm: 170, weight_kg: 70,
    sleep_hours: '7-8',
    stress_level: 'moderate', social_connection: 'moderate',
    checkup_frequency: 'occasionally', seatbelt_habit: 'always',
    living_area: 'city', air_quality: 'moderate', water_quality: 'municipal', healthcare_access: 'good',
    relationship_status: 'married', partner_support: 'somewhat', family_time: 'weekly', intimacy_frequency: 'skip'
  };
  var HEALTH_FIELD_KEYS = Object.keys(HEALTH_DEFAULTS);

  async function healthProgress() {
    var { data } = await supabaseClient.from('health_inputs').select('*').maybeSingle();
    if (!data) return 0;
    var touched = 0;
    HEALTH_FIELD_KEYS.forEach(function (k) {
      if (data[k] != null && String(data[k]) !== String(HEALTH_DEFAULTS[k])) touched++;
    });
    return Math.round(touched / HEALTH_FIELD_KEYS.length * 100);
  }

  // Returns { percentByKey: {networth,cashflow,income,health -> 0..100},
  // percent (average), total, pendingCount } or null with no session.
  async function computeFireReadiness() {
    var { data: { session } } = await supabaseClient.auth.getSession();
    if (!session) return null;

    var results = await Promise.all([
      netWorthProgress(),
      gridSectionProgress('expenses'),
      gridSectionProgress('income'),
      healthProgress()
    ]);

    var percentByKey = { networth: results[0], cashflow: results[1], income: results[2], health: results[3] };
    var overallPercent = Math.round(results.reduce(function (s, p) { return s + p; }, 0) / results.length);
    var pendingCount = results.filter(function (p) { return p < 100; }).length;
    return { percentByKey: percentByKey, percent: overallPercent, total: ITEMS.length, pendingCount: pendingCount };
  }

  // Same donut-ring construction as fire-plan.html's FIRE-progress ring
  // (buildProgressDonutSvg), just parameterized for a light card background
  // instead of the dark hero card.
  function buildRingSvg(pct, size, strokeW, trackColor, fillColor) {
    var r = (size - strokeW) / 2;
    var cx = size / 2, cy = size / 2;
    var circumference = 2 * Math.PI * r;
    var len = circumference * Math.max(0, Math.min(1, pct / 100));
    return '<svg viewBox="0 0 ' + size + ' ' + size + '">' +
      '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="none" stroke="' + trackColor + '" stroke-width="' + strokeW + '"/>' +
      '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="none" stroke="' + fillColor + '" stroke-width="' + strokeW + '" ' +
      'stroke-dasharray="' + len + ' ' + circumference + '" stroke-linecap="round" transform="rotate(-90 ' + cx + ' ' + cy + ')"/>' +
      '</svg>';
  }

  function ringColorFor(pct) {
    if (pct >= 100) return { fill: '#10b981', track: 'rgba(16,185,129,0.15)' };
    if (pct > 0) return { fill: '#f59e0b', track: 'rgba(180,83,9,0.15)' };
    return { fill: '#94a3b8', track: 'rgba(148,163,184,0.18)' };
  }

  // Renders into containerEl on every page load, straight from a fresh
  // computeFireReadiness() call - deliberately no sessionStorage/
  // localStorage gating, so it always reflects whatever is true right now
  // rather than a stale dismissed/celebrated flag.
  function renderFireReadinessChecklist(containerEl, readiness) {
    if (!containerEl || !readiness) return;

    if (readiness.percent >= 100) {
      containerEl.style.display = '';
      containerEl.innerHTML =
        '<div class="fr-card fr-done">' +
          '<div class="fr-head" style="margin-bottom:0;">' +
            '<div class="fr-ring-wrap">' +
              buildRingSvg(100, 52, 6, 'rgba(16,185,129,0.15)', '#10b981') +
              '<div class="fr-ring-pct">✓</div>' +
            '</div>' +
            '<p class="fr-head-text"><strong>✅ FIRE Readiness Checklist complete</strong> - Net Worth, Monthly Cashflow, Income &amp; Health are all fully in, so your FIRE number now reflects real data.</p>' +
          '</div>' +
        '</div>';
      return;
    }

    var rowsHtml = ITEMS.map(function (item) {
      var pct = readiness.percentByKey[item.key];
      var done = pct >= 100;
      var colors = ringColorFor(pct);
      return '<a class="fr-row' + (done ? ' done' : '') + '" href="' + item.href + '" title="' + (done ? 'Complete' : item.hint) + '">' +
        '<div class="fr-row-ring">' + buildRingSvg(pct, 34, 4, colors.track, colors.fill) +
          '<span class="fr-row-ring-pct">' + (done ? '✓' : pct) + '</span>' +
        '</div>' +
        '<span class="fr-row-label">' + item.label + '</span>' +
        '<span class="fr-row-chevron">›</span>' +
      '</a>';
    }).join('');

    containerEl.style.display = '';
    containerEl.innerHTML =
      '<div class="fr-card fr-pending">' +
        '<div class="fr-head">' +
          '<div class="fr-ring-wrap">' +
            buildRingSvg(readiness.percent, 52, 6, 'rgba(180,83,9,0.15)', '#f59e0b') +
            '<div class="fr-ring-pct">' + readiness.percent + '%</div>' +
          '</div>' +
          '<p class="fr-head-text"><strong>⚠️ Complete your FIRE Readiness Checklist</strong> - ' + readiness.pendingCount + ' of ' + readiness.total + ' sections aren\'t fully in yet, so your FIRE number can\'t be fully trusted.</p>' +
        '</div>' +
        '<div class="fr-rows">' + rowsHtml + '</div>' +
      '</div>';
  }

  root.computeFireReadiness = computeFireReadiness;
  root.renderFireReadinessChecklist = renderFireReadinessChecklist;
})(window);
