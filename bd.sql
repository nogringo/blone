CREATE TABLE files (
    pubkey TEXT NOT NULL,
    sha256 VARCHAR(64) NOT NULL UNIQUE,
    file_size BIGINT NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE deleted_files (
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

CREATE TRIGGER trg_record_deleted_file
AFTER DELETE ON files
FOR EACH ROW
EXECUTE FUNCTION record_deleted_file();
