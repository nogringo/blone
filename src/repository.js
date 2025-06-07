import { Pool } from 'pg';

export const pool = new Pool({
  host: 'db',
  user: 'postgres',
  password: process.env.DB_PASSWORD,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});
