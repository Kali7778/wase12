import type { ActivatableRecord, UserRole } from './base';

/** A goods supplier — for example, El-Khayyat Gypsum Factories. */
export interface Supplier extends ActivatableRecord {
  code: string;
  nameEn: string;
  nameAr: string | null;
  crNumber: string | null;
  vatNumber: string | null;
  address: string | null;
  phone: string | null;
}

/** Product master record — for example `1290000001`, Bags - Regular 40 kg. */
export interface Item extends ActivatableRecord {
  itemNumber: string;
  descriptionEn: string;
  descriptionAr: string | null;
  uom: string;
  unitWeightKg: number | null;
}

export interface Warehouse extends ActivatableRecord {
  code: string;
  name: string;
  nameAr: string | null;
}

/**
 * Application user. Linked 1:1 to auth.users, which holds the bcrypt password.
 *
 * `role` is derived in the database from the boolean flags by a trigger, so it
 * is read-only here. To change someone's role, call `setFlags()` on the user
 * service rather than assigning to `role`.
 */
export interface AppUser extends ActivatableRecord {
  firstName: string;
  lastName: string;
  email: string;
  isSuperadmin: boolean;
  isGm: boolean;
  isAdmin: boolean;
  isDriver: boolean;
  isWarehouse: boolean;
  readonly role: UserRole;
  phone: string | null;
}

/** Convenience for display — "Ahmed Hassan". */
export function fullName(user: Pick<AppUser, 'firstName' | 'lastName'>): string {
  return [user.firstName, user.lastName].filter(Boolean).join(' ').trim();
}

/** Exactly one flag may be set; `null` means no role yet (viewer). */
export interface RoleFlags {
  isSuperadmin?: boolean;
  isGm?: boolean;
  isAdmin?: boolean;
  isDriver?: boolean;
  isWarehouse?: boolean;
}
