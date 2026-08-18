// Shared helpers for SplitWise / Split Expenses (split/dashboard.html, split/group.html).
// Balance math, debt simplification, and small display utilities used by
// both pages so they stay consistent.

function escapeHtml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function formatRupees(amount) {
  var n = Math.round((Number(amount) || 0) * 100) / 100;
  return '₹' + n.toLocaleString('en-IN', { maximumFractionDigits: 2 });
}

var AVATAR_COLORS = ['#059669', '#0d9488', '#0891b2', '#2563eb', '#7c3aed', '#c026d3', '#db2777', '#ea580c', '#ca8a04'];

function colorForName(name) {
  var str = String(name || '');
  var hash = 0;
  for (var i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) % 100000;
  }
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

function initialsForName(name) {
  var parts = String(name || '?').trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

// Net balance per member_id: positive = the group owes them, negative = they owe the group.
function computeGroupBalances(members, expenses, shares, settlements) {
  var balances = {};
  members.forEach(function (m) { balances[m.id] = 0; });

  expenses.forEach(function (e) {
    balances[e.paid_by_member_id] = (balances[e.paid_by_member_id] || 0) + Number(e.amount);
  });
  shares.forEach(function (s) {
    balances[s.member_id] = (balances[s.member_id] || 0) - Number(s.share_amount);
  });
  settlements.forEach(function (s) {
    balances[s.from_member_id] = (balances[s.from_member_id] || 0) + Number(s.amount);
    balances[s.to_member_id] = (balances[s.to_member_id] || 0) - Number(s.amount);
  });

  return balances;
}

// Greedy minimal-transaction settle-up: pairs the biggest debtor with the
// biggest creditor repeatedly until everyone nets to zero.
function simplifyDebts(balances, members) {
  var creditors = [], debtors = [];
  members.forEach(function (m) {
    var bal = Math.round((balances[m.id] || 0) * 100) / 100;
    if (bal > 0.5) creditors.push({ id: m.id, name: m.display_name, amount: bal });
    else if (bal < -0.5) debtors.push({ id: m.id, name: m.display_name, amount: -bal });
  });
  creditors.sort(function (a, b) { return b.amount - a.amount; });
  debtors.sort(function (a, b) { return b.amount - a.amount; });

  var transactions = [];
  var ci = 0, di = 0;
  while (ci < creditors.length && di < debtors.length) {
    var c = creditors[ci], d = debtors[di];
    var amt = Math.round(Math.min(c.amount, d.amount) * 100) / 100;
    transactions.push({ fromId: d.id, from: d.name, toId: c.id, to: c.name, amount: amt });
    c.amount = Math.round((c.amount - amt) * 100) / 100;
    d.amount = Math.round((d.amount - amt) * 100) / 100;
    if (c.amount < 0.5) ci++;
    if (d.amount < 0.5) di++;
  }
  return transactions;
}

// Splits `amount` evenly across memberIds, distributing any rounding
// remainder (in paise) across the first few members so shares always sum
// back to exactly `amount`.
function computeEqualShares(amount, memberIds) {
  var n = memberIds.length;
  if (!n) return [];
  var base = Math.floor((amount / n) * 100) / 100;
  var shares = memberIds.map(function () { return base; });
  var remainderCents = Math.round((amount - base * n) * 100);
  for (var i = 0; i < remainderCents; i++) {
    shares[i % n] = Math.round((shares[i % n] + 0.01) * 100) / 100;
  }
  return shares;
}
