import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { logger } from '../utils/logger';
import fs from 'fs';
import path from 'path';

const endpoint = process.env.AWS_ENDPOINT_URL_S3 || 'https://br-curly-violet-b5w5qhyf.storage.c-7.us-east-2.aws.neon.tech';
const accessKeyId = process.env.AWS_ACCESS_KEY_ID || 'nak_live_8733d60e45b443189bbf9d7f89b3933a';
const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY || 'nsk_live_c3db6ce14c9a83923666d8808bf082bea5c235e2db9527b99eee7d6b03ba226e';
const region = process.env.AWS_REGION || 'us-east-2';
const bucket = process.env.AWS_S3_BUCKET || 'medilink-reports';

export class S3StorageAdapter {
  private client: S3Client;

  constructor() {
    this.client = new S3Client({
      endpoint,
      region,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
      forcePathStyle: true,
    });
  }

  async uploadFile(
    fileBuffer: Buffer,
    fileName: string,
    mimeType: string
  ): Promise<{ fileKey: string; fileUrl: string }> {
    const fileKey = `reports/${Date.now()}-${path.basename(fileName)}`;

    try {
      const command = new PutObjectCommand({
        Bucket: bucket,
        Key: fileKey,
        Body: fileBuffer,
        ContentType: mimeType,
      });

      await this.client.send(command);
      const fileUrl = `${endpoint}/${bucket}/${fileKey}`;
      logger.info(`File uploaded to Neon S3 Storage: ${fileKey}`);
      return { fileKey, fileUrl };
    } catch (error) {
      logger.warn(`Neon S3 upload failed, using local resilient storage fallback:`, error);
      // Resilient local fallback
      const uploadDir = path.join(process.cwd(), 'uploads');
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      const localPath = path.join(uploadDir, `${Date.now()}-${fileName}`);
      fs.writeFileSync(localPath, fileBuffer);
      return {
        fileKey: path.basename(localPath),
        fileUrl: `/uploads/${path.basename(localPath)}`,
      };
    }
  }

  async getFileUrl(fileKey: string): Promise<string> {
    if (fileKey.startsWith('http://') || fileKey.startsWith('https://')) {
      return fileKey;
    }
    return `${endpoint}/${bucket}/${fileKey}`;
  }
}

export const s3Storage = new S3StorageAdapter();
