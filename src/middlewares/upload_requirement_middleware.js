export function uploadRequirementMiddleware(req, res) {
    const xContentLength = req.headers['x-content-length'];

    if (!xContentLength) {
        return res.status(411)
            .set('X-Reason', `File too large. Max allowed size is ${process.env.MAX_FILE_SIZE}B.`)
            .send('Length Required');
    }

    if (xContentLength > process.env.MAX_FILE_SIZE) {
        return res.status(413)
            .set('X-Reason', 'File too large. Max allowed size is 100MB.')
            .send('Content Too Large');
    }

    res.send("OK");
}