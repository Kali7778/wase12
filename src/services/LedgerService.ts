import { supabase } from '../lib/supabase';
import { toAppError } from '../lib/errors';
import type {
  CustomerBalance,
  CustomerLedgerEntry,
  EmployeeBalance,
  EmployeeLedgerEntry,
  EmployeeLedgerKind,
} from '../models/ledger';

/**
 * The customer and employee accounts.
 *
 * Reading only, apart from the one entry the GM adds by hand: everything
 * else lands in these ledgers as a side effect of money moving, and the
 * database decides what goes where.
 */
class LedgerServiceImpl {
  /** Every customer with what they owe, biggest debt first. */
  async customerBalances(): Promise<CustomerBalance[]> {
    const { data, error } = await supabase
      .from('v_customer_balances')
      .select('*')
      .order('balance', { ascending: false });

    if (error) throw toAppError(error, 'Loading customer accounts');

    return (data ?? []).map((r) => ({
      customerId: r.customer_id as string,
      customerName: r.customer_name as string,
      customerTerms: r.customer_terms as CustomerBalance['customerTerms'],
      phone: r.phone,
      isActive: Boolean(r.is_active),
      billed: Number(r.billed ?? 0),
      paid: Number(r.paid ?? 0),
      balance: Number(r.balance ?? 0),
      openBills: Number(r.open_bills ?? 0),
      oldestOpen: r.oldest_open,
    }));
  }

  /** One customer's account, oldest entry first. */
  async customerLedger(customerId: string): Promise<CustomerLedgerEntry[]> {
    const { data, error } = await supabase
      .from('v_customer_ledger')
      .select('*')
      .eq('customer_id', customerId)
      .order('entry_date')
      .order('entry_at');

    if (error) throw toAppError(error, 'Loading the account');

    return (data ?? []).map((r) => ({
      entryId: r.entry_id as string,
      entryDate: r.entry_date as string,
      entryKind: r.entry_kind as CustomerLedgerEntry['entryKind'],
      reference: r.reference as string,
      dnNumber: (r.dn_number as string) ?? '',
      note: (r.note as string) ?? '',
      debit: Number(r.debit ?? 0),
      credit: Number(r.credit ?? 0),
      balance: Number(r.balance ?? 0),
      billId: r.bill_id as string,
    }));
  }

  async employeeBalances(): Promise<EmployeeBalance[]> {
    const { data, error } = await supabase
      .from('v_employee_balances')
      .select('*')
      .order('balance', { ascending: false });

    if (error) throw toAppError(error, 'Loading employee accounts');

    return (data ?? []).map((r) => ({
      employeeId: r.employee_id as string,
      employeeName: r.employee_name as string,
      email: r.email as string,
      isActive: Boolean(r.is_active),
      owed: Number(r.owed ?? 0),
      settled: Number(r.settled ?? 0),
      balance: Number(r.balance ?? 0),
      lastEntryOn: r.last_entry_on,
    }));
  }

  async employeeLedger(employeeId: string): Promise<EmployeeLedgerEntry[]> {
    const { data, error } = await supabase
      .from('v_employee_ledger')
      .select('*')
      .eq('employee_id', employeeId)
      .order('occurred_on')
      .order('created_at');

    if (error) throw toAppError(error, 'Loading the ledger');

    return (data ?? []).map((r) => ({
      id: r.id as string,
      employeeId: r.employee_id as string,
      employeeName: r.employee_name as string,
      occurredOn: r.occurred_on as string,
      createdAt: r.created_at as string,
      kind: r.kind as EmployeeLedgerKind,
      description: r.description as string,
      remarks: r.remarks,
      amount: Number(r.amount ?? 0),
      signedAmount: Number(r.signed_amount ?? 0),
      billNumber: r.bill_number,
      createdByName: r.created_by_name,
      balance: Number(r.balance ?? 0),
    }));
  }

  /** The GM's own entry: an advance, a fine, cash back, a deduction (D85). */
  async addEmployeeEntry(input: {
    employeeId: string;
    kind: EmployeeLedgerKind;
    amount: number;
    description: string;
    remarks?: string;
    occurredOn?: string;
  }): Promise<void> {
    const { error } = await supabase.rpc('add_employee_entry', {
      p_employee_id: input.employeeId,
      p_kind: input.kind,
      p_amount: input.amount,
      p_description: input.description.trim(),
      p_remarks: input.remarks?.trim() || undefined,
      p_occurred_on: input.occurredOn || undefined,
    });
    if (error) throw toAppError(error, 'Writing the ledger entry');
  }
}

export const ledgerService = new LedgerServiceImpl();
