import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { authenticationMiddleware } from './src/middlewares/authentication_middleware.js';
import path from 'path';
import fs from 'fs';
import { saveUploadedFileMiddleware } from './src/middlewares/save_uploaded_file_middleware.js';
import { uploadFileWithRclone } from './src/rclone/upload_file_with_rclone.js';
import { downloadFileWithRclone } from './src/rclone/download_file_with_rclone.js';
import { maxFileSize, pool } from './src/repository.js';
import { deleteFileWithRclone } from './src/rclone/delete_file_with_rclone.js';
import { setupDatabase } from './src/setup_database.js';
import { randomCustomString } from './src/random_custom_string.js';
import { getFileDoc } from './src/get_file_doc.js';
import { uploadRequirementMiddleware } from './src/middlewares/upload_requirement_middleware.js';
import { requireVerbMiddleware } from './src/middlewares/require_verb_middleware.js';
import { downloadBlobFromUrl } from './src/download_blob_from_url.js';
import { newFileMiddleware } from './src/middlewares/new_file_middleware.js';

await setupDatabase();

const uploadOptions = {
    uploadDir: '/data/upload',
    maxFileSize: maxFileSize,
};

const app = express();

app.use(express.json());

app.use(cors());

app.head('/upload', uploadRequirementMiddleware);

// app.head('/media', uploadRequirementMiddleware);

app.head('/:sha256', async (req, res) => {
    console.log("here")
    const sha256 = req.params.fileName.split('.')[0];

    const query = 'SELECT * FROM files WHERE sha256 = $1';
    const values = [sha256];
    const result = await pool.query(query, values);

    if (result.rows.length == 0) res.status(404);
    else res.status(200);

    res.end();
});

app.get('/list/:pubkey', async (req, res) => {
    const pubkey = req.params.pubkey;

    const query = 'SELECT sha256, file_size, mime_type, EXTRACT(EPOCH FROM created_at)::integer AS uploaded_unix FROM files WHERE pubkey = $1';
    const values = [pubkey];
    const result = await pool.query(query, values);

    const blobsDescriptor = result.rows.map((row) => {
        return {
            "url": `https://${process.env.BLOSSOM_API_DOMAIN}/${row.sha256}`,
            "sha256": row.sha256,
            "size": row.file_size,
            "type": row.mime_type,
            "uploaded": row.uploaded_unix
        };
    });

    res.json(blobsDescriptor);
});

app.get('/:fileName', async (req, res) => {
    const sha256 = req.params.fileName.split('.')[0];

    const doc = await getFileDoc(sha256);
    console.log(doc);
    if (!doc) return res.status(404).end();

    const filePath = path.join(`/data/download/${randomCustomString(16)}`, sha256);
    const rcloneSuccess = await downloadFileWithRclone(sha256, filePath);
    if (!rcloneSuccess) return res.status(404).end();

    res.set('Content-Type', doc["mime_type"]);
    res.sendFile(filePath);

    res.on("finish", () => {
        fs.unlinkSync(filePath);
    });
});

app.delete('/:sha256', authenticationMiddleware, requireVerbMiddleware("delete"), async (req, res) => {
    const sha256 = req.params.sha256;

    if (!req.xTags.includes(req.params.sha256)) {
        return res.status(401).json({ error: 'File hash must be in a x tag' });
    }

    const query = 'DELETE FROM files WHERE sha256 = $1 RETURNING *';
    const values = [sha256];
    await pool.query(query, values);

    await deleteFileWithRclone(sha256);

    res.end();
});

app.put(
    '/upload',
    authenticationMiddleware,
    requireVerbMiddleware("upload"),
    saveUploadedFileMiddleware(uploadOptions),
    newFileMiddleware,
);

app.put(
    '/mirror',
    authenticationMiddleware,
    requireVerbMiddleware("upload"),
    async (req, res, next) => {
        try {
            req.file = await downloadBlobFromUrl(req.body.url, "/data/mirror_download/", maxFileSize);
        } catch (error) {
            return res.status(401).json({ error: `Unable to download` });
        }
        next();
    },
    newFileMiddleware,
);

app.put('/media', (req, res) => {
    // TODO
    console.log("put /media");
});

app.put('/report', (req, res) => {
    // TODO
    console.log("put /report");
});

const port = process.env.BLOSSOM_API_PORT || 3000;
app.listen(port, () => {
    console.log(`Blone listening on port ${port}`);
});
