CREATE TABLE IF NOT EXISTS users (
    pubkey TEXT PRIMARY KEY,
    bytes_stored BIGINT DEFAULT 0,
    max_bytes_stored BIGINT DEFAULT 0,
    bytes_due BIGINT DEFAULT 0,
    last_storage_update TIMESTAMP CURRENT_TIMESTAMP,
    credit BIGINT DEFAULT 0
);

CREATE TABLE IF NOT EXISTS files (
    pubkey TEXT NOT NULL,
    sha256 VARCHAR(64) NOT NULL UNIQUE,
    file_size BIGINT NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (pubkey) REFERENCES users(pubkey)
);

CREATE OR REPLACE FUNCTION update_user_on_file_change()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        -- Create user if doesn't exist, update bytes_stored and timestamp
        INSERT INTO users (pubkey, bytes_stored, max_bytes_stored, last_storage_update)
        VALUES (NEW.pubkey, NEW.file_size, NEW.file_size, CURRENT_TIMESTAMP)
        ON CONFLICT (pubkey) 
        DO UPDATE SET 
            bytes_due = users.bytes_due + users.bytes_stored * EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - users.last_storage_update)),
            bytes_stored = users.bytes_stored + NEW.file_size,
            max_bytes_stored = GREATEST(users.max_bytes_stored, users.bytes_stored + NEW.file_size),
            last_storage_update = CURRENT_TIMESTAMP;
        
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        -- Update user: bill for time elapsed, then update storage
        UPDATE users 
        SET bytes_due = bytes_due + bytes_stored * EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - last_storage_update)),
            bytes_stored = bytes_stored - OLD.file_size,
            last_storage_update = CURRENT_TIMESTAMP
        WHERE pubkey = OLD.pubkey;
        
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_user_on_file_change ON files;
CREATE TRIGGER trg_update_user_on_file_change
AFTER INSERT OR DELETE ON files
FOR EACH ROW
EXECUTE FUNCTION update_user_on_file_change();

-- Function to update bytes_due for all users (run daily)
CREATE OR REPLACE FUNCTION update_daily_billing()
RETURNS void AS $$
BEGIN
    UPDATE users 
    SET bytes_due = bytes_due + bytes_stored * EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - last_storage_update)),
        last_storage_update = CURRENT_TIMESTAMP
    WHERE bytes_stored > 0;
END;
$$ LANGUAGE plpgsql;

-- Enable pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule daily billing at midnight
SELECT cron.schedule('daily-billing', '0 0 * * *', 'SELECT update_daily_billing();');
