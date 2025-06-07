import { pool } from "./repository.js";

export async function getFileDoc(sha256) {
    const query = 'SELECT * FROM files WHERE sha256 = $1';
    const values = [sha256];
    const result = await pool.query(query, values);
    return result.rows[0];
}