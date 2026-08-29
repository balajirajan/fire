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

  var DISMISS_KEY = 'enrichme_fire_readiness_dismissed';

  function dismissFireReadinessChecklist() {
    try { sessionStorage.setItem(DISMISS_KEY, '1'); } catch (e) {}
    var el = document.getElementById('fireReadinessChecklist');
    if (el) el.style.display = 'none';
  }

  // Renders into containerEl (expects an empty <div>, hidden by default).
  // Hides itself entirely once 100% complete, and stays hidden for the rest
  // of the browser session once dismissed (sessionStorage, not localStorage)
  // so it reliably reappears next visit while still complete - that's the
  // point of a reminder, not a one-time toast.
  function renderFireReadinessChecklist(containerEl, readiness) {
    if (!containerEl || !readiness) return;

    if (readiness.percent >= 100) {
      containerEl.style.display = 'none';
      containerEl.innerHTML = '';
      return;
    }

    var dismissed = false;
    try { dismissed = sessionStorage.getItem(DISMISS_KEY) === '1'; } catch (e) {}
    if (dismissed) {
      containerEl.style.display = 'none';
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
      '<div class="fr-card">' +
        '<button type="button" class="fr-dismiss" onclick="dismissFireReadinessChecklist()" title="Hide for now">✕</button>' +
        '<div class="fr-head">' +
          '<div class="fr-head-text">' +
            '<strong>Complete your FIRE Readiness Checklist</strong>' +
            '<p>Your FIRE number is only as accurate as the data behind it - ' + (readiness.total - readiness.doneCount) + ' of ' + readiness.total + ' sections still need real numbers.</p>' +
          '</div>' +
          '<div class="fr-pct">' + readiness.percent + '%</div>' +
        '</div>' +
        '<div class="fr-bar"><div class="fr-bar-fill" style="width:' + readiness.percent + '%"></div></div>' +
        '<div class="fr-rows">' + rowsHtml + '</div>' +
      '</div>';
  }

  root.computeFireReadiness = computeFireReadiness;
  root.renderFireReadinessChecklist = renderFireReadinessChecklist;
  root.dismissFireReadinessChecklist = dismissFireReadinessChecklist;
})(window);
