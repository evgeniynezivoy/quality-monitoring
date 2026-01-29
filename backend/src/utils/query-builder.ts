import { JwtPayload } from '../types/index.js';
import { buildRoleWhereClause } from '../middleware/roles.js';

type ParamValue = string | number | boolean | null | Date;

interface BuildResult {
  clause: string;
  params: ParamValue[];
}

export class QueryBuilder {
  private conditions: string[] = [];
  private params: ParamValue[] = [];
  private paramIndex: number = 1;

  constructor(startIndex: number = 1) {
    this.paramIndex = startIndex;
  }

  /**
   * Add a condition with a single parameter
   */
  addCondition(column: string, operator: string, value: ParamValue): this {
    if (value !== undefined && value !== null && value !== '') {
      this.conditions.push(`${column} ${operator} $${this.paramIndex}`);
      this.params.push(value);
      this.paramIndex++;
    }
    return this;
  }

  /**
   * Add an equality condition
   */
  addEquals(column: string, value: ParamValue): this {
    return this.addCondition(column, '=', value);
  }

  /**
   * Add a greater than or equal condition
   */
  addGte(column: string, value: ParamValue): this {
    return this.addCondition(column, '>=', value);
  }

  /**
   * Add a less than or equal condition
   */
  addLte(column: string, value: ParamValue): this {
    return this.addCondition(column, '<=', value);
  }

  /**
   * Add a date range filter
   */
  addDateRange(column: string, from?: string, to?: string): this {
    if (from) {
      this.addGte(column, from);
    }
    if (to) {
      this.addLte(column, to);
    }
    return this;
  }

  /**
   * Add an ILIKE search condition across multiple columns
   */
  addSearch(columns: string[], searchTerm?: string): this {
    if (searchTerm && searchTerm.trim()) {
      const likeConditions = columns.map(col => `${col} ILIKE $${this.paramIndex}`);
      this.conditions.push(`(${likeConditions.join(' OR ')})`);
      this.params.push(`%${searchTerm}%`);
      this.paramIndex++;
    }
    return this;
  }

  /**
   * Add role-based filter using the buildRoleWhereClause function
   */
  addRoleFilter(
    user: JwtPayload,
    ccColumn: string = 'i.responsible_cc_id',
    userTableAlias: string = 'u'
  ): this {
    const roleFilter = buildRoleWhereClause(user, ccColumn, userTableAlias);

    if (roleFilter.clause !== '1=1') {
      // Adjust parameter placeholders to account for existing params
      let adjustedClause = roleFilter.clause;
      roleFilter.params.forEach((param, index) => {
        const oldPlaceholder = `$${index + 1}`;
        const newPlaceholder = `$${this.paramIndex}`;
        adjustedClause = adjustedClause.replace(new RegExp(`\\${oldPlaceholder}`, 'g'), newPlaceholder);
        this.params.push(param);
        this.paramIndex++;
      });
      this.conditions.push(adjustedClause);
    }

    return this;
  }

  /**
   * Add a raw condition without parameters
   */
  addRawCondition(condition: string): this {
    if (condition && condition.trim()) {
      this.conditions.push(condition);
    }
    return this;
  }

  /**
   * Add a raw condition with a parameter
   */
  addRawWithParam(condition: string, value: ParamValue): this {
    if (condition && value !== undefined && value !== null) {
      const conditionWithPlaceholder = condition.replace('?', `$${this.paramIndex}`);
      this.conditions.push(conditionWithPlaceholder);
      this.params.push(value);
      this.paramIndex++;
    }
    return this;
  }

  /**
   * Get the current parameter index (useful for adding more params after build)
   */
  getNextParamIndex(): number {
    return this.paramIndex;
  }

  /**
   * Build the WHERE clause and parameters
   */
  build(): BuildResult {
    if (this.conditions.length === 0) {
      return { clause: '1=1', params: [] };
    }

    return {
      clause: this.conditions.join(' AND '),
      params: [...this.params],
    };
  }

  /**
   * Build with role filter pre-applied (convenience method)
   */
  static withRoleFilter(
    user: JwtPayload,
    ccColumn?: string,
    userTableAlias?: string
  ): QueryBuilder {
    const builder = new QueryBuilder();
    builder.addRoleFilter(user, ccColumn, userTableAlias);
    return builder;
  }
}

/**
 * Helper to add pagination params
 */
export function addPaginationParams(
  params: ParamValue[],
  page: number = 1,
  limit: number = 50
): { params: ParamValue[]; limitIndex: number; offsetIndex: number } {
  const offset = (page - 1) * limit;
  const newParams = [...params, limit, offset];
  return {
    params: newParams,
    limitIndex: params.length + 1,
    offsetIndex: params.length + 2,
  };
}
