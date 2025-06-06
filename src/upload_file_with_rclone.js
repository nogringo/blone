import axios from "axios";
import path from 'path';

export async function uploadFileWithRclone(filePath) {
    const rcloneApiUrl = 'http://localhost:5572/operations/copyfile';
    const auth = {
        username: process.env.RCLONE_USERNAME,
        password: process.env.RCLONE_PASSWORD,
    };

    const fileName = path.basename(filePath);

    const params = {
        srcFs: "/",
        srcRemote: filePath,
        dstFs: `${process.env.RCLONE_REMOTE}:`,
        dstRemote: fileName,
    };

    try {
        const response = await axios.post(rcloneApiUrl, params, { auth });
        console.log('Fichier envoyé avec succès:', response.data);
    } catch (error) {
        console.error('Erreur lors de l\'envoi:', error.response?.data || error.message);
    }
}
