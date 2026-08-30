// FIRE Readiness: how much real data the signed-in user has entered -
// across Net Worth, Monthly Cashflow, Income, and Health & Life Expectancy
// - for fire-plan.html's FIRE number to mean anything. Powers two things:
//   - The summary checklist on Dashboard/FIRE Plan (computeFireReadiness +
//     renderFireReadinessChecklist), showing all 4 categories at a glance.
//   - A per-category checklist embedded on each category's own page
//     (computeCategoryDetail + renderCategoryChecklist), breaking that one
//     category down into exactly which sub-items are still missing.
//
// The tricky part is telling "real data" apart from each page's one-time
// sample-data seeding: expenses/income/loans/bank/portfolio all auto-insert
// nonzero starter rows on first visit (see ensureDefaults() in those pages),
// and life-expectancy.html silently persists its default answers on a
// brand-new account. "A row exists" or even "amount > 0" is not a reliable
// completion signal on its own - see expense_grid.is_seed and
// health_inputs.answered_cards in supabase-schema.sql, which this file
// relies on to filter that out.
//
// Each category's percentage is a genuine fraction of something concrete:
//   - Net Worth: how many of 8 distinct sources (Accounts, Gold, Government
//     Schemes, Properties, Personal Debt, Portfolio, Bank, Loans) have any
//     real data.
//   - Monthly Cashflow / Income: how many of the user's own expense/income
//     CATEGORIES (not every individual line item - see gridSectionDetail)
//     have a real (non-seed) amount entered anywhere inside them.
//   - Health: how many of the 12 questionnaire cards were actually
//     interacted with (health_inputs.answered_cards, recorded by
//     life-expectancy.html's markCardAnswered) - not a guess from whether
//     the answer differs from its default, since a genuine default answer
//     (really is 30, really picked "moderate") is indistinguishable from an
//     untouched question under that heuristic.
// A category only counts as done at a literal 100%.
(function (root) {
  'use strict';

  var ITEMS = [
    { key: 'networth', label: 'Net Worth', icon: '📈', href: 'net-worth.html', hint: 'Add an account, investment, property, or balance.' },
    { key: 'cashflow', label: 'Monthly Cashflow', icon: '🧮', href: 'expenses.html', hint: 'Enter a real amount in every category you track.' },
    { key: 'income', label: 'Income', icon: '💵', href: 'income.html', hint: 'Enter a real amount in every income category you track.' },
    { key: 'health', label: 'Health & Life Expectancy', icon: '❤️', href: 'life-expectancy.html', hint: 'Finish answering the life expectancy questionnaire.' }
  ];

  function escapeHtml(s) {
    return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

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

  // The 8 sources that make up Net Worth, with where to go add each one.
  // Accounts has no href - it's the manual catch-all table, edited
  // directly on net-worth.html itself, wherever this is rendered.
  var NET_WORTH_SOURCES = [
    { label: 'Accounts', href: null, check: function () { return hasAnyRow('accounts'); } },
    { label: 'Gold Holdings', href: 'gold.html', check: function () { return hasAnyRow('gold_holdings'); } },
    { label: 'Government Schemes', href: 'bonds.html', check: function () { return hasAnyRow('other_investments', { category: 'Government Scheme' }); } },
    { label: 'Properties', href: 'properties.html', check: function () { return hasAnyRow('properties'); } },
    { label: 'Personal Debt / Receivable', href: 'personal-debt.html', check: function () { return hasAnyRow('personal_ious'); } },
    { label: 'Stocks / Mutual Funds', href: 'portfolio.html', check: function () { return hasRealGridAmount('portfolio'); } },
    { label: 'Bank Balances', href: 'bank-balances.html', check: function () { return hasRealGridAmount('bank'); } },
    { label: 'Loans', href: 'loans.html', check: function () { return hasRealGridAmount('loans'); } }
  ];

  async function netWorthDetail() {
    var results = await Promise.all(NET_WORTH_SOURCES.map(function (s) { return s.check(); }));
    var items = NET_WORTH_SOURCES.map(function (s, i) { return { label: s.label, done: results[i], href: s.href }; });
    var percent = Math.round(results.filter(Boolean).length / results.length * 100);
    return { percent: percent, items: items };
  }

  // Fraction of this section's own CATEGORIES (expense_groups - e.g.
  // "Everyday spending", "Utility bills") that have at least one real
  // (non-seed, nonzero) amount entered anywhere inside them, in any month.
  // Deliberately category-level, not line-item-level: expenses.html alone
  // seeds ~34 individual items across 4 categories, and almost nobody
  // genuinely spends against every single one of them every month (Jewellery,
  // Gifts, etc. can be a real, honest zero for a given household). A
  // category counts as covered once any one of its items has real data -
  // matching how a user actually thinks about "have I filled in my utility
  // bills," not "have I filled in every conceivable utility." No href on
  // the items - they're categories on the very page this renders on.
  async function gridSectionDetail(section) {
    var { data: groups } = await supabaseClient.from('expense_groups').select('id, name').eq('section', section);
    if (!groups || !groups.length) return { percent: 0, items: [] };
    var groupIds = groups.map(function (g) { return g.id; });

    var { data: items } = await supabaseClient.from('expense_items').select('id, group_id').in('group_id', groupIds);
    var itemIds = (items || []).map(function (i) { return i.id; });
    var groupByItem = {};
    (items || []).forEach(function (i) { groupByItem[i.id] = i.group_id; });

    var rows = [];
    if (itemIds.length) {
      var res = await supabaseClient.from('expense_grid').select('item_id').in('item_id', itemIds).eq('is_seed', false).gt('amount', 0);
      rows = res.data || [];
    }

    var groupsWithRealData = {};
    rows.forEach(function (r) {
      var groupId = groupByItem[r.item_id];
      if (groupId) groupsWithRealData[groupId] = true;
    });

    var detailItems = groups.map(function (g) { return { label: g.name, done: !!groupsWithRealData[g.id], href: null }; });
    var percent = Math.round(Object.keys(groupsWithRealData).length / groups.length * 100);
    return { percent: percent, items: detailItems };
  }

  // The 12 question cards on life-expectancy.html, in the order they
  // appear there. Keys match data-card there and answered_cards' backfill
  // in supabase-schema.sql exactly.
  var HEALTH_CARDS = [
    { key: 'about_you', label: 'About You' },
    { key: 'smoking', label: 'Smoking' },
    { key: 'alcohol', label: 'Alcohol' },
    { key: 'diet', label: 'Diet' },
    { key: 'activity', label: 'Physical Activity' },
    { key: 'weight', label: 'Body Weight' },
    { key: 'sleep', label: 'Sleep' },
    { key: 'mental', label: 'Mental & Social Wellbeing' },
    { key: 'family', label: 'Family & Relationships' },
    { key: 'conditions', label: 'Existing Health Conditions' },
    { key: 'preventive', label: 'Preventive Care & Safety' },
    { key: 'environment', label: 'Environment' }
  ];

  async function healthDetail() {
    var { data } = await supabaseClient.from('health_inputs').select('answered_cards').maybeSingle();
    var answered = (data && data.answered_cards) || [];
    var answeredSet = {};
    answered.forEach(function (k) { answeredSet[k] = true; });
    var items = HEALTH_CARDS.map(function (c) {
      return { label: c.label, done: !!answeredSet[c.key], href: 'life-expectancy.html#qcard-' + c.key };
    });
    var percent = Math.round(answered.length / HEALTH_CARDS.length * 100);
    return { percent: percent, items: items };
  }

  // Full breakdown for one category - used to embed a checklist directly
  // on that category's own page (net-worth.html, expenses.html, etc.).
  async function computeCategoryDetail(key) {
    if (key === 'networth') return netWorthDetail();
    if (key === 'cashflow') return gridSectionDetail('expenses');
    if (key === 'income') return gridSectionDetail('income');
    if (key === 'health') return healthDetail();
    return null;
  }

  // Returns { percentByKey: {networth,cashflow,income,health -> 0..100},
  // percent (average), total, pendingCount } or null with no session.
  async function computeFireReadiness() {
    var { data: { session } } = await supabaseClient.auth.getSession();
    if (!session) return null;

    var results = await Promise.all([
      netWorthDetail(),
      gridSectionDetail('expenses'),
      gridSectionDetail('income'),
      healthDetail()
    ]);
    var percents = results.map(function (r) { return r.percent; });

    var percentByKey = { networth: percents[0], cashflow: percents[1], income: percents[2], health: percents[3] };
    var overallPercent = Math.round(percents.reduce(function (s, p) { return s + p; }, 0) / percents.length);
    var pendingCount = percents.filter(function (p) { return p < 100; }).length;
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

  // Renders a single category's own checklist (embedded directly on that
  // category's page, e.g. net-worth.html) - same visual language as
  // renderFireReadinessChecklist, but broken down into that category's
  // actual sub-items instead of the 4-category summary.
  function renderCategoryChecklist(containerEl, detail, opts) {
    if (!containerEl || !detail) return;
    opts = opts || {};
    var title = opts.title || 'This section';
    var doneText = opts.doneText || 'Fully complete.';

    if (detail.percent >= 100) {
      containerEl.style.display = '';
      containerEl.innerHTML =
        '<div class="fr-card fr-done">' +
          '<div class="fr-head" style="margin-bottom:0;">' +
            '<div class="fr-ring-wrap">' +
              buildRingSvg(100, 52, 6, 'rgba(16,185,129,0.15)', '#10b981') +
              '<div class="fr-ring-pct">✓</div>' +
            '</div>' +
            '<p class="fr-head-text"><strong>✅ ' + escapeHtml(title) + ' complete</strong> - ' + escapeHtml(doneText) + '</p>' +
          '</div>' +
        '</div>';
      return;
    }

    var pendingCount = detail.items.filter(function (it) { return !it.done; }).length;
    var rowsHtml = detail.items.map(function (it) {
      var colors = ringColorFor(it.done ? 100 : 0);
      var tag = it.href ? 'a' : 'div';
      var hrefAttr = it.href ? ' href="' + it.href + '"' : '';
      return '<' + tag + ' class="fr-row' + (it.done ? ' done' : '') + '"' + hrefAttr + '>' +
        '<div class="fr-row-ring">' + buildRingSvg(it.done ? 100 : 0, 34, 4, colors.track, colors.fill) +
          '<span class="fr-row-ring-pct">' + (it.done ? '✓' : '') + '</span>' +
        '</div>' +
        '<span class="fr-row-label">' + escapeHtml(it.label) + '</span>' +
        (it.href ? '<span class="fr-row-chevron">›</span>' : '') +
      '</' + tag + '>';
    }).join('');

    containerEl.style.display = '';
    containerEl.innerHTML =
      '<div class="fr-card fr-pending">' +
        '<div class="fr-head">' +
          '<div class="fr-ring-wrap">' +
            buildRingSvg(detail.percent, 52, 6, 'rgba(180,83,9,0.15)', '#f59e0b') +
            '<div class="fr-ring-pct">' + detail.percent + '%</div>' +
          '</div>' +
          '<p class="fr-head-text"><strong>⚠️ ' + escapeHtml(title) + '</strong> - ' + pendingCount + ' of ' + detail.items.length + ' still ' + (pendingCount === 1 ? 'needs' : 'need') + ' real data.</p>' +
        '</div>' +
        '<div class="fr-rows">' + rowsHtml + '</div>' +
      '</div>';
  }

  root.computeFireReadiness = computeFireReadiness;
  root.renderFireReadinessChecklist = renderFireReadinessChecklist;
  root.computeCategoryDetail = computeCategoryDetail;
  root.renderCategoryChecklist = renderCategoryChecklist;
})(window);
