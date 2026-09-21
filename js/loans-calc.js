// Pure loan amortization math for the standalone Loan/EMI tracker
// (loan_accounts/loan_account_payments) - no DOM, no Supabase, so it can be
// unit-tested the same way goals-calc.js/obligations-calc.js are.
(function (root) {
  'use strict';

  function monthlyRate(annualRatePct) {
    return annualRatePct / 12 / 100;
  }

  function addMonths(dateStr, n) {
    var d = new Date(dateStr + 'T00:00:00');
    d.setMonth(d.getMonth() + n);
    return d;
  }

  function monthsBetween(fromStr, toDate) {
    var from = new Date(fromStr + 'T00:00:00');
    var months = (toDate.getFullYear() - from.getFullYear()) * 12 + (toDate.getMonth() - from.getMonth());
    if (toDate.getDate() < from.getDate()) months -= 1;
    return Math.max(0, months);
  }

  // Walks the loan chronologically from start_date, amortizing the regular
  // monthly_emi (interest first, remainder off principal) every elapsed
  // month and additionally applying each recorded LoanPayment as an extra
  // principal-reducing lump sum on its payment_date - "live" outstanding
  // balance, never stored.
  function computeOutstanding(loan, payments, asOfDate) {
    asOfDate = asOfDate || new Date();
    var rate = monthlyRate(Number(loan.interest_rate));
    var emi = Number(loan.monthly_emi);
    var sorted = (payments || []).slice().sort(function (a, b) {
      return a.payment_date < b.payment_date ? -1 : (a.payment_date > b.payment_date ? 1 : 0);
    });

    function amortizeMonths(bal, months) {
      for (var i = 0; i < months && bal > 0.5; i++) {
        var interest = bal * rate;
        var principal = Math.min(emi - interest, bal);
        if (principal <= 0) return bal; // EMI too small to cover interest - stalls
        bal -= principal;
      }
      return Math.max(0, bal);
    }

    var balance = Number(loan.principal_amount);
    var cursor = loan.start_date;
    sorted.forEach(function (p) {
      var elapsedMonths = monthsBetween(cursor, new Date(p.payment_date + 'T00:00:00'));
      balance = amortizeMonths(balance, elapsedMonths);
      balance -= Number(p.amount);
      if (balance < 0) balance = 0;
      cursor = p.payment_date;
    });

    var remainingMonths = monthsBetween(cursor, asOfDate);
    balance = amortizeMonths(balance, remainingMonths);

    return Math.max(0, balance);
  }

  // Full theoretical schedule assuming the stored monthly_emi is paid every
  // month from start_date, ignoring actual recorded payments - this is the
  // "what the loan looks like on paper" table, capped at tenure_months+2 as
  // a safety net against a monthly_emi too small to ever amortize principal.
  function computeAmortizationSchedule(loan) {
    var balance = Number(loan.principal_amount);
    var rate = monthlyRate(Number(loan.interest_rate));
    var emi = Number(loan.monthly_emi);
    var rows = [];
    var maxRows = Number(loan.tenure_months) + 2;

    for (var i = 1; i <= maxRows && balance > 0.5; i++) {
      var interest = balance * rate;
      var principal = Math.min(emi - interest, balance);
      if (principal < 0) principal = 0; // EMI doesn't even cover interest - schedule stalls
      balance -= principal;
      rows.push({
        month: i,
        date: addMonths(loan.start_date, i),
        interest: interest,
        principal: principal,
        emi: interest + principal,
        balance: Math.max(0, balance)
      });
      if (interest >= emi) break; // EMI too small to ever pay this off
    }
    return rows;
  }

  function totalInterest(schedule) {
    return schedule.reduce(function (sum, r) { return sum + r.interest; }, 0);
  }

  // Standard EMI formula - EMI = P × r × (1+r)^n / ((1+r)^n − 1). Used for the
  // live preview in the add/edit loan form; the caller decides whether to
  // store this or a user-typed EMI, this function never gets to overwrite
  // a stored value on its own.
  function calculateEmi(principal, annualRatePct, tenureMonths) {
    var p = Number(principal), n = Number(tenureMonths);
    var r = monthlyRate(Number(annualRatePct));
    if (!p || !n || p <= 0 || n <= 0) return 0;
    if (!r) return p / n; // 0% loan - just split principal evenly
    var factor = Math.pow(1 + r, n);
    return (p * r * factor) / (factor - 1);
  }

  // Continues amortizing forward from today's real outstanding balance
  // (already net of any recorded payments) at the loan's stored EMI, to find
  // the payoff date and interest still to be paid - distinct from
  // computeAmortizationSchedule above, which always starts from the original
  // principal and ignores recorded payments entirely.
  function computeRemainingSchedule(loan, outstandingBalance) {
    var balance = Number(outstandingBalance);
    var rate = monthlyRate(Number(loan.interest_rate));
    var emi = Number(loan.monthly_emi);
    var rows = [];
    var maxMonths = 1200;

    for (var i = 1; i <= maxMonths && balance > 0.5; i++) {
      var interest = balance * rate;
      var principal = Math.min(emi - interest, balance);
      if (principal <= 0) break; // EMI too small to ever pay this off
      balance -= principal;
      rows.push({ month: i, interest: interest, principal: principal, balance: Math.max(0, balance) });
    }
    return rows;
  }

  // "What if I paid `extraAmount` extra right now, on top of the current
  // outstanding balance, and kept paying the same EMI?" - a one-time
  // prepayment, the common Indian-loan meaning of the term, not a recurring
  // top-up. Returns months saved and interest saved vs. the no-prepayment path.
  function computePrepaymentScenario(loan, currentOutstanding, extraAmount) {
    var rate = monthlyRate(Number(loan.interest_rate));
    var emi = Number(loan.monthly_emi);

    function amortizeFrom(balance) {
      var months = 0, interestPaid = 0;
      while (balance > 0.5 && months < 1200) {
        var interest = balance * rate;
        var principal = Math.min(emi - interest, balance);
        if (principal <= 0) return { months: Infinity, interestPaid: Infinity }; // never pays off
        balance -= principal;
        interestPaid += interest;
        months++;
      }
      return { months: months, interestPaid: interestPaid };
    }

    var withoutPrepay = amortizeFrom(currentOutstanding);
    var withPrepay = amortizeFrom(Math.max(0, currentOutstanding - extraAmount));

    return {
      monthsSaved: withoutPrepay.months === Infinity ? 0 : withoutPrepay.months - withPrepay.months,
      interestSaved: withoutPrepay.interestPaid === Infinity ? 0 : withoutPrepay.interestPaid - withPrepay.interestPaid,
      newPayoffMonths: withPrepay.months
    };
  }

  root.LoansCalc = {
    monthlyRate: monthlyRate,
    computeOutstanding: computeOutstanding,
    computeAmortizationSchedule: computeAmortizationSchedule,
    computeRemainingSchedule: computeRemainingSchedule,
    totalInterest: totalInterest,
    computePrepaymentScenario: computePrepaymentScenario,
    calculateEmi: calculateEmi
  };
})(typeof window !== 'undefined' ? window : this);
