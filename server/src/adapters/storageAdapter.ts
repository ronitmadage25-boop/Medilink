import { config } from '../config/env';
import { logger } from '../utils/logger';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';

const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
];

export const storageAdapter = {
  async store(file: Express.Multer.File): Promise<string> {
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      throw new Error(`File type ${file.mimetype} is not allowed.`);
    }

    if (config.fileStorageProvider === 'cloudinary') {
      const { v2: cloudinary } = await import('cloudinary');
      cloudinary.config({
        cloud_name: config.cloudinaryCloudName,
        api_key: config.cloudinaryApiKey,
        api_secret: config.cloudinaryApiSecret,
      });

      const result = await cloudinary.uploader.upload(file.path, {
        folder: 'medilink/reports',
        resource_type: 'auto',
        access_mode: 'authenticated',
      });

      // Clean up temp file after cloudinary upload
      if (fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
      }

      return result.public_id;
    }

    // Local storage (development only)
    const uploadDir = path.join(__dirname, '../../..', config.localUploadDir, 'reports');
    fs.mkdirSync(uploadDir, { recursive: true });

    const ext = path.extname(file.originalname).toLowerCase();
    const filename = `${uuidv4()}${ext}`;
    const dest = path.join(uploadDir, filename);

    fs.renameSync(file.path, dest);

    logger.warn('Using local file storage. Configure Cloudinary for production.');
    return `reports/${filename}`;
  },

  async getUrl(fileKey: string, provider: 'local' | 'cloudinary'): Promise<string> {
    if (provider === 'cloudinary') {
      const { v2: cloudinary } = await import('cloudinary');
      cloudinary.config({
        cloud_name: config.cloudinaryCloudName,
        api_key: config.cloudinaryApiKey,
        api_secret: config.cloudinaryApiSecret,
      });
      return cloudinary.url(fileKey, { secure: true, sign_url: true, type: 'authenticated' });
    }

    return `${config.serverUrl}/uploads/${fileKey}`;
  },

  async delete(fileKey: string, provider: 'local' | 'cloudinary'): Promise<void> {
    if (provider === 'cloudinary') {
      const { v2: cloudinary } = await import('cloudinary');
      await cloudinary.uploader.destroy(fileKey);
      return;
    }

    const filePath = path.join(__dirname, '../../..', config.localUploadDir, fileKey);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  },
};
