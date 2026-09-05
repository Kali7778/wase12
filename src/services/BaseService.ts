import { supabase, type TypedSupabaseClient } from '../lib/supabase';
import { NotFoundError, toAppError } from '../lib/errors';
import type { BaseRecord } from '../models/base';
import type { Database } from '../types/database';

type PublicSchema = Database['public'];
type TableName = keyof PublicSchema['Tables'];
type ViewName = keyof PublicSchema['Views'];

/** Anything readable — a table or a view. */
export type ReadableName = TableName | ViewName;

export interface ListOptions {
  limit?: number;
  offset?: number;
  orderBy?: { column: string; ascending?: boolean };
}

/**
 * Foundation for every service.
 *
 * An abstract class with generics and inheritance is exactly right here — this
 * is plain TypeScript, not a React component, so hooks are not a concern.
 * (CLAUDE.md / D3: inheritance in types and services, composition in components.)
 *
 * A concrete service only supplies two things:
 *   1. the relation name (table or view)
 *   2. `toModel()` — maps a database row (snake_case) to a domain model (camelCase)
 *
 * Everything else — CRUD, error handling, paging — lives here once. DRY.
 */
export abstract class BaseService<TRow, TModel extends BaseRecord> {
  protected readonly db: TypedSupabaseClient = supabase;

  protected constructor(
    protected readonly relation: ReadableName,
    /** Human-readable name used in error messages, e.g. "Delivery Note". */
    protected readonly label: string,
  ) {}

  /** Maps a database row to a domain model. Each service defines its own. */
  protected abstract toModel(row: TRow): TModel;

  /**
   * Query builder entry point.
   *
   * supabase-js declares SEPARATE overloads of `.from()` for tables and views,
   * and a union of the two matches neither. This is therefore the ONE cast in
   * the entire data layer. Type safety returns at `toModel(row: TRow)`, where
   * each service declares its own row type.
   */
  protected from() {
    return this.db.from(this.relation as TableName);
  }

  /** Fetch one record by id. Returns `null` when it does not exist. */
  async findById(id: string): Promise<TModel | null> {
    const { data, error } = await this.from().select('*').eq('id', id).maybeSingle();

    if (error) throw toAppError(error, `Loading ${this.label}`);
    return data ? this.toModel(data as TRow) : null;
  }

  /** Fetch one record by id. Throws when it does not exist. */
  async getById(id: string): Promise<TModel> {
    const found = await this.findById(id);
    if (!found) throw new NotFoundError(this.label);
    return found;
  }

  /** Fetch all records the current user is allowed to see. */
  async list(options: ListOptions = {}): Promise<TModel[]> {
    let query = this.from().select('*');

    if (options.orderBy) {
      query = query.order(options.orderBy.column, {
        ascending: options.orderBy.ascending ?? true,
      });
    }
    if (options.limit !== undefined) {
      const from = options.offset ?? 0;
      query = query.range(from, from + options.limit - 1);
    }

    const { data, error } = await query;
    if (error) throw toAppError(error, `Loading ${this.label} list`);
    return (data ?? []).map((row) => this.toModel(row as TRow));
  }

  /** Number of records visible under the current user's RLS policies. */
  async count(): Promise<number> {
    const { count, error } = await this.from().select('*', { count: 'exact', head: true });

    if (error) throw toAppError(error, `Counting ${this.label}`);
    return count ?? 0;
  }

  /**
   * Records matching a single column value — for small lookups.
   *
   * Uses `.filter()` rather than `.eq()`: `.eq()` resolves the column name
   * against every relation in the schema union, which overflows the type
   * checker. `.filter()` takes a plain string and is the intended escape hatch
   * for a dynamic column name.
   */
  protected async findWhere(column: string, value: string): Promise<TModel[]> {
    const { data, error } = await this.from().select('*').filter(column, 'eq', value);

    if (error) throw toAppError(error, `Searching ${this.label}`);
    return (data ?? []).map((row) => this.toModel(row as TRow));
  }
}
