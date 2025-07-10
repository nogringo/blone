import { pool } from "./repository.js";
import fs from 'fs';
import path from 'path';

// Read SQL schema from bd.sql file
const sqlFilePath = path.join(process.cwd(), 'bd.sql');
const setupQueries = fs.readFileSync(sqlFilePath, 'utf8');

// Execute the setup queries
export async function setupDatabase() {
  try {
    await pool.query(setupQueries);
    console.log('Database setup completed successfully');
  } catch (error) {
    console.error('Error setting up database:', error);
  }
}
