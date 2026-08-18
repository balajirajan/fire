// Pure calculation functions for the Obligations & Reminders feature.
// No DOM, no Supabase, no globals besides the ObligationsCalc namespace —
// keep it that way so obligations-calc-tests.html can exercise it directly.
(function (root) {
  'use strict';

  var DEFAULT_REMINDER_WINDOWS = {
    insurance: [30, 7],
    tax: [60, 30, 7],
    maintenance: [14],
    warranty: [14],
    document_renewal: [30, 7],
    subscription: [3],
    other: [7]
  };

  // Next due date after completion, per the recurrence rule.
  //   none                -> unchanged; only a manual edit moves it.
  //   annual              -> same month/day, one year forward from the
  //                          CURRENT due date (calendar-anchored, so the
  //                          deadline never drifts even if completed late).
  //   custom_interval_days -> completionDate + interval (completion-anchored,
  //                          so an early/late action shifts the next date).
  function computeNextDueDate(currentDueDate, recurrence, intervalDays, completionDate) {
    if (recurrence === 'annual') {
      var next = new Date(currentDueDate.getTime());
      next.setFullYear(next.getFullYear() + 1);
      return next;
    }
    if (recurrence === 'custom_interval_days') {
      var d = new Date(completionDate.getTime());
      d.setDate(d.getDate() + intervalDays);
      return d;
    }
    return new Date(currentDueDate.getTime());
  }

  // The full "complete obligation" state transition (step 1+2 of the spec's
  // completion flow) as a pure function: given the obligation's current
  // recurrence fields and today's date, returns the new last_completed_date
  // and due_date to persist.
  function completeObligation(currentDueDate, recurrence, intervalDays, completionDate) {
    return {
      lastCompletedDate: new Date(completionDate.getTime()),
      dueDate: computeNextDueDate(currentDueDate, recurrence, intervalDays, completionDate)
    };
  }

  // Live status — never persisted, always recomputed from due_date and the
  // reminder windows. due_soon fires as soon as today enters ANY window
  // (the widest/earliest one first), independent of the notified flag,
  // since notified is only bookkeeping for a future notification channel.
  function computeObligationStatus(dueDate, reminderWindows, today) {
    if (today > dueDate) return 'overdue';

    var enteredAnyWindow = (reminderWindows || []).some(function (w) {
      var windowStart = new Date(dueDate.getTime());
      windowStart.setDate(windowStart.getDate() - w.days_before_due);
      return today >= windowStart;
    });

    return enteredAnyWindow ? 'due_soon' : 'upcoming';
  }

  // Whether a given reminder window has been "entered" as of today — used
  // by the client-side notified-sync check (stands in for the daily
  // background job the spec describes, since this app has no server cron).
  function isWindowEntered(dueDate, daysBeforeDue, today) {
    var windowStart = new Date(dueDate.getTime());
    windowStart.setDate(windowStart.getDate() - daysBeforeDue);
    return today >= windowStart;
  }

  function defaultReminderWindowsForCategory(category) {
    return (DEFAULT_REMINDER_WINDOWS[category] || DEFAULT_REMINDER_WINDOWS.other).slice();
  }

  // obligation.category (what kind of obligation) is a different enum than
  // transactions.category (what kind of expense) — this maps one to the
  // other as a sensible pre-fill for the optional ledger transaction; the
  // user can always edit it before confirming.
  var CATEGORY_TO_TRANSACTION_CATEGORY = {
    insurance: 'bills',
    tax: 'bills',
    document_renewal: 'bills',
    subscription: 'bills',
    maintenance: 'other',
    warranty: 'other',
    other: 'other'
  };

  function mapObligationCategoryToTransactionCategory(category) {
    return CATEGORY_TO_TRANSACTION_CATEGORY[category] || 'other';
  }

  var ObligationsCalc = {
    DEFAULT_REMINDER_WINDOWS: DEFAULT_REMINDER_WINDOWS,
    computeNextDueDate: computeNextDueDate,
    completeObligation: completeObligation,
    computeObligationStatus: computeObligationStatus,
    isWindowEntered: isWindowEntered,
    defaultReminderWindowsForCategory: defaultReminderWindowsForCategory,
    mapObligationCategoryToTransactionCategory: mapObligationCategoryToTransactionCategory
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = ObligationsCalc;
  } else {
    root.ObligationsCalc = ObligationsCalc;
  }
})(typeof window !== 'undefined' ? window : this);
