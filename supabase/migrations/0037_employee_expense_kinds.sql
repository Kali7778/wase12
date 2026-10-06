-- =====================================================================
--  0037 — Two more things an employee ledger has to hold
--
--  The GM asked for what a driver costs on the road to sit in the same
--  ledger as what he owes: the meal he ate on the way, and the fine he
--  earned. Both are the employee's to answer for (D87) — a meal taken
--  out of the day's cash is not the company's gift, it is money that
--  left the till with his name on it.
--
--  `charge` already carried both before this, which meant nobody could
--  tell an advance apart from a traffic ticket when the month closed.
--  They are their own kinds now.
--
--  A new enum value cannot be used in the transaction that adds it, so
--  this migration adds the values and nothing else; 0038 puts them to
--  work.
-- =====================================================================

alter type employee_ledger_kind add value if not exists 'expense' after 'charge';
alter type employee_ledger_kind add value if not exists 'fine'    after 'expense';
