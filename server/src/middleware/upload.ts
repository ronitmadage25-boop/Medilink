import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { AppError } from '../utils/AppError';

const TEMP_DIR = path.join(__dirname, '../../uploads/tmp');
fs.mkdirSync(TEMP_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, TEMP_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${uuidv4()}${ext}`);
  },
});

const fileFilter = (
  _req: Express.Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  const allowed = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new AppError('Only PDF and image files (JPEG, PNG, WebP) are allowed.', 400));
  }
};

export const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB
});

export const validateFileMagicBytes = (
  buffer: Buffer,
  declaredMimeType: string
): { isValid: boolean; error?: string } => {
  if (!buffer || buffer.length < 4) {
    return { isValid: false, error: 'File is empty or corrupted.' };
  }

  // PDF signature: starts with %PDF- (hex: 25 50 44 46 2d)
  if (declaredMimeType === 'application/pdf') {
    const header = buffer.subarray(0, 5).toString('ascii');
    if (!header.startsWith('%PDF-')) {
      return {
        isValid: false,
        error: 'Invalid file signature: The file is not a legitimate PDF document. Renaming another file to .pdf is not permitted.',
      };
    }
    return { isValid: true };
  }

  // PNG signature: 89 50 4e 47 0d 0a 1a 0a
  if (declaredMimeType === 'image/png') {
    if (
      buffer[0] === 0x89 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x4e &&
      buffer[3] === 0x47
    ) {
      return { isValid: true };
    }
    return { isValid: false, error: 'Invalid PNG image content.' };
  }

  // JPEG signature: ff d8 ff
  if (declaredMimeType === 'image/jpeg') {
    if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
      return { isValid: true };
    }
    return { isValid: false, error: 'Invalid JPEG image content.' };
  }

  // WebP signature: RIFF....WEBP
  if (declaredMimeType === 'image/webp') {
    const riff = buffer.subarray(0, 4).toString('ascii');
    const webp = buffer.subarray(8, 12).toString('ascii');
    if (riff === 'RIFF' && webp === 'WEBP') {
      return { isValid: true };
    }
    return { isValid: false, error: 'Invalid WebP image content.' };
  }

  return { isValid: true };
};
