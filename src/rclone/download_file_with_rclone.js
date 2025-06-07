import axios from "axios";
import path from 'path';

export async function downloadFileWithRclone(sha256, filePath) {
    const rcloneApiUrl = 'http://rclone:5572/operations/copyfile';
    const auth = {
        username: process.env.RCLONE_USERNAME,
        password: process.env.RCLONE_PASSWORD,
    };

    const params = {
        srcFs: "bucket:",
        srcRemote: sha256,
        dstFs: "/",
        dstRemote: filePath,
    };

    try {
        const response = await axios.post(rcloneApiUrl, params, { auth });
        return true;
    } catch (error) {
        console.error('Rclone download error', error.response?.data || error.message);
        return false;
    }
}
