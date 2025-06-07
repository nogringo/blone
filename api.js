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

await setupDatabase();

const app = express();

const uploadOptions = {
    uploadDir: '/data/upload',
    maxFileSize: maxFileSize,
};

app.use(cors());

app.head('/upload', uploadRequirementMiddleware);

app.head('/media', uploadRequirementMiddleware);

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

app.put('/upload', authenticationMiddleware, saveUploadedFileMiddleware(uploadOptions), async (req, res) => {
    const blobDescriptor = {
        "url": `https://${process.env.BLOSSOM_API_DOMAIN}/${req.file.filename}`,
        "sha256": req.file.sha256,
        "size": req.file.size,
        "type": req.file.mimetype,
        "uploaded": Math.floor(Date.now() / 1000),
    }

    const file = await getFileDoc(req.file.sha256);
    if (file) return res.json(blobDescriptor);

    const requiredVerb = "upload";
    const isValideVerb = req.verb == requiredVerb;
    if (!isValideVerb) {
        return res.status(401).json({ error: `Event t tag must be ${requiredVerb}` });
    }

    if (!req.xTags.includes(req.file.sha256)) {
        return res.status(401).json({ error: 'File hash must be in a x tag' });
    }

    const filePath = req.file.path;
    console.log(req.file.path)
    console.log(fs.readdirSync("/data/upload"))
    await uploadFileWithRclone(filePath);
    fs.unlinkSync(filePath);

    res.json(blobDescriptor);

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

app.put('/mirror', (req, res) => {
    // TODO
    console.log("put /mirror");
});

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
