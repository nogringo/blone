import { pool } from "./repository.js";
import fs from 'fs';
import path from 'path';

// Read SQL schema from bd.sql file
const sqlFilePath = path.join(process.cwd(), 'bd.sql');
const setupQueries = fs.readFileSync(sqlFilePath, 'utf8');

// Execute the setup queries with retry logic
export async function setupDatabase(retries = 5, delay = 2000) {
  for (let i = 0; i < retries; i++) {
    try {
      await pool.query(setupQueries);
      console.log('Database setup completed successfully');
      return;
    } catch (error) {
      console.error(`Error setting up database (attempt ${i + 1}/${retries}):`, error.message);
      if (i < retries - 1) {
        console.log(`Retrying in ${delay / 1000} seconds...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  console.error('Failed to setup database after all retries');
}
