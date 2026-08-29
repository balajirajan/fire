// Linkable-asset lookup for Obligations. Builds on GoalLinks' six source
// types (js/goal-links.js must be loaded first) and adds a seventh —
// insurance policies — since insurance isn't a net-worth asset a Goal would
// ever link to, but an Obligation ("car insurance renewal") explicitly
// needs it. Not pure — talks to Supabase directly.
(function (root) {
  'use strict';

  function titleCase(s) {
    if (!s) return '';
    return s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, ' ');
  }

  async function fetchInsurancePolicies() {
    var { data, error } = await supabaseClient.from('insurance_policies').select('id, insurer, policy_type, sum_assured');
    if (error || !data) return [];
    return data.map(function (p) {
      var name = (p.insurer || 'Unknown insurer') + ' - ' + titleCase(p.policy_type || 'policy');
      return {
        source_type: 'insurance_policy',
        source_id: p.id,
        name: name,
        category_label: 'Insurance Policy',
        current_value: Number(p.sum_assured) || 0
      };
    });
  }

  async function fetchAllLinkableAssets() {
    var baseSources = (typeof GoalLinks !== 'undefined') ? await GoalLinks.fetchLinkableSources() : [];
    var insuranceSources = await fetchInsurancePolicies();
    return baseSources.concat(insuranceSources);
  }

  function findAsset(assets, sourceType, sourceId) {
    if (!sourceType || !sourceId) return null;
    for (var i = 0; i < assets.length; i++) {
      if (assets[i].source_type === sourceType && assets[i].source_id === sourceId) return assets[i];
    }
    return null;
  }

  var ObligationsLinks = {
    fetchAllLinkableAssets: fetchAllLinkableAssets,
    findAsset: findAsset
  };

  root.ObligationsLinks = ObligationsLinks;
})(typeof window !== 'undefined' ? window : this);
