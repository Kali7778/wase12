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

export const EMPLOYEE_KIND_LABEL: Record<EmployeeLedgerKind, string> = {
  shortfall: 'Short on a collection',
  charge: 'Charged',
  repayment: 'Paid back',
  salary_deduction: 'Taken from salary',
};

/** The kinds the GM may add by hand; a shortfall is never typed in. */
export const MANUAL_EMPLOYEE_KINDS: EmployeeLedgerKind[] = [
  'charge',
  'repayment',
  'salary_deduction',
];

/** Charges add to what is owed; the rest take it away. */
export const isCharge = (kind: EmployeeLedgerKind): boolean =>
  kind === 'shortfall' || kind === 'charge';

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
