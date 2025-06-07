import axios from "axios";
import path from 'path';

export async function uploadFileWithRclone(filePath) {
    const rcloneApiUrl = 'http://rclone:5572/operations/copyfile';
    const auth = {
        username: process.env.RCLONE_USERNAME,
        password: process.env.RCLONE_PASSWORD,
    };

    const fileName = path.basename(filePath);

    const params = {
        srcFs: "/",
        srcRemote: filePath,
        dstFs: "bucket:",
        dstRemote: fileName,
    };

    try {
        const response = await axios.post(rcloneApiUrl, params, { auth });
        return true;
    } catch (error) {
        console.error('Rclone upload error', error.response?.data || error.message);
        return false;
    }
}
