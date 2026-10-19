import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { AppError } from '../../shared/errors/app-error';

export interface VehiclePhotoInput {
  url?: string;
  data?: string; // Base64 data URL: data:image/png;base64,...
  caption?: string;
  isPrimary?: boolean;
  order?: number;
}

export interface ProcessedVehiclePhoto {
  url: string;
  caption: string;
  isPrimary: boolean;
  order: number;
}

const ALLOWED_MIME_TYPES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

export class VehicleImageService {
  private static uploadsDir = path.join(process.cwd(), 'uploads', 'vehicles');

  /**
   * Ensures the uploads/vehicles directory exists on disk
   */
  private static ensureUploadsDirExists(): void {
    if (!fs.existsSync(this.uploadsDir)) {
      fs.mkdirSync(this.uploadsDir, { recursive: true });
    }
  }

  /**
   * Processes a single vehicle photo item, saving Base64 buffers to disk
   */
  static async processSinglePhoto(
    photo: VehiclePhotoInput,
    index: number,
    defaultCaption?: string
  ): Promise<ProcessedVehiclePhoto> {
    this.ensureUploadsDirExists();

    let finalUrl = photo.url?.trim() || '';
    const caption = photo.caption?.trim() || defaultCaption || `View ${index + 1}`;

    // 1. If base64 data string is provided, decode and save to secure disk storage
    if (photo.data && photo.data.startsWith('data:image/')) {
      const matches = photo.data.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);
      if (!matches || matches.length !== 3) {
        throw AppError.badRequest(`Invalid base64 image format for photo #${index + 1}`);
      }

      const mimeType = matches[1].toLowerCase();
      const base64Data = matches[2];

      const ext = ALLOWED_MIME_TYPES[mimeType];
      if (!ext) {
        throw AppError.badRequest(
          `Unsupported image format (${mimeType}) for photo #${index + 1}. Supported formats: JPEG, PNG, WEBP.`
        );
      }

      const buffer = Buffer.from(base64Data, 'base64');
      if (buffer.length > MAX_IMAGE_SIZE_BYTES) {
        throw AppError.badRequest(
          `Image #${index + 1} exceeds the 10MB limit (size: ${(buffer.length / (1024 * 1024)).toFixed(1)}MB).`
        );
      }

      // Generate cryptographically unique safe filename
      const fileId = crypto.randomUUID().replace(/-/g, '').slice(0, 16);
      const filename = `vehicle-${Date.now()}-${fileId}.${ext}`;
      const filePath = path.join(this.uploadsDir, filename);

      fs.writeFileSync(filePath, buffer);
      finalUrl = `/uploads/vehicles/${filename}`;
    }

    if (!finalUrl) {
      throw AppError.badRequest(`Photo #${index + 1} must have either a valid URL or base64 image data.`);
    }

    return {
      url: finalUrl,
      caption,
      isPrimary: Boolean(photo.isPrimary),
      order: typeof photo.order === 'number' ? photo.order : index,
    };
  }

  /**
   * Validates and processes fleet vehicle photos strictly enforcing minimum 4 and maximum 6 photos
   */
  static async validateAndProcessPhotos(
    photosInput?: VehiclePhotoInput[]
  ): Promise<ProcessedVehiclePhoto[]> {
    if (!photosInput || !Array.isArray(photosInput) || photosInput.length === 0) {
      throw AppError.badRequest(
        'A minimum of 4 vehicle images is strictly required for fleet onboarding (e.g. Front, Rear, Interior, and Side views).'
      );
    }

    if (photosInput.length < 4) {
      throw AppError.badRequest(
        `Fleet compliance requires minimum 4 photos. Received ${photosInput.length}. Please provide Front, Rear, Interior, and Side views.`
      );
    }

    if (photosInput.length > 6) {
      throw AppError.badRequest(
        `Maximum 6 photos allowed per vehicle. Received ${photosInput.length}.`
      );
    }

    const defaultCaptions = [
      'Front 3/4 Perspective',
      'Rear 3/4 Perspective',
      'Interior Cabin & Dashboard',
      'Trunk & Cargo Storage',
      'Driver Side Profile',
      'Passenger Side Profile',
    ];

    const processedList: ProcessedVehiclePhoto[] = [];

    for (let i = 0; i < photosInput.length; i++) {
      const processed = await this.processSinglePhoto(
        photosInput[i],
        i,
        defaultCaptions[i] || `View ${i + 1}`
      );
      processedList.push(processed);
    }

    // Ensure exactly one photo is marked as primary
    const primaryCount = processedList.filter((p) => p.isPrimary).length;
    if (primaryCount === 0) {
      processedList[0].isPrimary = true;
    } else if (primaryCount > 1) {
      // If multiple are marked primary, keep only the first marked one
      let firstPrimaryFound = false;
      for (const p of processedList) {
        if (p.isPrimary) {
          if (!firstPrimaryFound) {
            firstPrimaryFound = true;
          } else {
            p.isPrimary = false;
          }
        }
      }
    }

    return processedList;
  }
}
