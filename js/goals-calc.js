// Pure calculation functions for the Goal Based Savings feature.
// No DOM, no Supabase, no globals besides the GoalsCalc namespace —
// keep it that way so goals-calc-tests.html can exercise it directly.
(function (root) {
  'use strict';

  function yearsRemaining(fromDate, targetDate) {
    var ms = targetDate.getTime() - fromDate.getTime();
    return Math.max(0, ms / (1000 * 60 * 60 * 24 * 365.25));
  }

  function monthsRemaining(fromDate, targetDate) {
    var months = (targetDate.getFullYear() - fromDate.getFullYear()) * 12 + (targetDate.getMonth() - fromDate.getMonth());
    if (targetDate.getDate() < fromDate.getDate()) months -= 1;
    return Math.max(1, months);
  }

  // 1. Future value needed: today's target inflated to the target date,
  // using the goal's own inflation rate (education/healthcare run hotter
  // than general CPI, so this is per-goal rather than one app-wide number).
  function calcFutureValueNeeded(targetAmount, goalInflationRatePct, fromDate, targetDate) {
    var years = yearsRemaining(fromDate, targetDate);
    return targetAmount * Math.pow(1 + goalInflationRatePct / 100, years);
  }

  // 2. Required monthly contribution: standard future-value-of-annuity
  // formula solved for payment, over the calendar months remaining,
  // compounded monthly at expected_annual_return. Floored at 0 if the
  // goal is already fully funded.
  function calcRequiredMonthlyContribution(currentValue, futureValueNeeded, expectedAnnualReturnPct, fromDate, targetDate) {
    var n = monthsRemaining(fromDate, targetDate);
    var r = (expectedAnnualReturnPct / 100) / 12;
    var futureValueOfCurrent = currentValue * Math.pow(1 + r, n);
    var remaining = futureValueNeeded - futureValueOfCurrent;
    if (remaining <= 0) return 0;
    if (r === 0) return remaining / n;
    var growthFactor = (Math.pow(1 + r, n) - 1) / r;
    return remaining / growthFactor;
  }

  // Average monthly contribution over the last 6 months, or all available
  // history if less than 6 months exists. Returns null when there is no
  // contribution history at all, so callers can show "not enough data"
  // instead of guessing a rate.
  function calcAverageMonthlyContribution(contributions, asOfDate) {
    if (!contributions || !contributions.length) return null;

    var sorted = contributions.slice().sort(function (a, b) {
      return new Date(a.contributed_at) - new Date(b.contributed_at);
    });
    var earliest = new Date(sorted[0].contributed_at);

    var sixMonthsAgo = new Date(asOfDate);
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    var windowStart = earliest > sixMonthsAgo ? earliest : sixMonthsAgo;
    var windowContributions = sorted.filter(function (c) {
      return new Date(c.contributed_at) >= windowStart;
    });
    if (!windowContributions.length) return null;

    var total = windowContributions.reduce(function (sum, c) { return sum + Number(c.amount); }, 0);
    var monthsSpan = Math.max(1,
      (asOfDate.getFullYear() - windowStart.getFullYear()) * 12 +
      (asOfDate.getMonth() - windowStart.getMonth()) + 1
    );
    return total / monthsSpan;
  }

  // 3. Projected completion date: projects the current value forward at
  // expected_annual_return, adding the historical average monthly
  // contribution each month, until it reaches futureValueNeeded. Uses an
  // iterative month-by-month loop (capped at 600 months / 50 years) rather
  // than a closed-form log-solve, since a closed form breaks down when the
  // contribution rate can never actually reach the target.
  function calcProjectedCompletion(currentValue, futureValueNeeded, avgMonthlyContribution, expectedAnnualReturnPct, asOfDate) {
    if (currentValue >= futureValueNeeded) {
      return { status: 'already_funded', date: new Date(asOfDate), months: 0 };
    }
    if (avgMonthlyContribution === null || avgMonthlyContribution === undefined) {
      return { status: 'not_enough_data' };
    }
    if (avgMonthlyContribution <= 0) {
      return { status: 'no_progress' };
    }

    var r = (expectedAnnualReturnPct / 100) / 12;
    var value = currentValue;
    var months = 0;
    var CAP_MONTHS = 600;

    while (value < futureValueNeeded && months < CAP_MONTHS) {
      value = value * (1 + r) + avgMonthlyContribution;
      months++;
    }

    if (months >= CAP_MONTHS && value < futureValueNeeded) {
      return { status: 'too_far', months: CAP_MONTHS };
    }

    var date = new Date(asOfDate);
    date.setMonth(date.getMonth() + months);
    return { status: 'ok', date: date, months: months };
  }

  // Status badge shown on the goals list: compares the projected
  // completion date against the target date.
  function calcStatusBadge(projected, targetDate) {
    if (!projected || projected.status === 'not_enough_data') return 'not_enough_data';
    if (projected.status === 'already_funded') return 'ahead';
    if (projected.status === 'too_far' || projected.status === 'no_progress') return 'behind';

    var diffDays = (targetDate.getTime() - projected.date.getTime()) / (1000 * 60 * 60 * 24);
    if (diffDays > 60) return 'ahead';
    if (diffDays >= -60) return 'on_track';
    return 'behind';
  }

  var GoalsCalc = {
    yearsRemaining: yearsRemaining,
    monthsRemaining: monthsRemaining,
    calcFutureValueNeeded: calcFutureValueNeeded,
    calcRequiredMonthlyContribution: calcRequiredMonthlyContribution,
    calcAverageMonthlyContribution: calcAverageMonthlyContribution,
    calcProjectedCompletion: calcProjectedCompletion,
    calcStatusBadge: calcStatusBadge
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = GoalsCalc;
  } else {
    root.GoalsCalc = GoalsCalc;
  }
})(typeof window !== 'undefined' ? window : this);
