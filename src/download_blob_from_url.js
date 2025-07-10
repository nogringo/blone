import https from 'https';
import http from 'http';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

/**
 * Télécharge un fichier à partir d'une URL, le sauvegarde dans un dossier local
 * avec comme nom son hash SHA-256, et retourne des informations si la taille ne dépasse pas la limite.
 * @param {string} fileUrl - L'URL du fichier à télécharger.
 * @param {string} outputDir - Le dossier local où enregistrer le fichier.
 * @param {number} maxSizeInBytes - La taille maximale autorisée en octets.
 * @returns {Promise<{ sha256: string, size: number, mimeType: string }>} - Infos du fichier téléchargé.
 */
export function downloadBlobFromUrl(fileUrl, outputDir, maxSizeInBytes) {
  const protocol = fileUrl.startsWith('https') ? https : http;

  return new Promise((resolve, reject) => {
    let downloadedSize = 0;
    const hash = crypto.createHash('sha256');
    const tempPath = path.join(outputDir, `temp_${Date.now()}`);
    const file = fs.createWriteStream(tempPath);
    let mimeType = '';

    const request = protocol.get(fileUrl, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`Échec du téléchargement. Code HTTP: ${response.statusCode}`));
        return;
      }

      mimeType = response.headers['content-type'] || 'application/octet-stream';

      const contentLength = parseInt(response.headers['content-length'], 10);
      if (!isNaN(contentLength) && contentLength > maxSizeInBytes) {
        reject(new Error('Le fichier dépasse la taille maximale autorisée (selon Content-Length), téléchargement annulé.'));
        response.destroy();
        return;
      }

      response.on('data', (chunk) => {
        downloadedSize += chunk.length;
        hash.update(chunk);

        if (downloadedSize > maxSizeInBytes) {
          request.abort();
          file.destroy();
          fs.unlink(tempPath, () => {
            reject(new Error('Le fichier dépasse la taille maximale autorisée (détecté en temps réel), téléchargement annulé.'));
          });
        }
      });

      response.pipe(file);

      file.on('finish', () => {
        file.close(() => {
          const fileHash = hash.digest('hex');
          const finalPath = path.join(outputDir, fileHash);

          fs.rename(tempPath, finalPath, (err) => {
            if (err) {
              reject(err);
            } else {
              resolve({ sha256: fileHash, size: downloadedSize, mimeType });
            }
          });
        });
      });

      file.on('error', (err) => {
        fs.unlink(tempPath, () => reject(err));
      });
    });

    request.on('error', (err) => {
      reject(err);
    });
  });
}