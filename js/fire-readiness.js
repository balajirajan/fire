// FIRE Readiness checklist: whether the signed-in user has entered enough
// real data - across Net Worth, Monthly Cashflow, Income, and Health & Life
// Expectancy - for fire-plan.html's FIRE number to mean anything, plus a
// dismissible-per-session card UI to nudge them toward the pending ones.
//
// The tricky part is telling "real data" apart from each page's one-time
// sample-data seeding: expenses/income/loans/bank/portfolio all auto-insert
// nonzero starter rows on first visit (see ensureDefaults() in those pages),
// and life-expectancy.html silently persists its default answers on a
// brand-new account. "A row exists" or even "amount > 0" is not a reliable
// completion signal on its own - see expense_grid.is_seed and
// health_inputs.is_complete in supabase-schema.sql, which this file relies
// on to filter that out.
(function (root) {
  'use strict';

  var ITEMS = [
    { key: 'networth', label: 'Net Worth', icon: '📈', href: 'net-worth.html', hint: 'Add an account, investment, property, or balance.' },
    { key: 'cashflow', label: 'Monthly Cashflow', icon: '🧮', href: 'expenses.html', hint: 'Enter a real expense amount for any month.' },
    { key: 'income', label: 'Income', icon: '💵', href: 'income.html', hint: 'Enter a real income amount for any month.' },
    { key: 'health', label: 'Health & Life Expectancy', icon: '❤️', href: 'life-expectancy.html', hint: 'Answer the life expectancy questionnaire.' }
  ];

  async function hasAnyRow(table, filters) {
    var q = supabaseClient.from(table).select('id').limit(1);
    Object.keys(filters || {}).forEach(function (k) { q = q.eq(k, filters[k]); });
    var { data } = await q;
    return !!(data && data.length);
  }

  // True when this section (expenses/income/loans/bank/portfolio) has at
  // least one grid cell the user actually entered - i.e. not seed data, and
  // a nonzero amount.
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

  async function hasNetWorthData() {
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
    return checks.some(Boolean);
  }

  async function hasHealthData() {
    var { data } = await supabaseClient.from('health_inputs').select('is_complete').maybeSingle();
    return !!(data && data.is_complete);
  }

  // Returns { statusByKey: {networth,cashflow,income,health -> bool},
  // doneCount, total, percent } or null if there's no signed-in session.
  async function computeFireReadiness() {
    var { data: { session } } = await supabaseClient.auth.getSession();
    if (!session) return null;

    var results = await Promise.all([
      hasNetWorthData(),
      hasRealGridAmount('expenses'),
      hasRealGridAmount('income'),
      hasHealthData()
    ]);

    var statusByKey = { networth: results[0], cashflow: results[1], income: results[2], health: results[3] };
    var doneCount = results.filter(Boolean).length;
    return { statusByKey: statusByKey, doneCount: doneCount, total: ITEMS.length, percent: Math.round(doneCount / ITEMS.length * 100) };
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

  // Renders into containerEl on every page load, straight from a fresh
  // computeFireReadiness() call - deliberately no sessionStorage/
  // localStorage gating. This used to remember a dismiss or a one-time
  // "celebrated" flag, but that meant a single click, or a readiness check
  // that briefly (or wrongly) computed 100%, could hide the checklist on
  // every later visit even while real data was still missing - exactly the
  // "shows once then disappears" bug this replaced. A reminder that can
  // silently disable itself isn't a reminder, so this only ever reflects
  // whatever is true right now.
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
            '<p class="fr-head-text"><strong>✅ FIRE Readiness Checklist complete</strong> - Net Worth, Monthly Cashflow, Income &amp; Health are all in, so your FIRE number now reflects real data.</p>' +
          '</div>' +
        '</div>';
      return;
    }

    var rowsHtml = ITEMS.map(function (item) {
      var done = readiness.statusByKey[item.key];
      return '<a class="fr-row' + (done ? ' done' : '') + '" href="' + item.href + '" title="' + (done ? 'Done' : item.hint) + '">' +
        '<span class="fr-row-icon">' + (done ? '✓' : item.icon) + '</span>' +
        '<span class="fr-row-label">' + item.label + '</span>' +
        '<span class="fr-row-status">' + (done ? 'Done' : 'Add data →') + '</span>' +
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
          '<p class="fr-head-text"><strong>⚠️ Complete your FIRE Readiness Checklist</strong> - ' + (readiness.total - readiness.doneCount) + ' of ' + readiness.total + ' sections still need real numbers before your FIRE number can be trusted.</p>' +
        '</div>' +
        '<div class="fr-rows">' + rowsHtml + '</div>' +
      '</div>';
  }

  root.computeFireReadiness = computeFireReadiness;
  root.renderFireReadinessChecklist = renderFireReadinessChecklist;
})(window);
