import { supabase } from '../lib/supabase';
import { toAppError } from '../lib/errors';
import type { CompanyProfile, ItemCurrentPrice, ItemPriceChange } from '../models/pricing';

/** The private bucket that holds the company logo (migration 0031). */
export const COMPANY_ASSETS_BUCKET = 'company-assets';

/**
 * Selling prices and the company profile.
 *
 * Every write goes through a database function — `set_item_price` and
 * `save_company_profile` — which carries the rules (who may, what is a
 * valid price, what a CR or VAT number looks like). Nothing is checked
 * here that the database does not check itself.
 */
class PricingServiceImpl {
  /** Every product with its current price; unpriced ones included. */
  async listCurrentPrices(): Promise<ItemCurrentPrice[]> {
    const { data, error } = await supabase
      .from('v_item_current_price')
      .select('*')
      .order('item_number');

    if (error) throw toAppError(error, 'Loading prices');

    return (data ?? []).map((row) => ({
      itemId: row.item_id as string,
      itemNumber: row.item_number as string,
      descriptionEn: row.description_en as string,
      descriptionAr: row.description_ar,
      uom: row.uom as string,
      isActive: Boolean(row.is_active),
      price: row.price === null ? null : Number(row.price),
      priceSince: row.price_since,
      priceNote: row.price_note,
      priceSetByName: row.price_set_by_name,
    }));
  }

  /** The price changes of one product, newest first. */
  async listHistory(itemId: string, limit = 50): Promise<ItemPriceChange[]> {
    const { data, error } = await supabase
      .from('v_item_price_history')
      .select('*')
      .eq('item_id', itemId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw toAppError(error, 'Loading the price history');

    return (data ?? []).map((row) => ({
      id: row.id as string,
      itemId: row.item_id as string,
      itemNumber: row.item_number as string,
      price: Number(row.price),
      previousPrice: row.previous_price === null ? null : Number(row.previous_price),
      note: row.note,
      createdAt: row.created_at as string,
      setByName: row.set_by_name,
    }));
  }

  async setPrice(itemId: string, price: number, note?: string): Promise<void> {
    const { error } = await supabase.rpc('set_item_price', {
      p_item_id: itemId,
      p_price: price,
      p_note: note?.trim() || undefined,
    });
    if (error) throw toAppError(error, 'Setting the price');
  }

  async getCompany(): Promise<CompanyProfile | null> {
    const { data, error } = await supabase.from('company_profile').select('*').maybeSingle();
    if (error) throw toAppError(error, 'Loading the company details');
    if (!data) return null;

    return {
      nameEn: data.name_en,
      nameAr: data.name_ar,
      addressEn: data.address_en,
      addressAr: data.address_ar,
      phone: data.phone,
      crNumber: data.cr_number,
      vatNumber: data.vat_number,
      logoPath: data.logo_path,
      updatedAt: data.updated_at,
    };
  }

  async saveCompany(profile: Omit<CompanyProfile, 'updatedAt'>): Promise<void> {
    const { error } = await supabase.rpc('save_company_profile', {
      p_name_en: profile.nameEn ?? '',
      p_name_ar: profile.nameAr ?? '',
      p_address_en: profile.addressEn ?? '',
      p_address_ar: profile.addressAr ?? '',
      p_phone: profile.phone ?? '',
      p_cr_number: profile.crNumber ?? '',
      p_vat_number: profile.vatNumber ?? '',
      p_logo_path: profile.logoPath ?? '',
    });
    if (error) throw toAppError(error, 'Saving the company details');
  }

  /**
   * Uploads a logo under a name of its own and returns the path. Files in
   * the bucket are never overwritten; the profile points at the one in use,
   * and nothing changes on a bill until the profile is saved.
   */
  async uploadLogo(file: File): Promise<string> {
    const ext = (file.name.split('.').pop() || 'png').toLowerCase();
    const path = `logo/${Date.now()}.${ext}`;
    const { error } = await supabase.storage
      .from(COMPANY_ASSETS_BUCKET)
      .upload(path, file, { contentType: file.type, upsert: false });
    if (error) throw toAppError(error, 'Uploading the logo');
    return path;
  }

  async logoUrl(path: string, expiresInSeconds = 3600): Promise<string | null> {
    const { data, error } = await supabase.storage
      .from(COMPANY_ASSETS_BUCKET)
      .createSignedUrl(path, expiresInSeconds);
    if (error) return null;
    return data?.signedUrl ?? null;
  }
}

export const pricingService = new PricingServiceImpl();
