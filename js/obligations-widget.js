// Reusable "upcoming obligations" indicator for asset list pages (insurance,
// gold, properties). Not a full "asset detail page" widget, since this app
// has no per-item detail pages outside Goals — this drops into an existing
// list row instead. Depends on js/obligations-calc.js and supabaseClient.
(function (root) {
  'use strict';

  var STATUS_LABEL = { overdue: 'overdue', due_soon: 'due soon', upcoming: 'upcoming' };
  var cache = null; // { obligationsBySource: {"type::id": [ {obligation, windows} ]} }

  async function loadAll() {
    if (cache) return cache;

    var { data: obligations, error: obError } = await supabaseClient.from('obligations').select('*')
      .not('linked_source_type', 'is', null).not('linked_source_id', 'is', null);
    if (obError || !obligations || !obligations.length) {
      cache = { obligationsBySource: {} };
      return cache;
    }

    var ids = obligations.map(function (o) { return o.id; });
    var { data: windows, error: winError } = await supabaseClient.from('reminder_windows').select('*').in('obligation_id', ids);
    if (winError) windows = [];

    var windowsByObligation = {};
    (windows || []).forEach(function (w) {
      if (!windowsByObligation[w.obligation_id]) windowsByObligation[w.obligation_id] = [];
      windowsByObligation[w.obligation_id].push(w);
    });

    var obligationsBySource = {};
    obligations.forEach(function (o) {
      var key = o.linked_source_type + '::' + o.linked_source_id;
      if (!obligationsBySource[key]) obligationsBySource[key] = [];
      obligationsBySource[key].push({ obligation: o, windows: windowsByObligation[o.id] || [] });
    });

    cache = { obligationsBySource: obligationsBySource };
    return cache;
  }

  // Renders a compact "🔔 N upcoming/overdue" badge into containerEl for the
  // given (sourceType, sourceId), or nothing if there are no linked
  // obligations. Safe to call for many rows on one page — the underlying
  // fetch is cached per page load.
  async function render(containerEl, sourceType, sourceId) {
    var data = await loadAll();
    var key = sourceType + '::' + sourceId;
    var entries = data.obligationsBySource[key];
    if (!entries || !entries.length) return;

    var today = new Date();
    var worst = 'upcoming';
    var rank = { overdue: 0, due_soon: 1, upcoming: 2 };

    entries.forEach(function (entry) {
      var dueDate = new Date(entry.obligation.due_date + 'T00:00:00');
      var status = ObligationsCalc.computeObligationStatus(dueDate, entry.windows, today);
      if (rank[status] < rank[worst]) worst = status;
    });

    var badge = document.createElement('a');
    badge.href = 'reminders.html';
    badge.title = entries.length + ' obligation(s) linked to this — ' + STATUS_LABEL[worst];
    badge.style.display = 'inline-flex';
    badge.style.alignItems = 'center';
    badge.style.gap = '0.3rem';
    badge.style.padding = '0.15rem 0.5rem';
    badge.style.borderRadius = '999px';
    badge.style.fontSize = '0.7rem';
    badge.style.fontWeight = '700';
    badge.style.textDecoration = 'none';
    badge.style.marginLeft = '0.5rem';
    badge.style.whiteSpace = 'nowrap';

    if (worst === 'overdue') { badge.style.background = '#fef2f2'; badge.style.color = '#dc2626'; }
    else if (worst === 'due_soon') { badge.style.background = '#fffbeb'; badge.style.color = '#b45309'; }
    else { badge.style.background = '#f1f5f9'; badge.style.color = '#64748b'; }

    badge.textContent = '🔔 ' + entries.length + (entries.length === 1 ? '' : '');

    containerEl.appendChild(badge);
  }

  root.ObligationsWidget = { render: render };
})(typeof window !== 'undefined' ? window : this);
