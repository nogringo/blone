import { Pool } from 'pg';

export const maxFileSize = (process.env.MAX_FILE_SIZE || 10000000) * 1;
export const pool = new Pool({
  host: 'db',
  user: 'postgres',
  password: process.env.DB_PASSWORD,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});
