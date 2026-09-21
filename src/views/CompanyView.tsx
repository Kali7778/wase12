import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Building, ImageUp, Loader2 } from 'lucide-react';
import { PageHeader, Panel } from '../components/ui/Panel';
import { Button } from '../components/ui/Button';
import { Field, Input } from '../components/ui/Field';
import { useAuth } from '../context/AuthContext';
import { pricingService } from '../services/PricingService';
import type { CompanyProfile } from '../models/pricing';

type Form = Omit<CompanyProfile, 'updatedAt'>;

const EMPTY: Form = {
  nameEn: '',
  nameAr: '',
  addressEn: '',
  addressAr: '',
  phone: '',
  crNumber: '',
  vatNumber: '',
  logoPath: null,
};

/**
 * The company at the head of every bill (D65).
 *
 * Only the GM or a superadmin may change it; everyone else sees what will
 * be printed. The CR and VAT numbers are checked by the database against
 * the Saudi formats, so a mistyped number is caught here rather than on a
 * bill already handed to a customer.
 */
export const CompanyView: React.FC = () => {
  const { can } = useAuth();
  const canEdit = can('gm', 'ceo');

  const [form, setForm] = useState<Form>(EMPTY);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const showLogo = async (path: string | null) => {
    setLogoUrl(path ? await pricingService.logoUrl(path) : null);
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const profile = await pricingService.getCompany();
      if (profile) {
        const { updatedAt: at, ...rest } = profile;
        setForm({ ...EMPTY, ...rest });
        setUpdatedAt(at);
        await showLogo(profile.logoPath);
      }
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load the company details');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const set = (key: keyof Form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const pickLogo = async (file: File | undefined) => {
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const path = await pricingService.uploadLogo(file);
      setForm((f) => ({ ...f, logoPath: path }));
      await showLogo(path);
      setNotice('Logo uploaded. Save to use it on bills.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not upload the logo');
    } finally {
      setUploading(false);
    }
  };

  const save = async () => {
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      await pricingService.saveCompany(form);
      setNotice('Saved. Every new bill will carry these details.');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save the company details');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-16 text-micro text-ink-faint">
        <Loader2 className="w-4 h-4 animate-spin" />
        Loading the company details…
      </div>
    );
  }

  return (
    <div id="company-view" className="space-y-5">
      <PageHeader
        title="Company details"
        description="Printed at the head of every bill. Only the GM or a superadmin can change them."
        stats={
          updatedAt && form.nameEn
            ? [{ label: 'last saved', value: new Date(updatedAt).toLocaleDateString() }]
            : undefined
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

      {!form.nameEn && !canEdit && (
        <p className="px-3 py-2 rounded-control border border-line text-micro text-ink-soft bg-raised">
          Not filled in yet. Bills cannot carry the company's details until the GM adds them.
        </p>
      )}

      <Panel title="Name and address">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Company name (English)" htmlFor="co-name-en" required>
            <Input id="co-name-en" value={form.nameEn ?? ''} onChange={set('nameEn')} disabled={!canEdit} />
          </Field>
          <Field label="Company name (Arabic)" htmlFor="co-name-ar">
            <Input id="co-name-ar" dir="rtl" value={form.nameAr ?? ''} onChange={set('nameAr')} disabled={!canEdit} />
          </Field>
          <Field label="Address (English)" htmlFor="co-address-en">
            <Input id="co-address-en" value={form.addressEn ?? ''} onChange={set('addressEn')} disabled={!canEdit} />
          </Field>
          <Field label="Address (Arabic)" htmlFor="co-address-ar">
            <Input id="co-address-ar" dir="rtl" value={form.addressAr ?? ''} onChange={set('addressAr')} disabled={!canEdit} />
          </Field>
          <Field label="Phone" htmlFor="co-phone">
            <Input id="co-phone" value={form.phone ?? ''} onChange={set('phone')} disabled={!canEdit} />
          </Field>
        </div>
      </Panel>

      <Panel title="Registration">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="CR number" htmlFor="co-cr" hint="Commercial registration — ten digits.">
            <Input id="co-cr" inputMode="numeric" value={form.crNumber ?? ''} onChange={set('crNumber')} disabled={!canEdit} />
          </Field>
          <Field
            label="VAT number"
            htmlFor="co-vat"
            hint="Fifteen digits, starting and ending with 3. Kept now, used on bills once VAT is switched on."
          >
            <Input id="co-vat" inputMode="numeric" value={form.vatNumber ?? ''} onChange={set('vatNumber')} disabled={!canEdit} />
          </Field>
        </div>
      </Panel>

      <Panel title="Logo" description="PNG, JPEG or WebP, up to 2 MB.">
        <div className="flex flex-wrap items-center gap-4">
          <div className="w-40 h-24 rounded-control border border-line bg-sunken flex items-center justify-center overflow-hidden">
            {logoUrl ? (
              <img src={logoUrl} alt="Company logo" className="max-w-full max-h-full object-contain" />
            ) : (
              <Building className="w-6 h-6 text-ink-faint" />
            )}
          </div>
          {canEdit && (
            <>
              <input
                ref={fileRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={(e) => {
                  void pickLogo(e.target.files?.[0]);
                  e.target.value = '';
                }}
              />
              <Button variant="secondary" icon={ImageUp} loading={uploading} onClick={() => fileRef.current?.click()}>
                {form.logoPath ? 'Replace logo' : 'Upload logo'}
              </Button>
              {form.logoPath && (
                <Button
                  variant="ghost"
                  onClick={() => {
                    setForm((f) => ({ ...f, logoPath: null }));
                    setLogoUrl(null);
                  }}
                >
                  Remove
                </Button>
              )}
            </>
          )}
        </div>
      </Panel>

      {canEdit && (
        <div className="flex items-center gap-2">
          <Button variant="primary" loading={saving} onClick={() => void save()} disabled={!form.nameEn?.trim()}>
            Save company details
          </Button>
          <Button variant="ghost" onClick={() => void load()}>
            Discard changes
          </Button>
        </div>
      )}
    </div>
  );
};
