import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import stream from 'stream';

// Configuration
const DEFAULT_OPTIONS = {
  uploadDir: 'uploads',
  maxFileSize: 10737418240, // 10GB
  chunkSize: 1024 * 1024 * 10, // 10MB
  filename: (req, file) => {
    const ext = path.extname(file.originalname) || '';
    return `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${ext}`;
  },
  preserveOriginalName: false
};

class HashTransformStream extends stream.Transform {
  constructor() {
    super();
    this.hash = crypto.createHash('sha256');
    this.bytesProcessed = 0;
  }

  _transform(chunk, encoding, callback) {
    this.hash.update(chunk);
    this.bytesProcessed += chunk.length;
    this.push(chunk);
    callback();
  }

  _flush(callback) {
    this.sha256 = this.hash.digest('hex');
    callback();
  }
}

export const saveUploadedFileMiddleware = (options = {}) => {
  const config = { ...DEFAULT_OPTIONS, ...options };

  // Créer le répertoire d'upload s'il n'existe pas
  if (!fs.existsSync(config.uploadDir)) {
    fs.mkdirSync(config.uploadDir, { recursive: true });
  }

  return async (req, res, next) => {
    let tempFilePath; // Déclaré ici pour être accessible dans le catch

    try {
      // Vérifier la taille du fichier (seule restriction conservée)
      const contentLength = parseInt(req.headers['content-length']);
      if (isNaN(contentLength)) {
        return res.status(411).json({ error: 'Content-Length header is required' });
      }

      if (contentLength > config.maxFileSize) {
        return res.status(413).json({ 
          error: `File size exceeds maximum limit of ${config.maxFileSize} bytes`,
          maxSize: config.maxFileSize
        });
      }

      // Préparer les streams
      const hashStream = new HashTransformStream();
      const tempFileName = `temp-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
      tempFilePath = path.join(config.uploadDir, tempFileName);
      const fileWriteStream = fs.createWriteStream(tempFilePath);

      // Pipeline: Requête → Calcul hash → Écriture temporaire
      req.pipe(hashStream).pipe(fileWriteStream);

      // Attendre la fin de l'upload
      await new Promise((resolve, reject) => {
        fileWriteStream.on('finish', resolve);
        fileWriteStream.on('error', reject);
        req.on('error', reject);
      });

      // Obtenir le hash final
      const sha256 = hashStream.sha256;
      
      // Déterminer le nom final du fichier
      const finalFilename = config.preserveOriginalName 
        ? req.headers['x-file-name'] || 'uploaded_file'
        : sha256 + (path.extname(req.headers['x-file-name'] || '') || '');

      const finalFilePath = path.join(config.uploadDir, finalFilename);

      // Renommer le fichier temporaire
      fs.renameSync(tempFilePath, finalFilePath);

      // Ajouter les métadonnées du fichier à la requête
      req.file = {
        originalName: req.headers['x-file-name'],
        filename: finalFilename,
        path: finalFilePath,
        size: contentLength,
        mimetype: req.headers['content-type'] || 'application/octet-stream',
        sha256,
        url: `/uploads/${finalFilename}`
      };

      next();
    } catch (error) {
      console.error('File upload error:', error);
      
      // Nettoyer les fichiers temporaires en cas d'erreur
      if (tempFilePath && fs.existsSync(tempFilePath)) {
        fs.unlinkSync(tempFilePath);
      }
      
      res.status(500).json({ 
        error: 'File upload failed',
        details: error.message
      });
    }
  };
};