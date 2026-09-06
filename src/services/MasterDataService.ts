import { BaseService } from './BaseService';
import type { AppUser, Item, RoleFlags, Supplier, Warehouse } from '../models/masterData';
import { toAppError } from '../lib/errors';
import type { Tables } from '../types/database';

/**
 * Master data services.
 *
 * Each class supplies only a relation name and a `toModel()` mapper; everything
 * else is inherited from BaseService. This is the D3 inheritance pattern.
 */

class SupplierServiceImpl extends BaseService<Tables<'suppliers'>, Supplier> {
  constructor() {
    super('suppliers', 'Supplier');
  }

  protected toModel(row: Tables<'suppliers'>): Supplier {
    return {
      id: row.id,
      createdAt: row.created_at,
      isActive: row.is_active,
      code: row.code,
      nameEn: row.name_en,
      nameAr: row.name_ar,
      crNumber: row.cr_number,
      vatNumber: row.vat_number,
      address: row.address,
      phone: row.phone,
    };
  }

  /** Look up a supplier by its code, e.g. `ELKHAYYAT`. */
  async findByCode(code: string): Promise<Supplier | null> {
    const matches = await this.findWhere('code', code);
    return matches[0] ?? null;
  }
}

class ItemServiceImpl extends BaseService<Tables<'items'>, Item> {
  constructor() {
    super('items', 'Item');
  }

  protected toModel(row: Tables<'items'>): Item {
    return {
      id: row.id,
      createdAt: row.created_at,
      isActive: row.is_active,
      itemNumber: row.item_number,
      descriptionEn: row.description_en,
      descriptionAr: row.description_ar,
      uom: row.uom,
      unitWeightKg: row.unit_weight_kg,
    };
  }

  /** Look up an item by its item number — required by PDF extraction. */
  async findByItemNumber(itemNumber: string): Promise<Item | null> {
    const matches = await this.findWhere('item_number', itemNumber);
    return matches[0] ?? null;
  }
}

class WarehouseServiceImpl extends BaseService<Tables<'warehouses'>, Warehouse> {
  constructor() {
    super('warehouses', 'Warehouse');
  }

  protected toModel(row: Tables<'warehouses'>): Warehouse {
    return {
      id: row.id,
      createdAt: row.created_at,
      isActive: row.is_active,
      code: row.code,
      name: row.name,
      nameAr: row.name_ar,
    };
  }

  /** Look up a warehouse by its code, e.g. `MAIN`. */
  async findByCode(code: string): Promise<Warehouse | null> {
    const matches = await this.findWhere('code', code);
    return matches[0] ?? null;
  }
}

class UserServiceImpl extends BaseService<Tables<'user_tbl'>, AppUser> {
  constructor() {
    super('user_tbl', 'User');
  }

  protected toModel(row: Tables<'user_tbl'>): AppUser {
    return {
      id: row.id,
      createdAt: row.account_created_at,
      isActive: row.is_active,
      firstName: row.first_name ?? '',
      lastName: row.last_name ?? '',
      email: row.email ?? '',
      isSuperadmin: row.is_superadmin,
      isGm: row.is_gm,
      isAdmin: row.is_admin,
      isDriver: row.is_driver,
      isWarehouse: row.is_warehouse,
      role: row.role,
      phone: row.phone,
    };
  }

  /** Create a user with a password and one role. Superadmin or GM only. */
  async create(input: {
    email: string;
    password: string;
    firstName: string;
    lastName?: string;
    flags?: RoleFlags;
  }): Promise<string> {
    const { data, error } = await this.db.rpc('create_app_user', {
      p_email: input.email,
      p_password: input.password,
      p_first_name: input.firstName,
      p_last_name: input.lastName ?? '',
      p_is_superadmin: input.flags?.isSuperadmin ?? false,
      p_is_gm: input.flags?.isGm ?? false,
      p_is_admin: input.flags?.isAdmin ?? false,
      p_is_driver: input.flags?.isDriver ?? false,
      p_is_warehouse: input.flags?.isWarehouse ?? false,
    });

    if (error) throw toAppError(error, 'Creating user');
    return data as string;
  }

  /** Change a password. Also revokes the user's existing sessions. */
  async setPassword(email: string, password: string): Promise<void> {
    const { error } = await this.db.rpc('set_user_password', {
      p_email: email,
      p_password: password,
    });

    if (error) throw toAppError(error, 'Changing password');
  }

  /** Change a user's role. Passing no flags demotes them to viewer. */
  async setFlags(userId: string, flags: RoleFlags): Promise<AppUser> {
    const { data, error } = await this.db.rpc('set_user_flags', {
      p_user_id: userId,
      p_is_superadmin: flags.isSuperadmin ?? false,
      p_is_gm: flags.isGm ?? false,
      p_is_admin: flags.isAdmin ?? false,
      p_is_driver: flags.isDriver ?? false,
      p_is_warehouse: flags.isWarehouse ?? false,
    });

    if (error) throw toAppError(error, 'Changing user role');
    return this.toModel(data as Tables<'user_tbl'>);
  }

  /** Deactivate a user without deleting the record. */
  async setActive(userId: string, isActive: boolean): Promise<void> {
    const { error } = await this.db.from('user_tbl').update({ is_active: isActive }).eq('id', userId);

    if (error) throw toAppError(error, 'Updating user status');
  }
}

export const supplierService = new SupplierServiceImpl();
export const itemService = new ItemServiceImpl();
export const warehouseService = new WarehouseServiceImpl();
export const userService = new UserServiceImpl();
