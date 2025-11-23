export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { getCloudinaryUsage } from '@/lib/cloudinary';

export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    // Get Cloudinary usage
    const usage = await getCloudinaryUsage();

    // Format bytes to human readable
    const formatBytes = (bytes: number): string => {
      if (bytes === 0) return '0 Bytes';
      const k = 1024;
      const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return `${Math.round((bytes / Math.pow(k, i)) * 100) / 100} ${sizes[i]}`;
    };

    return NextResponse.json(
      {
        usedBytes: usage.usedBytes,
        limitBytes: usage.limitBytes,
        usedFormatted: formatBytes(usage.usedBytes),
        limitFormatted: formatBytes(usage.limitBytes),
        usedPercentage: Math.round(usage.usedPercentage * 100) / 100,
        isNearLimit: usage.isNearLimit,
        warning: usage.isNearLimit
          ? 'Storage usage is at or above 80%. Consider upgrading your plan.'
          : null,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Storage usage error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch storage usage' },
      { status: 500 }
    );
  }
}
