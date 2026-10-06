import type { Enums } from '../types/database';
import type { CustomerTerms } from './deliveryNote';

/**
 * The two accounts a bill can touch (D83, D84, D86).
 *
 * A customer's account is the bills they owe against the money received.
 * An employee's is what they owe the company — a collection that came up
 * short, an advance, a fine — against what has been settled.
 *
 * Neither is ever edited. A wrong entry is answered with an opposite one,
 * which is why both read as a list with a running balance rather than a
 * figure somebody can overwrite.
 */

export type PaymentSource = Enums<'payment_source'>;
export type EmployeeLedgerKind = Enums<'employee_ledger_kind'>;
export type ViolationType = Enums<'violation_type'>;

export const EMPLOYEE_KIND_LABEL: Record<EmployeeLedgerKind, string> = {
  shortfall: 'Short on a collection',
  expense: 'General expense',
  fine: 'Fine',
  charge: 'Charged',
  repayment: 'Paid back',
  salary_deduction: 'Taken from salary',
};

/** One line each, to explain the choice before it is made. */
export const EMPLOYEE_KIND_HINT: Record<EmployeeLedgerKind, string> = {
  shortfall: 'Recorded on its own when a collection comes up short.',
  expense: 'Spent on the job — a meal on the road, parking, tea for the loaders.',
  fine: 'A penalty. Say which rule was broken.',
  charge: 'An advance, or anything else they have to answer for.',
  repayment: 'They handed money back.',
  salary_deduction: "Taken out of a month's salary.",
};

/** The kinds the GM may add by hand; a shortfall is never typed in. */
export const MANUAL_EMPLOYEE_KINDS: EmployeeLedgerKind[] = [
  'expense',
  'fine',
  'charge',
  'repayment',
  'salary_deduction',
];

/**
 * Which way a kind will move the balance.
 *
 * Only for the hint shown while the GM is still choosing: once an entry
 * exists the database says so itself, in `signedAmount`, and that is what
 * the ledger is read from.
 */
export const isCharge = (kind: EmployeeLedgerKind): boolean =>
  kind === 'shortfall' || kind === 'charge' || kind === 'expense' || kind === 'fine';

export const VIOLATION_TYPES: ViolationType[] = [
  'late_arrival',
  'unauthorised_absence',
  'traffic_ticket',
  'cash_mishandling',
  'goods_damaged',
  'vehicle_damage',
  'safety_violation',
  'other',
];

export const VIOLATION_LABEL: Record<ViolationType, string> = {
  late_arrival: 'Late arrival',
  unauthorised_absence: 'Absent without leave',
  traffic_ticket: 'Traffic ticket',
  cash_mishandling: 'Cash mishandled',
  goods_damaged: 'Goods damaged',
  vehicle_damage: 'Vehicle damaged',
  safety_violation: 'Safety rule broken',
  other: 'Other',
};

export interface CustomerLedgerEntry {
  entryId: string;
  entryDate: string;
  entryKind: 'bill' | 'payment';
  reference: string;
  dnNumber: string;
  note: string;
  debit: number;
  credit: number;
  balance: number;
  billId: string;
}

export interface CustomerBalance {
  customerId: string;
  customerName: string;
  customerTerms: CustomerTerms;
  phone: string | null;
  isActive: boolean;
  billed: number;
  paid: number;
  balance: number;
  openBills: number;
  oldestOpen: string | null;
}

export interface EmployeeLedgerEntry {
  id: string;
  employeeId: string;
  employeeName: string;
  occurredOn: string;
  createdAt: string;
  kind: EmployeeLedgerKind;
  /** Set on a fine, null on everything else. */
  violationType: ViolationType | null;
  description: string;
  remarks: string | null;
  amount: number;
  signedAmount: number;
  billNumber: string | null;
  createdByName: string | null;
  balance: number;
}

export interface EmployeeBalance {
  employeeId: string;
  employeeName: string;
  email: string;
  isActive: boolean;
  owed: number;
  settled: number;
  balance: number;
  lastEntryOn: string | null;
}

/** Who the money that did not arrive sits with (D82). */
export type ShortfallOwner = 'driver' | 'customer';
