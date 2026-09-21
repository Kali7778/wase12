import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Building2, Loader2, Plus, RefreshCw } from 'lucide-react';
import { EmptyState, PageHeader, Panel } from '../components/ui/Panel';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Field, Input, Select, Textarea } from '../components/ui/Field';
import { customerService, type CustomerInput } from '../services/CustomerService';
import { TERMS_LABEL, type Customer, type CustomerTerms } from '../models/deliveryNote';

/**
 * The companies that order through the client.
 *
 * Two kinds, and the difference decides everything that follows (D51): a
 * weekly customer runs an account and will have a ledger to settle; a cash
 * customer pays on the spot and only needs a name on the bill.
 *
 * Nobody is ever deleted. Slips point at these records, so a customer who
 * stops buying is switched off and keeps their history.
 */
const BLANK: CustomerInput = {
  name: '',
  nameAr: '',
  phone: '',
  terms: 'cash',
  vatNumber: '',
  address: '',
  notes: '',
};

export const CustomerListView: React.FC = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [showRetired, setShowRetired] = useState(false);
  const [form, setForm] = useState<CustomerInput | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setCustomers(await customerService.listAll());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load the customers');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const shown = useMemo(() => {
    const term = search.trim().toLowerCase();
    return customers
      .filter((c) => showRetired || c.isActive)
      .filter(
        (c) =>
          term === '' ||
          c.name.toLowerCase().includes(term) ||
          (c.nameAr ?? '').toLowerCase().includes(term) ||
          (c.phone ?? '').includes(term),
      );
  }, [customers, search, showRetired]);

  const startAdd = () => {
    setEditingId(null);
    setForm({ ...BLANK });
    setNotice(null);
    setError(null);
  };

  const startEdit = (c: Customer) => {
    setEditingId(c.id);
    setForm({
      name: c.name,
      nameAr: c.nameAr ?? '',
      phone: c.phone ?? '',
      terms: c.terms,
      vatNumber: c.vatNumber ?? '',
      address: c.address ?? '',
      notes: c.notes ?? '',
    });
    setNotice(null);
    setError(null);
  };

  const save = async () => {
    if (!form || form.name.trim() === '') return;
    setSaving(true);
    setError(null);
    try {
      if (editingId) {
        await customerService.edit(editingId, form);
        setNotice(`Saved ${form.name.trim()}.`);
      } else {
        await customerService.add(form);
        setNotice(`Added ${form.name.trim()}.`);
      }
      setForm(null);
      setEditingId(null);
      await refresh();
    } catch (err) {
      // The database keeps one record per company, so a second entry under
      // the same name comes back as a unique-key failure. Say what it means.
      const raw = err instanceof Error ? err.message : 'Could not save the customer';
      setError(
        raw.includes('customers_name_key') ? 'That customer is already on the list.' : raw,
      );
    } finally {
      setSaving(false);
    }
  };

  const setActive = async (c: Customer, isActive: boolean) => {
    setError(null);
    try {
      await customerService.setActive(c.id, isActive);
      setNotice(isActive ? `${c.name} is back on the list.` : `${c.name} is retired.`);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not change the customer');
    }
  };

  const working = customers.filter((c) => c.isActive);

  return (
    <div id="customers-view" className="space-y-5">
      <PageHeader
        title="Customers"
        description="Companies that order through us. A weekly customer runs an account; a cash customer pays on the spot."
        stats={[
          { label: 'on the list', value: working.length },
          { label: 'weekly account', value: working.filter((c) => c.terms === 'weekly').length },
          { label: 'retired', value: customers.length - working.length },
        ]}
        actions={
          <>
            <Button variant="secondary" icon={RefreshCw} onClick={() => void refresh()}>
              Refresh
            </Button>
            <Button variant="primary" icon={Plus} onClick={startAdd}>
              Add a customer
            </Button>
          </>
        }
      />

      {error && (
        <p className="px-3 py-2 rounded-control border border-risk text-micro text-risk bg-risk-soft">
          {error}
        </p>
      )}
      {notice && !error && (
        <p className="px-3 py-2 rounded-control border border-line text-micro text-ink-soft bg-raised">
          {notice}
        </p>
      )}

      {form && (
        <Panel
          title={editingId ? 'Edit customer' : 'New customer'}
          description="The name is what appears on their bills, so write it the way they do."
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Name" required htmlFor="cust-name">
              <Input
                id="cust-name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Company name"
              />
            </Field>

            <Field label="Name in Arabic" htmlFor="cust-name-ar">
              <Input
                id="cust-name-ar"
                dir="rtl"
                value={form.nameAr ?? ''}
                onChange={(e) => setForm({ ...form, nameAr: e.target.value })}
              />
            </Field>

            <Field label="How they pay" required htmlFor="cust-terms">
              <Select
                id="cust-terms"
                value={form.terms}
                onChange={(e) => setForm({ ...form, terms: e.target.value as CustomerTerms })}
              >
                <option value="cash">{TERMS_LABEL.cash}</option>
                <option value="weekly">{TERMS_LABEL.weekly}</option>
              </Select>
            </Field>

            <Field label="Phone" htmlFor="cust-phone">
              <Input
                id="cust-phone"
                value={form.phone ?? ''}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </Field>

            <Field label="VAT number" htmlFor="cust-vat" hint="Optional — needed later for tax bills.">
              <Input
                id="cust-vat"
                value={form.vatNumber ?? ''}
                onChange={(e) => setForm({ ...form, vatNumber: e.target.value })}
              />
            </Field>

            <Field label="Address" htmlFor="cust-address">
              <Input
                id="cust-address"
                value={form.address ?? ''}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
              />
            </Field>

            <Field label="Notes" htmlFor="cust-notes" className="sm:col-span-2">
              <Textarea
                id="cust-notes"
                rows={2}
                value={form.notes ?? ''}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </Field>
          </div>

          <div className="flex items-center gap-2 mt-4">
            <Button variant="primary" onClick={() => void save()} loading={saving} disabled={form.name.trim() === ''}>
              {editingId ? 'Save changes' : 'Add customer'}
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                setForm(null);
                setEditingId(null);
              }}
            >
              Cancel
            </Button>
          </div>
        </Panel>
      )}

      <Panel
        flush
        title="The list"
        actions={
          <>
            <Input
              inputSize="sm"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search a name or phone"
              className="w-48"
            />
            <label className="flex items-center gap-1.5 text-micro text-ink-soft cursor-pointer whitespace-nowrap">
              <input
                type="checkbox"
                checked={showRetired}
                onChange={(e) => setShowRetired(e.target.checked)}
                className="w-3.5 h-3.5 cursor-pointer"
              />
              Show retired
            </label>
          </>
        }
      >
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-12 text-micro text-ink-faint">
            <Loader2 className="w-4 h-4 animate-spin" />
            Loading customers…
          </div>
        ) : shown.length === 0 ? (
          <EmptyState
            icon={Building2}
            title={customers.length === 0 ? 'No customers yet' : 'Nothing matches that'}
            description={
              customers.length === 0
                ? 'Add the companies that order through you. A slip that goes straight to a customer needs one of these names on it.'
                : 'Try another name, or switch on retired customers.'
            }
            action={customers.length === 0 ? <Button icon={Plus} onClick={startAdd}>Add a customer</Button> : undefined}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-tiny">
              <thead className="bg-sunken text-micro text-ink-faint">
                <tr>
                  <th className="text-left font-medium px-4 py-2">Customer</th>
                  <th className="text-left font-medium px-4 py-2">Pays</th>
                  <th className="text-left font-medium px-4 py-2">Phone</th>
                  <th className="text-left font-medium px-4 py-2">Address</th>
                  <th className="px-4 py-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {shown.map((c) => (
                  <tr key={c.id} className={c.isActive ? '' : 'opacity-60'}>
                    <td className="px-4 py-2.5">
                      <span className="font-semibold text-ink">{c.name}</span>
                      {c.nameAr && (
                        <span className="block text-micro text-ink-faint" dir="rtl">
                          {c.nameAr}
                        </span>
                      )}
                      {!c.isActive && (
                        <Badge tone="neutral" subtle className="mt-1">
                          Retired
                        </Badge>
                      )}
                    </td>
                    <td className="px-4 py-2.5">
                      <Badge tone={c.terms === 'weekly' ? 'accent' : 'neutral'} subtle>
                        {TERMS_LABEL[c.terms]}
                      </Badge>
                    </td>
                    <td className="px-4 py-2.5 text-ink-soft" data-numeric>
                      {c.phone || '—'}
                    </td>
                    <td className="px-4 py-2.5 text-ink-soft max-w-xs truncate">
                      {c.address || '—'}
                    </td>
                    <td className="px-4 py-2.5 text-right whitespace-nowrap">
                      <Button variant="ghost" size="sm" onClick={() => startEdit(c)}>
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => void setActive(c, !c.isActive)}
                      >
                        {c.isActive ? 'Retire' : 'Restore'}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  );
};
