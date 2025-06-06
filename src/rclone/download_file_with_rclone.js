import axios from "axios";
import path from 'path';

export async function downloadFileWithRclone(sha256, filePath) {
    const rcloneApiUrl = 'http://localhost:5572/operations/copyfile';
    const auth = {
        username: process.env.RCLONE_USERNAME,
        password: process.env.RCLONE_PASSWORD,
    };

    const params = {
        srcFs: `${process.env.RCLONE_REMOTE}:`,
        srcRemote: sha256,
        dstFs: "/",
        dstRemote: filePath,
    };

    try {
        const response = await axios.post(rcloneApiUrl, params, { auth });
        console.log('Fichier envoyé avec succès:', response.data);
    } catch (error) {
        console.error('Erreur lors de l\'envoi:', error.response?.data || error.message);
    }
}
