export interface QueryRunner {
  get<T = any>(sql: string, params?: any[]): Promise<T | undefined>;
  all<T = any>(sql: string, params?: any[]): Promise<T[]>;
  run(sql: string, params?: any[]): Promise<{ id: any; changes: any }>;
}

export const query: QueryRunner;

declare const db: any;
export default db;
