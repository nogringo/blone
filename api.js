import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { authenticationMiddleware } from './src/authentication_middleware.js';
import path from 'path';
import fs from 'fs';
import { saveUploadedFileMiddleware } from './src/rclone/save_uploaded_file_middleware.js';
import { uploadFileWithRclone } from './src/upload_file_with_rclone.js';
import { fileURLToPath } from 'url';
import { downloadFileWithRclone } from './src/rclone/download_file_with_rclone.js';
import { pool } from './src/repository.js';

const app = express();

const uploadOptions = {
    uploadDir: 'bucket/upload',
    maxFileSize: 1024 * 1024 * 1024 * 1,
};

app.use(cors());

app.get('/:fileName', async (req, res) => {
    const sha256 = req.params.fileName.split('.')[0];

    const query = 'SELECT * FROM files WHERE sha256 = $1';
    const values = [sha256];
    const result = await pool.query(query, values);
    if (result.rows.length == 0) {
        return res.status(404).send("Sorry we can't find that");
    }
    const doc = result.rows[0];

    const __filename = fileURLToPath(import.meta.url);
    const filePath = path.join(path.dirname(__filename), "bucket/download", sha256);
    await downloadFileWithRclone(sha256, filePath);

    res.set('Content-Type', doc["mime_type"]);
    res.sendFile(filePath);

    res.on("finish", () => {
        fs.unlinkSync(filePath);
    });
});

app.head('/:sha256', async (req, res) => {
    const sha256 = req.params.fileName.split('.')[0];

    const query = 'SELECT * FROM files WHERE sha256 = $1';
    const values = [sha256];
    const result = await pool.query(query, values);

    if (result.rows.length == 0) res.status(404);
    else res.status(200);

    res.end();
});

app.put('/upload', authenticationMiddleware, saveUploadedFileMiddleware(uploadOptions), async (req, res) => {
    const requiredVerb = "upload";
    const isValideVerb = req.verb == requiredVerb;
    if (!isValideVerb) {
        return res.status(401).json({ error: `Event t tag must be ${requiredVerb}` });
    }

    if (!req.xTags.includes(req.file.sha256)) {
        return res.status(401).json({ error: 'File hash must be in a x tag' });
    }

    const __filename = fileURLToPath(import.meta.url);
    const filePath = path.join(path.dirname(__filename), req.file.path);
    await uploadFileWithRclone(filePath);
    fs.unlinkSync(filePath);

    res.json({
        "url": `https://${process.env.BLOSSOM_API_DOMAIN}/${req.file.filename}`,
        "sha256": req.file.sha256,
        "size": req.file.size,
        "type": req.file.mimetype,
        "uploaded": Math.floor(Date.now() / 1000),
    });

    const query = `
      INSERT INTO files (pubkey, sha256, file_size, mime_type)
      VALUES ($1, $2, $3, $4)
      RETURNING *;
    `;
    const values = [
        req.pubkey,
        req.file.sha256,
        req.file.size,
        req.file.mimetype,
    ];
    await pool.query(query, values);
});

app.head('/upload', (req, res) => {
    // TODO
    console.log("head /upload")
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

app.delete('/:sha256', authenticationMiddleware, async (req, res) => {
    const sha256 = req.params.sha256;

    const requiredVerb = "delete";
    const isValideVerb = req.verb == requiredVerb;
    if (!isValideVerb) {
        return res.status(401).json({ error: `Event t tag must be ${requiredVerb}` });
    }

    if (!req.xTags.includes(req.params.sha256)) {
        return res.status(401).json({ error: 'File hash must be in a x tag' });
    }

    const query = 'DELETE FROM files WHERE sha256 = $1 RETURNING *';
    const values = [sha256];
    await pool.query(query, values);

    await deleteFileWithRclone(sha256);

    res.end();
});

app.put('/mirror', (req, res) => {
    console.log("put /mirror")

    // TODO
    res.send('Hello World!');
});

app.head('/media', (req, res) => {
    console.log("head /media")

    // TODO
    res.send('Hello World!');
});

app.put('/media', (req, res) => {
    console.log("put /media")

    // TODO
    res.send('Hello World!');
});

app.put('/report', (req, res) => {
    console.log("put /report")

    // TODO
    res.send('Hello World!');
});

const port = process.env.BLOSSOM_API_PORT || 3000;
app.listen(port, () => {
    console.log(`Example app listening on port ${port}`);
});
