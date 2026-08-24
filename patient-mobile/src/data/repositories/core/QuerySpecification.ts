/**
 * Generic Specification Pattern for Repository Queries.
 * Avoids writing custom SQL in repositories.
 */
export class QuerySpecification {
  public filters: Record<string, any> = {};
  public sorts: Record<string, 'ASC' | 'DESC'> = {};
  public limitVal?: number;
  public offsetVal?: number;
  public cursorObj?: { field: string; value: any; operator: '>' | '<' | '>=' | '<=' };
  public includesDeleted: boolean = false;

  static create(): QuerySpecification {
    return new QuerySpecification();
  }

  where(field: string, value: any): this {
    this.filters[field] = value;
    return this;
  }

  orderBy(field: string, direction: 'ASC' | 'DESC' = 'ASC'): this {
    this.sorts[field] = direction;
    return this;
  }

  limit(count: number): this {
    this.limitVal = count;
    return this;
  }

  offset(count: number): this {
    this.offsetVal = count;
    return this;
  }

  /**
   * Cursor-based pagination is more performant than offset for large datasets.
   * e.g., after('created_at', 1620000000, '>')
   */
  cursor(field: string, value: any, operator: '>' | '<' | '>=' | '<=' = '>'): this {
    this.cursorObj = { field, value, operator };
    return this;
  }

  withDeleted(): this {
    this.includesDeleted = true;
    return this;
  }
}
