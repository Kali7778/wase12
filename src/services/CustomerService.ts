import { BaseService } from './BaseService';
import { toAppError } from '../lib/errors';
import type { Customer, CustomerTerms } from '../models/deliveryNote';
import type { Tables } from '../types/database';

type CustomerRow = Tables<'customers'>;

export interface CustomerInput {
  name: string;
  nameAr?: string | null;
  phone?: string | null;
  terms: CustomerTerms;
  vatNumber?: string | null;
  address?: string | null;
  notes?: string | null;
}

/**
 * The companies that order through the client.
 *
 * A customer is never deleted — slips and, later, bills point at them, so the
 * database refuses it outright and the only way out of the list is to switch
 * a customer off (`isActive`).
 */
export class CustomerService extends BaseService<CustomerRow, Customer & { id: string }> {
  constructor() {
    super('customers', 'Customer');
  }

  protected toModel(row: CustomerRow): Customer & { id: string } {
    return {
      id: row.id,
      name: row.name,
      nameAr: row.name_ar,
      phone: row.phone,
      terms: row.terms,
      vatNumber: row.vat_number,
      address: row.address,
      notes: row.notes,
      isActive: row.is_active,
      createdAt: row.created_at,
    };
  }

  /** Everyone on the list, working customers first. */
  async listAll(includeRetired = true): Promise<Customer[]> {
    let query = this.db.from('customers').select('*').order('name');
    if (!includeRetired) query = query.eq('is_active', true);

    const { data, error } = await query;
    if (error) throw toAppError(error, 'Loading customers');
    return (data ?? []).map((row) => this.toModel(row));
  }

  async add(input: CustomerInput): Promise<Customer> {
    const { data, error } = await this.db
      .from('customers')
      .insert({
        name: input.name.trim(),
        name_ar: input.nameAr?.trim() || null,
        phone: input.phone?.trim() || null,
        terms: input.terms,
        vat_number: input.vatNumber?.trim() || null,
        address: input.address?.trim() || null,
        notes: input.notes?.trim() || null,
      })
      .select()
      .single();

    if (error) throw toAppError(error, 'Adding the customer');
    return this.toModel(data);
  }

  async edit(id: string, input: CustomerInput): Promise<Customer> {
    const { data, error } = await this.db
      .from('customers')
      .update({
        name: input.name.trim(),
        name_ar: input.nameAr?.trim() || null,
        phone: input.phone?.trim() || null,
        terms: input.terms,
        vat_number: input.vatNumber?.trim() || null,
        address: input.address?.trim() || null,
        notes: input.notes?.trim() || null,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw toAppError(error, 'Saving the customer');
    return this.toModel(data);
  }

  /** Retire a customer, or bring one back. */
  async setActive(id: string, isActive: boolean): Promise<void> {
    const { error } = await this.db.from('customers').update({ is_active: isActive }).eq('id', id);
    if (error) throw toAppError(error, isActive ? 'Restoring the customer' : 'Retiring the customer');
  }
}

export const customerService = new CustomerService();
