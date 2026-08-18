// Goal account linking (Phase 3): FinFlow has no single Accounts table, so
// this module fetches "linkable sources" from six different places and
// treats them uniformly as {source_type, source_id, name, category_label,
// current_value}. Not pure — talks to Supabase directly — kept separate
// from js/goals-calc.js so the calculation functions stay dependency-free.
(function (root) {
  'use strict';

  var SOURCE_TYPE_LABEL = {
    account: 'Account',
    other_investment: 'Investment',
    gold_holding: 'Gold',
    property: 'Property',
    portfolio_item: 'Portfolio / Crypto',
    bank_item: 'Bank Balance'
  };

  function sourceKey(sourceType, sourceId) {
    return sourceType + ':' + sourceId;
  }

  // For grid-backed sources (portfolio/crypto/bank), "current value" is
  // whatever was entered for the most recent month, per item.
  async function fetchGridLatestByItem(itemIds, valueField) {
    var result = {};
    if (!itemIds.length) return result;
    var { data, error } = await supabaseClient.from('expense_grid').select('item_id, month, ' + valueField).in('item_id', itemIds);
    if (error || !data) return result;

    var latestRowByItem = {};
    data.forEach(function (row) {
      var existing = latestRowByItem[row.item_id];
      if (!existing || row.month > existing.month) {
        latestRowByItem[row.item_id] = row;
      }
    });
    Object.keys(latestRowByItem).forEach(function (itemId) {
      result[itemId] = Number(latestRowByItem[itemId][valueField]) || 0;
    });
    return result;
  }

  async function fetchGridItems(sections, sourceType, valueField) {
    var { data: groups, error: gErr } = await supabaseClient.from('expense_groups').select('id').in('section', sections);
    if (gErr || !groups || !groups.length) return [];
    var groupIds = groups.map(function (g) { return g.id; });

    var { data: items, error: iErr } = await supabaseClient.from('expense_items').select('id, name').in('group_id', groupIds);
    if (iErr || !items || !items.length) return [];

    var itemIds = items.map(function (i) { return i.id; });
    var valueByItem = await fetchGridLatestByItem(itemIds, valueField);

    return items.map(function (it) {
      return {
        source_type: sourceType,
        source_id: it.id,
        name: it.name,
        category_label: SOURCE_TYPE_LABEL[sourceType],
        current_value: valueByItem[it.id] || 0
      };
    });
  }

  async function fetchLinkableSources() {
    var results = [];

    var { data: accounts } = await supabaseClient.from('accounts').select('id, name, balance').eq('type', 'asset');
    (accounts || []).forEach(function (a) {
      results.push({ source_type: 'account', source_id: a.id, name: a.name, category_label: SOURCE_TYPE_LABEL.account, current_value: Number(a.balance) || 0 });
    });

    var { data: otherInv } = await supabaseClient.from('other_investments').select('id, name, category, current_value');
    (otherInv || []).forEach(function (o) {
      results.push({ source_type: 'other_investment', source_id: o.id, name: o.name, category_label: o.category, current_value: Number(o.current_value) || 0 });
    });

    var { data: gold } = await supabaseClient.from('gold_holdings').select('id, name, grams, current_rate_per_gram');
    (gold || []).forEach(function (g) {
      var value = g.current_rate_per_gram !== null ? Number(g.grams) * Number(g.current_rate_per_gram) : 0;
      results.push({ source_type: 'gold_holding', source_id: g.id, name: g.name, category_label: SOURCE_TYPE_LABEL.gold_holding, current_value: value });
    });

    var { data: properties } = await supabaseClient.from('properties').select('id, name, current_value');
    (properties || []).forEach(function (p) {
      results.push({ source_type: 'property', source_id: p.id, name: p.name, category_label: SOURCE_TYPE_LABEL.property, current_value: Number(p.current_value) || 0 });
    });

    var portfolioItems = await fetchGridItems(['portfolio', 'crypto'], 'portfolio_item', 'current_value');
    results = results.concat(portfolioItems);

    var bankItems = await fetchGridItems(['bank'], 'bank_item', 'amount');
    results = results.concat(bankItems);

    return results;
  }

  async function fetchAllGoalLinks() {
    var { data, error } = await supabaseClient.from('goal_links').select('*');
    if (error) { console.error('Could not load goal links', error); return []; }
    return data || [];
  }

  function buildSourceMap(sources) {
    var map = {};
    sources.forEach(function (s) { map[sourceKey(s.source_type, s.source_id)] = s; });
    return map;
  }

  function linksForGoal(allLinks, goalId) {
    return allLinks.filter(function (l) { return l.goal_id === goalId; });
  }

  // A goal's current value comes from its linked sources once any exist;
  // manual_current_value is only the fallback for goals with no links yet.
  function currentValueForGoal(goal, allLinks, sourceMap) {
    var links = linksForGoal(allLinks, goal.id);
    if (!links.length) return Number(goal.manual_current_value) || 0;
    return links.reduce(function (sum, l) {
      var src = sourceMap[sourceKey(l.source_type, l.source_id)];
      return sum + (src ? src.current_value : 0);
    }, 0);
  }

  function linkedItemsForGoal(allLinks, goalId, sourceMap) {
    return linksForGoal(allLinks, goalId).map(function (l) {
      var src = sourceMap[sourceKey(l.source_type, l.source_id)];
      return {
        link_id: l.id,
        source_type: l.source_type,
        source_id: l.source_id,
        name: src ? src.name : '(removed elsewhere)',
        category_label: src ? src.category_label : SOURCE_TYPE_LABEL[l.source_type],
        current_value: src ? src.current_value : 0
      };
    });
  }

  // v1 rule: an account can only be linked to one goal — exclude anything
  // already linked to any goal from the picker.
  function availableSources(allSources, allLinks) {
    var linkedKeys = {};
    allLinks.forEach(function (l) { linkedKeys[sourceKey(l.source_type, l.source_id)] = true; });
    return allSources.filter(function (s) { return !linkedKeys[sourceKey(s.source_type, s.source_id)]; });
  }

  function linkSource(goalId, sourceType, sourceId) {
    return supabaseClient.from('goal_links').insert({ goal_id: goalId, source_type: sourceType, source_id: sourceId });
  }

  function unlinkSource(linkId) {
    return supabaseClient.from('goal_links').delete().eq('id', linkId);
  }

  var GoalLinks = {
    SOURCE_TYPE_LABEL: SOURCE_TYPE_LABEL,
    fetchLinkableSources: fetchLinkableSources,
    fetchAllGoalLinks: fetchAllGoalLinks,
    buildSourceMap: buildSourceMap,
    linksForGoal: linksForGoal,
    currentValueForGoal: currentValueForGoal,
    linkedItemsForGoal: linkedItemsForGoal,
    availableSources: availableSources,
    linkSource: linkSource,
    unlinkSource: unlinkSource
  };

  root.GoalLinks = GoalLinks;
})(typeof window !== 'undefined' ? window : this);
