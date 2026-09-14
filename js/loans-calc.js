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

  // Walks the loan chronologically from start_date, accruing interest month
  // by month and applying each recorded LoanPayment as a principal-reducing
  // lump sum on its payment_date - "live" outstanding balance, never stored.
  function computeOutstanding(loan, payments, asOfDate) {
    asOfDate = asOfDate || new Date();
    var balance = Number(loan.principal_amount);
    var rate = monthlyRate(Number(loan.interest_rate));
    var sorted = (payments || []).slice().sort(function (a, b) {
      return a.payment_date < b.payment_date ? -1 : (a.payment_date > b.payment_date ? 1 : 0);
    });

    var cursor = loan.start_date;
    sorted.forEach(function (p) {
      var elapsedMonths = monthsBetween(cursor, new Date(p.payment_date + 'T00:00:00'));
      for (var i = 0; i < elapsedMonths; i++) balance += balance * rate;
      balance -= Number(p.amount);
      if (balance < 0) balance = 0;
      cursor = p.payment_date;
    });

    var remainingMonths = monthsBetween(cursor, asOfDate);
    for (var j = 0; j < remainingMonths; j++) balance += balance * rate;

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
    totalInterest: totalInterest,
    computePrepaymentScenario: computePrepaymentScenario
  };
})(typeof window !== 'undefined' ? window : this);
