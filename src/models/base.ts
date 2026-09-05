import type { Enums } from '../types/database';

/**
 * Foundation for all domain models.
 *
 * Every model extends `BaseRecord`. This is `interface extends` inheritance,
 * which is exactly where inheritance belongs in TypeScript (CLAUDE.md / D3).
 * React COMPONENTS never use inheritance — they use composition.
 *
 * The database speaks snake_case; domain models speak camelCase.
 * Translation happens inside Services, so database naming never reaches the UI.
 */
export interface BaseRecord {
  id: string;
  createdAt: string;
}

/** A record that tracks who created it. */
export interface AuditedRecord extends BaseRecord {
  createdBy: string | null;
}

/** A record that can be deactivated instead of deleted. */
export interface ActivatableRecord extends BaseRecord {
  isActive: boolean;
}

export type UserRole = Enums<'user_role'>;
export type DnStatus = Enums<'dn_status'>;
export type MovementDirection = Enums<'movement_direction'>;
export type MovementType = Enums<'movement_type'>;
export type ExtractionMethod = Enums<'extraction_method'>;

/**
 * Role hierarchy — a higher number means more authority.
 *
 * NOTE: This only guides the UI (whether to show or hide a control).
 * Real security lives in the DATABASE — RLS policies and role checks inside
 * the RPC functions. Any frontend check can be bypassed.
 */
export const ROLE_RANK: Record<UserRole, number> = {
  ceo: 70,
  gm: 60,
  manager: 50,
  admin: 40,
  dispatcher: 30,
  warehouse: 20,
  driver: 10,
  viewer: 0,
};

export const ROLE_LABEL: Record<UserRole, string> = {
  ceo: 'Superadmin',
  gm: 'General Manager',
  manager: 'Manager',
  admin: 'Admin',
  dispatcher: 'Dispatcher',
  warehouse: 'Warehouse',
  driver: 'Driver',
  viewer: 'Viewer',
};

/** Is `role` one of the allowed roles? */
export function hasRole(role: UserRole | null, ...allowed: UserRole[]): boolean {
  return role !== null && allowed.includes(role);
}

/** Does `role` rank at or above `minimum`? */
export function atLeast(role: UserRole | null, minimum: UserRole): boolean {
  return role !== null && ROLE_RANK[role] >= ROLE_RANK[minimum];
}
