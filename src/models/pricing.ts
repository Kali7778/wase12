/**
 * What products sell for, and who is selling them (Phase B).
 *
 * A price is never edited: setting a new one adds a row, so each product
 * carries its whole price history (D53, D63). A bill will copy the price
 * onto its own line, so a later change never rewrites an old bill.
 */

/** A product with the price it sells for now — `price` is null if never set. */
export interface ItemCurrentPrice {
  itemId: string;
  itemNumber: string;
  descriptionEn: string;
  descriptionAr: string | null;
  uom: string;
  isActive: boolean;
  price: number | null;
  priceSince: string | null;
  priceNote: string | null;
  priceSetByName: string | null;
}

/** One change of price, with the figure it replaced. */
export interface ItemPriceChange {
  id: string;
  itemId: string;
  itemNumber: string;
  price: number;
  previousPrice: number | null;
  note: string | null;
  createdAt: string;
  setByName: string | null;
}

/** The client's own details, printed at the head of every bill (D65). */
export interface CompanyProfile {
  nameEn: string | null;
  nameAr: string | null;
  addressEn: string | null;
  addressAr: string | null;
  phone: string | null;
  crNumber: string | null;
  vatNumber: string | null;
  logoPath: string | null;
  updatedAt: string;
}

/** SAR with two decimals, the way it will appear on a bill. */
export const formatSar = (value: number): string =>
  value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
