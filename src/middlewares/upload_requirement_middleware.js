import { maxFileSize } from "../repository.js";

export function uploadRequirementMiddleware(req, res) {
    const xContentLength = req.headers['x-content-length'];

    if (!xContentLength) {
        return res.status(411)
            .set('X-Reason', "Missing X-Content-Length header.")
            .send('Length Required');
    }

    if (xContentLength > maxFileSize) {
        return res.status(413)
            .set('X-Reason', `File too large. Max allowed size is ${maxFileSize}B.`)
            .send('Content Too Large');
    }

    res.send("OK");
}