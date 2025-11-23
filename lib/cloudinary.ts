import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export interface UploadResult {
  publicId: string;
  url: string;
  secureUrl: string;
  format: string;
  bytes: number;
}

/**
 * Upload file to Cloudinary
 */
export async function uploadToCloudinary(
  fileBuffer: Buffer,
  fileName: string,
  folder: string = 'purchase-invoices'
): Promise<UploadResult> {
  return new Promise((resolve, reject) => {
    // Determine resource type based on file extension
    const fileExt = fileName.split('.').pop()?.toLowerCase();
    const isPdf = fileExt === 'pdf';
    
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: isPdf ? 'raw' : 'image',
        public_id: `${Date.now()}_${fileName.replace(/\.[^/.]+$/, '')}`,
        type: 'upload',
        access_mode: 'public',
      },
      (error, result) => {
        if (error) {
          reject(error);
        } else if (result) {
          resolve({
            publicId: result.public_id,
            url: result.url,
            secureUrl: result.secure_url,
            format: result.format,
            bytes: result.bytes,
          });
        }
      }
    );

    uploadStream.end(fileBuffer);
  });
}

/**
 * Delete file from Cloudinary
 */
export async function deleteFromCloudinary(publicId: string): Promise<void> {
  try {
    await cloudinary.uploader.destroy(publicId);
  } catch (error) {
    console.error('Error deleting from Cloudinary:', error);
    throw error;
  }
}

/**
 * Get Cloudinary storage usage
 * Returns usage in bytes and percentage
 */
export async function getCloudinaryUsage(): Promise<{
  usedBytes: number;
  limitBytes: number;
  usedPercentage: number;
  isNearLimit: boolean;
}> {
  try {
    const usage = await cloudinary.api.usage();
    
    // Free tier limits (approximate values)
    const FREE_TIER_LIMIT = 25 * 1024 * 1024 * 1024; // 25 GB in bytes
    const usedBytes = usage.transformations?.usage || 0;
    const limitBytes = usage.transformations?.limit || FREE_TIER_LIMIT;
    const usedPercentage = (usedBytes / limitBytes) * 100;
    const isNearLimit = usedPercentage >= 80;

    return {
      usedBytes,
      limitBytes,
      usedPercentage,
      isNearLimit,
    };
  } catch (error) {
    console.error('Error fetching Cloudinary usage:', error);
    throw error;
  }
}

export { cloudinary };
