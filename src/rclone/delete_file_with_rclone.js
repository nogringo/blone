import axios from "axios";

export async function deleteFileWithRclone(sha256) {
    const rcloneApiUrl = 'http://rclone:5572/operations/deletefile';
    const auth = {
        username: process.env.RCLONE_USERNAME,
        password: process.env.RCLONE_PASSWORD,
    };

    const params = {
        fs: "bucket:",
        remote: sha256,
    };

    try {
        const response = await axios.post(rcloneApiUrl, params, { auth });
        console.log('Fichier envoyé avec succès:', response.data);
    } catch (error) {
        console.error('Erreur lors de l\'envoi:', error.response?.data || error.message);
    }
}
