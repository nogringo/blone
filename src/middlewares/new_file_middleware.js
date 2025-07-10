import { getFileDoc } from "../get_file_doc.js";

export async function newFileMiddleware(req, res) {
    if (!req.xTags.includes(req.file.sha256)) {
        return res.status(401).json({ error: 'File hash must be in a x tag' });
    }

    const file = await getFileDoc(req.file.sha256);

    const filePath = req.file.path;
    if (!file) await uploadFileWithRclone(filePath);
    fs.unlinkSync(filePath);

    res.json({
        "url": `https://${process.env.BLOSSOM_API_DOMAIN}/${req.file.filename}`,
        "sha256": req.file.sha256,
        "size": req.file.size,
        "type": req.file.mimetype,
        "uploaded": Math.floor(Date.now() / 1000),
    });

    if (file) return;

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
}