import { pool } from "./repository.js";

// SQL statements to check if tables exist and create them if not
const setupQueries = `
CREATE TABLE IF NOT EXISTS files (
    pubkey TEXT NOT NULL,
    sha256 VARCHAR(64) NOT NULL UNIQUE,
    file_size BIGINT NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS deleted_files (
    id SERIAL PRIMARY KEY,
    pubkey TEXT NOT NULL,
    file_size BIGINT NOT NULL,
    created_at TIMESTAMP NOT NULL,
    deleted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE OR REPLACE FUNCTION record_deleted_file()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO deleted_files (pubkey, file_size, created_at)
    VALUES (OLD.pubkey, OLD.file_size, OLD.created_at);
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_record_deleted_file ON files;
CREATE TRIGGER trg_record_deleted_file
AFTER DELETE ON files
FOR EACH ROW
EXECUTE FUNCTION record_deleted_file();

`;

// Execute the setup queries
export async function setupDatabase() {
  try {
    await pool.query(setupQueries);
    console.log('Database setup completed successfully');
  } catch (error) {
    console.error('Error setting up database:', error);
  }
}
